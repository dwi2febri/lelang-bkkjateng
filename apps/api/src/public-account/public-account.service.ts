import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response } from "express";
import nodemailer from "nodemailer";
import { Database } from "../database/database.service";

const derive = promisify(scrypt);
const COOKIE = "bkk_public_session";
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const normalize = (email: string) => email.trim().toLowerCase();
const tokenFrom = (req: Request) => {
  const raw = req.headers.cookie?.split(";").map(x => x.trim()).find(x => x.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1);
  return raw && /^[a-f0-9]{64}$/.test(raw) ? raw : null;
};
async function hash(value: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${((await derive(value, salt, 64)) as Buffer).toString("hex")}`;
}
async function matches(value: string, stored: string) {
  const [salt, expected] = stored.split(":");
  if (!/^[a-f0-9]{32}$/.test(salt || "") || !/^[a-f0-9]{128}$/.test(expected || "")) return false;
  return timingSafeEqual((await derive(value, salt, 64)) as Buffer, Buffer.from(expected, "hex"));
}
type PublicUser = { id: number; name: string; email: string; phone: string };

@Injectable()
export class PublicAccountService {
  private attempts = new Map<string, { count: number; until: number }>();
  constructor(private readonly db: Database) {}
  checkMutation(req: Request) {
    const origins = (process.env.APP_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000").split(",").map(x => x.trim());
    if (req.headers["x-requested-with"] !== "BKKPublic" || (req.headers.origin && !origins.includes(req.headers.origin)))
      throw new ForbiddenException("Sumber permintaan tidak diizinkan.");
  }
  private limit(key: string, maximum = 10) {
    const now = Date.now();
    const current = this.attempts.get(key);
    const next = current && current.until > now ? current : { count: 0, until: now + 15 * 60_000 };
    if (next.count >= maximum) throw new HttpException("Terlalu banyak percobaan. Coba lagi dalam 15 menit.", 429);
    next.count++;
    this.attempts.set(key, next);
  }
  private cookie(res: Response, token: string, maxAge: number) {
    res.cookie(COOKIE, token, { httpOnly: true, sameSite: "strict", secure: process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production", path: "/", maxAge });
  }
  async sendCode(emailInput: string, req: Request) {
    this.checkMutation(req);
    this.limit(`email:${req.ip || "local"}`, 8);
    const email = normalize(emailInput);
    const [existing] = await this.db.query("SELECT id FROM public_users WHERE email=?", [email]);
    // Keep the response indistinguishable for already registered addresses.
    if (existing) return { message: "Jika alamat dapat didaftarkan, kode verifikasi telah dikirim." };
    await this.deliverCode(email, "pendaftaran");
    return { message: "Jika alamat dapat didaftarkan, kode verifikasi telah dikirim." };
  }
  private async deliverCode(email: string, purpose: string) {
    const [recent] = await this.db.query("SELECT sent_at FROM public_email_codes WHERE email=? AND sent_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 60 SECOND)", [email]);
    if (recent) return;
    const password = process.env.SMTP_PASSWORD;
    const host = process.env.SMTP_HOST;
    const sender = process.env.SMTP_FROM;
    const username = process.env.SMTP_USER;
    if (!host || !username || !password || !sender) throw new ServiceUnavailableException("Layanan email belum dikonfigurasi.");
    const code = String(randomInt(0, 100_000_000)).padStart(8, "0");
    const codeHash = await hash(code);
    await this.db.execute("INSERT INTO public_email_codes(email,code_hash,expires_at,attempts,sent_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 10 MINUTE),0,UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE code_hash=VALUES(code_hash),expires_at=VALUES(expires_at),attempts=0,sent_at=VALUES(sent_at)", [email, codeHash]);
    const port = Number(process.env.SMTP_PORT || 465);
    const transport = nodemailer.createTransport({ host, port, secure: port === 465, requireTLS: port !== 465, auth: { user: username, pass: password }, connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 10_000 });
    try {
      const delivered = await transport.sendMail({ from: sender, to: email, subject: "Kode verifikasi akun BKK Jateng", text: `Kode verifikasi ${purpose} BKK Jateng: ${code}\nBerlaku 10 menit. Abaikan email ini jika Anda tidak memintanya.`, html: `<p>Kode verifikasi ${purpose} BKK Jateng:</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p><p>Berlaku 10 menit. Abaikan jika Anda tidak memintanya.</p>` });
      if (!delivered.accepted.some(address => normalize(address) === email)) throw new Error("SMTP recipient rejected");
    } catch {
      await this.db.execute("DELETE FROM public_email_codes WHERE email=? AND code_hash=?", [email, codeHash]);
      throw new ServiceUnavailableException("Kode belum dapat dikirim. Coba lagi nanti.");
    } finally {
      transport.close();
    }
  }
  private async verifiedCode(email: string, code: string) {
    const [record] = await this.db.query("SELECT code_hash,attempts FROM public_email_codes WHERE email=? AND expires_at > UTC_TIMESTAMP()", [email]);
    if (!record || record.attempts >= 5) throw new BadRequestException("Kode tidak valid atau kedaluwarsa.");
    await this.db.execute("UPDATE public_email_codes SET attempts=attempts+1 WHERE email=?", [email]);
    if (!(await matches(code, record.code_hash))) throw new BadRequestException("Kode tidak valid atau kedaluwarsa.");
  }
  async preview(emailInput: string, code: string, req: Request) {
    this.checkMutation(req);
    this.limit(`verify:${req.ip || "local"}`, 15);
    const email = normalize(emailInput);
    await this.verifiedCode(email, code);
    const [latest] = await this.db.query("SELECT name,phone FROM interests WHERE LOWER(email)=? AND source='public' ORDER BY created_at DESC,id DESC LIMIT 1", [email]);
    return { name: latest?.name || "", phone: latest?.phone || "" };
  }
  private async session(user: PublicUser, res: Response) {
    const token = randomBytes(32).toString("hex");
    await this.db.execute("INSERT INTO public_sessions(token_hash,user_id,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 30 DAY))", [digest(token), user.id]);
    this.cookie(res, token, 30 * 24 * 60 * 60_000);
    return user;
  }
  async register(input: { name: string; email: string; phone: string; code: string; password: string; confirmation: string }, req: Request, res: Response) {
    this.checkMutation(req);
    this.limit(`register:${req.ip || "local"}`, 10);
    if (input.password !== input.confirmation) throw new BadRequestException("Konfirmasi kata sandi tidak sama.");
    const email = normalize(input.email);
    await this.verifiedCode(email, input.code);
    const passwordHash = await hash(input.password);
    const connection = await this.db.pool.getConnection();
    let user: PublicUser;
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute("SELECT id FROM public_users WHERE email=?", [email]);
      if ((rows as unknown[]).length) throw new ConflictException("Alamat email sudah terdaftar. Silakan masuk.");
      const [insert] = await connection.execute("INSERT INTO public_users(name,email,phone,password_hash) VALUES(?,?,?,?)", [input.name.trim(), email, input.phone, passwordHash]);
      const id = (insert as { insertId: number }).insertId;
      await connection.execute("UPDATE interests SET public_user_id=? WHERE public_user_id IS NULL AND LOWER(email)=? AND source='public'", [id, email]);
      await connection.execute("DELETE FROM public_email_codes WHERE email=?", [email]);
      await connection.commit();
      user = { id, name: input.name.trim(), email, phone: input.phone };
    } catch (error) {
      await connection.rollback();
      if (error instanceof ConflictException || (error as { code?: string }).code === "ER_DUP_ENTRY") throw new ConflictException("Alamat email sudah terdaftar. Silakan masuk.");
      throw error;
    } finally { connection.release(); }
    return this.session(user, res);
  }
  async login(emailInput: string, password: string, req: Request, res: Response) {
    this.checkMutation(req);
    this.limit(`login:${req.ip || "local"}`, 10);
    const [row] = await this.db.query("SELECT id,name,email,phone,password_hash FROM public_users WHERE email=?", [normalize(emailInput)]);
    const fallback = "0".repeat(32) + ":" + "0".repeat(128);
    if (!(await matches(password, row?.password_hash || fallback)) || !row) throw new UnauthorizedException("Email atau kata sandi tidak sesuai.");
    this.attempts.delete(`login:${req.ip || "local"}`);
    return this.session({ id: row.id, name: row.name, email: row.email, phone: row.phone }, res);
  }
  async maybeUser(req: Request): Promise<PublicUser | null> {
    const token = tokenFrom(req);
    if (!token) return null;
    const [user] = await this.db.query("SELECT u.id,u.name,u.email,u.phone FROM public_sessions s JOIN public_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at > UTC_TIMESTAMP()", [digest(token)]);
    return user ? { id: user.id, name: user.name, email: user.email, phone: user.phone } : null;
  }
  async user(req: Request) {
    const user = await this.maybeUser(req);
    if (!user) throw new UnauthorizedException("Silakan masuk terlebih dahulu.");
    return user;
  }
  async logout(req: Request, res: Response) {
    this.checkMutation(req);
    const token = tokenFrom(req);
    if (token) await this.db.execute("DELETE FROM public_sessions WHERE token_hash=?", [digest(token)]);
    this.cookie(res, "", 0);
    return { message: "Berhasil keluar." };
  }
  async history(req: Request) {
    const user = await this.user(req);
    const rows = await this.db.query("SELECT i.id,a.slug,a.code assetCode,a.title assetTitle,i.created_at sentAt,i.status FROM interests i JOIN assets a ON a.id=i.asset_id WHERE i.public_user_id=? ORDER BY i.created_at DESC,i.id DESC LIMIT 200", [user.id]);
    if (!rows.length) return rows;
    const changes = await this.db.query("SELECT h.id,h.interest_id interestId,h.status,h.created_at changedAt FROM interest_history h JOIN interests i ON i.id=h.interest_id WHERE i.public_user_id=? ORDER BY h.id ASC LIMIT 5000", [user.id]);
    const byInterest = new Map<number, typeof changes>();
    for (const change of changes) {
      const list = byInterest.get(change.interestId) || [];
      list.push(change);
      byInterest.set(change.interestId, list);
    }
    return rows.map(row => ({ ...row, statusHistory: byInterest.get(row.id) || [] }));
  }
  async favorites(req: Request) {
    const user = await this.user(req);
    const rows = await this.db.query("SELECT f.asset_id id FROM public_favorites f JOIN assets a ON a.id=f.asset_id AND a.archived=0 WHERE f.user_id=?", [user.id]);
    return rows.map(row => row.id as number);
  }
  async syncFavorites(req: Request, ids: number[]) {
    this.checkMutation(req);
    const user = await this.user(req);
    for (const id of [...new Set(ids)]) await this.db.execute("INSERT IGNORE INTO public_favorites(user_id,asset_id) SELECT ?,id FROM assets WHERE id=? AND archived=0", [user.id, id]);
    return this.favorites(req);
  }
  async setFavorite(req: Request, id: number, favorite: boolean) {
    this.checkMutation(req);
    const user = await this.user(req);
    if (favorite) await this.db.execute("INSERT IGNORE INTO public_favorites(user_id,asset_id) SELECT ?,id FROM assets WHERE id=? AND archived=0", [user.id, id]);
    else await this.db.execute("DELETE FROM public_favorites WHERE user_id=? AND asset_id=?", [user.id, id]);
    return this.favorites(req);
  }
}

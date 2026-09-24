import {
  ForbiddenException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response } from "express";
import { Database } from "../database/database.service";
const derive = promisify(scrypt);
export const COOKIE = "bkk_admin_session";
export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: "admin";
};
export type AuthRequest = Request & { admin?: AdminUser };
export function tokenFrom(req: Request) {
  const raw = req.headers.cookie
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(COOKIE + "="))
    ?.slice(COOKIE.length + 1);
  return raw && /^[a-f0-9]{64}$/.test(raw) ? raw : null;
}
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
@Injectable()
export class AuthService {
  private attempts = new Map<string, { count: number; until: number }>();
  constructor(private readonly db: Database) {}
  checkMutation(req: Request) {
    const allowed = (
      process.env.APP_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000"
    )
      .split(",")
      .map((x) => x.trim());
    if (
      req.headers["x-requested-with"] !== "BKKAdmin" ||
      (req.headers.origin && !allowed.includes(req.headers.origin))
    )
      throw new ForbiddenException("Sumber permintaan tidak diizinkan.");
  }
  private cookie(res: Response, value: string, maxAge: number) {
    res.cookie(COOKIE, value, {
      httpOnly: true,
      sameSite: "strict",
      secure:
        process.env.COOKIE_SECURE === "true" ||
        process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    });
  }
  async login(email: string, password: string, req: Request, res: Response) {
    this.checkMutation(req);
    const now = Date.now();
    for (const [key, item] of this.attempts)
      if (item.until <= now) this.attempts.delete(key);
    const ip = req.ip || "local";
    const attempt = this.attempts.get(ip) || {
      count: 0,
      until: now + 15 * 60 * 1000,
    };
    if (attempt.count >= 10)
      throw new HttpException(
        "Terlalu banyak percobaan. Coba kembali dalam 15 menit.",
        429,
      );
    attempt.count++;
    this.attempts.set(ip, attempt);
    const [user] = await this.db.query(
      "SELECT id,name,email,role,password_hash FROM admin_users WHERE email = ? AND active = 1",
      [email.trim().toLowerCase()],
    );
    const [salt, stored] = (
      user?.password_hash ||
      "00000000000000000000000000000000:" + "0".repeat(128)
    ).split(":");
    const key = (await derive(password, salt, 64)) as Buffer;
    const valid = timingSafeEqual(key, Buffer.from(stored, "hex"));
    if (!user || !valid)
      throw new UnauthorizedException("Email atau kata sandi tidak sesuai.");
    this.attempts.delete(ip);
    const old = tokenFrom(req);
    if (old)
      await this.db.execute("DELETE FROM admin_sessions WHERE token_hash = ?", [
        digest(old),
      ]);
    await this.db.execute(
      "DELETE FROM admin_sessions WHERE expires_at <= UTC_TIMESTAMP()",
    );
    const token = randomBytes(32).toString("hex");
    await this.db.execute(
      "INSERT INTO admin_sessions (token_hash,user_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR))",
      [digest(token), user.id],
    );
    this.cookie(res, token, 8 * 60 * 60 * 1000);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    } as AdminUser;
  }
  async user(req: Request): Promise<AdminUser> {
    const token = tokenFrom(req);
    if (!token)
      throw new UnauthorizedException("Silakan masuk terlebih dahulu.");
    const [user] = await this.db.query(
      "SELECT u.id,u.name,u.email,u.role FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP() AND u.active = 1",
      [digest(token)],
    );
    if (!user || user.role !== "admin")
      throw new UnauthorizedException("Sesi berakhir. Silakan masuk kembali.");
    return user as AdminUser;
  }
  async logout(req: Request, res: Response) {
    this.checkMutation(req);
    const token = tokenFrom(req);
    if (token)
      await this.db.execute("DELETE FROM admin_sessions WHERE token_hash = ?", [
        digest(token),
      ]);
    this.cookie(res, "", 0);
    return { message: "Berhasil keluar." };
  }
}

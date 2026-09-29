import { BadRequestException, Body, Controller, ForbiddenException, Get, HttpCode, NotFoundException, Param, ParseIntPipe, Post, Query, Req, UseGuards } from "@nestjs/common";
import { IsInt, IsString, Length, Max, Min } from "class-validator";
import type { Request } from "express";
import { AdminGuard } from "./auth/auth.guard";
import type { AuthRequest } from "./auth/auth.service";
import { Database } from "./database/database.service";
import { PublicAccountService } from "./public-account/public-account.service";

class MessageDto { @IsString() @Length(1, 2000) body!: string; }
class ReadDto { @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER) through!: number; }

@Controller("api")
export class InterestChatController {
  constructor(private readonly db: Database, private readonly account: PublicAccountService) {}

  private cursor(value?: string) {
    if (value === undefined) return 0;
    if (!/^\d{1,15}$/.test(value) || !Number.isSafeInteger(Number(value))) throw new BadRequestException("Penanda pesan tidak valid.");
    return Number(value);
  }
  private async interest(id: number, userId?: number) {
    const [interest] = await this.db.query(
      `SELECT id,status,public_user_id FROM interests WHERE id=? ${userId === undefined ? "" : "AND public_user_id=?"}`,
      userId === undefined ? [id] : [id, userId],
    );
    if (!interest) throw new NotFoundException("Pengajuan tidak ditemukan.");
    if (!interest.public_user_id) throw new ForbiddenException("Pemohon perlu mendaftar dan masuk untuk menggunakan chat.");
    return interest;
  }
  private async list(id: number, after?: string, userId?: number) {
    const interest = await this.interest(id, userId);
    const messages = await this.db.query("SELECT id,sender_role senderRole,body,created_at createdAt FROM interest_messages WHERE interest_id=? AND id>? ORDER BY id ASC LIMIT 200", [id, this.cursor(after)]);
    return { status: interest.status, messages };
  }
  private async send(id: number, body: string, role: "admin" | "public", actorId: number, userId?: number) {
    const message = body.trim();
    if (!message || message.length > 2000) throw new BadRequestException("Pesan wajib diisi dan maksimal 2.000 karakter.");
    const connection = await this.db.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute<import("mysql2").RowDataPacket[]>(
        `SELECT id,status,public_user_id FROM interests WHERE id=? ${userId === undefined ? "" : "AND public_user_id=?"} FOR UPDATE`,
        userId === undefined ? [id] : [id, userId],
      );
      const interest = rows[0];
      if (!interest) throw new NotFoundException("Pengajuan tidak ditemukan.");
      if (!interest.public_user_id) throw new ForbiddenException("Pemohon perlu mendaftar dan masuk untuk menggunakan chat.");
      if (interest.status !== "diproses") throw new ForbiddenException("Chat hanya tersedia saat pengajuan diproses.");
      const [recent] = await connection.execute<import("mysql2").RowDataPacket[]>(
        "SELECT id FROM interest_messages WHERE interest_id=? AND sender_role=? AND COALESCE(admin_id,public_user_id)=? AND created_at > DATE_SUB(NOW(3),INTERVAL 1 SECOND) ORDER BY id DESC LIMIT 1",
        [id, role, actorId],
      );
      if (recent.length) throw new BadRequestException("Tunggu sebentar sebelum mengirim pesan berikutnya.");
      const [result] = await connection.execute<import("mysql2").ResultSetHeader>(
        "INSERT INTO interest_messages(interest_id,sender_role,admin_id,public_user_id,body) VALUES(?,?,?,?,?)",
        [id, role, role === "admin" ? actorId : null, role === "public" ? actorId : null, message],
      );
      await connection.commit();
      const [saved] = await this.db.query("SELECT id,sender_role senderRole,body,created_at createdAt FROM interest_messages WHERE id=?", [result.insertId]);
      return saved;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
  }

  @Get("admin/pengajuan/:id/messages") @UseGuards(AdminGuard)
  adminMessages(@Param("id", ParseIntPipe) id: number, @Query("after") after?: string) { return this.list(id, after); }

  @Post("admin/pengajuan/:id/messages") @UseGuards(AdminGuard) @HttpCode(201)
  adminSend(@Param("id", ParseIntPipe) id: number, @Body() input: MessageDto, @Req() req: AuthRequest) {
    return this.send(id, input.body, "admin", req.admin!.id);
  }

  @Get("public-account/history/:id/messages")
  async publicMessages(@Param("id", ParseIntPipe) id: number, @Query("after") after: string | undefined, @Req() req: Request) {
    const user = await this.account.user(req);
    return this.list(id, after, user.id);
  }

  @Post("public-account/history/:id/messages") @HttpCode(201)
  async publicSend(@Param("id", ParseIntPipe) id: number, @Body() input: MessageDto, @Req() req: Request) {
    this.account.checkMutation(req);
    const user = await this.account.user(req);
    return this.send(id, input.body, "public", user.id, user.id);
  }

  @Post("public-account/history/:id/messages/read") @HttpCode(200)
  async publicRead(@Param("id", ParseIntPipe) id: number, @Body() input: ReadDto, @Req() req: Request) {
    this.account.checkMutation(req);
    const user = await this.account.user(req);
    await this.interest(id, user.id);
    const [latest] = await this.db.query("SELECT MAX(id) messageId FROM interest_messages WHERE interest_id=? AND sender_role='admin' AND id<=?", [id, input.through]);
    const through = Number(latest?.messageId || 0);
    if (through) await this.db.execute("INSERT INTO interest_chat_reads(interest_id,public_user_id,last_read_message_id) VALUES(?,?,?) ON DUPLICATE KEY UPDATE last_read_message_id=GREATEST(last_read_message_id,VALUES(last_read_message_id))", [id, user.id, through]);
    return { readThrough: through };
  }
}

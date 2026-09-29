import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";
import { Transform, Type } from "class-transformer";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import type { RowDataPacket } from "mysql2/promise";
import { Database } from "../database/database.service";
import { AdminGuard } from "../auth/auth.guard";
import type { AuthRequest } from "../auth/auth.service";
import { PublicAccountService } from "../public-account/public-account.service";

class UserQuery {
  @IsIn(["internal", "external"]) type: string = "internal";
  @IsOptional() @IsString() @Length(0, 100) q = "";
  @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
}
class InternalProfile {
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value) @IsString() @Length(2, 80) name!: string;
  @Transform(({ value }) => typeof value === "string" ? value.trim().toLowerCase() : value) @IsEmail() @Length(5, 150) email!: string;
  @IsOptional() @IsString() @Length(12, 128) password?: string;
}
class CreateInternal extends InternalProfile {
  @IsString() @Length(12, 128) password = "";
}
class ActiveDto { @IsBoolean() active!: boolean; }
const derive = promisify(scrypt);
async function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${((await derive(password, salt, 64)) as Buffer).toString("hex")}`;
}

@Controller("api/admin/users")
@UseGuards(AdminGuard)
export class UsersController {
  constructor(private readonly db: Database, private readonly account: PublicAccountService) {}
  @Get() async list(@Query() query: UserQuery) {
    const internal = query.type === "internal";
    const table = internal ? "admin_users" : "public_users";
    const where = " WHERE (u.name LIKE ? OR u.email LIKE ?)";
    const values = [`%${query.q}%`, `%${query.q}%`];
    const [count] = await this.db.query(`SELECT COUNT(*) total FROM ${table} u${where}`, values);
    const data = await this.db.query(`SELECT u.id,u.name,u.email,u.active,u.created_at,${internal ? "u.role" : "u.phone,(SELECT COUNT(*) FROM interests i WHERE i.public_user_id=u.id) submissionCount"} FROM ${table} u${where} ORDER BY u.id DESC LIMIT 20 OFFSET ${(query.page - 1) * 20}`, values);
    return { data, total: count.total };
  }
  @Post("internal") async create(@Body() body: CreateInternal) {
    if (!body.password) throw new BadRequestException("Kata sandi wajib diisi.");
    try {
      const result = await this.db.execute("INSERT INTO admin_users(name,email,password_hash) VALUES(?,?,?)", [body.name, body.email, await passwordHash(body.password)]);
      return { id: result.insertId };
    } catch (error) {
      if (error instanceof ConflictException) throw new ConflictException("Email sudah digunakan oleh user internal lain.");
      throw error;
    }
  }
  @Patch("internal/:id") async updateInternal(@Param("id", ParseIntPipe) id: number, @Body() body: InternalProfile) {
    const hash = body.password ? await passwordHash(body.password) : null;
    const connection = await this.db.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute<RowDataPacket[]>("SELECT id,email FROM admin_users WHERE id=? FOR UPDATE", [id]);
      if (!rows.length) throw new NotFoundException("User tidak ditemukan.");
      await connection.execute("UPDATE admin_users SET name=?,email=?,password_hash=COALESCE(?,password_hash) WHERE id=?", [body.name, body.email, hash, id]);
      if (hash || rows[0].email !== body.email) await connection.execute("DELETE FROM admin_sessions WHERE user_id=?", [id]);
      await connection.commit();
      return { message: "User internal diperbarui." };
    } catch (error) {
      await connection.rollback();
      if ((error as { code?: string }).code === "ER_DUP_ENTRY") throw new ConflictException("Email sudah digunakan oleh user internal lain.");
      throw error;
    } finally { connection.release(); }
  }
  @Post("external/:id/reset-password") async resetExternalPassword(@Param("id", ParseIntPipe) id: number) {
    return this.account.issuePasswordReset(id);
  }
  @Patch(":type/:id/active") async setActive(@Param("type") type: string, @Param("id", ParseIntPipe) id: number, @Body() body: ActiveDto, @Req() req: AuthRequest) {
    if (!["internal", "external"].includes(type)) throw new BadRequestException("Jenis user tidak sesuai.");
    const internal = type === "internal";
    if (internal && id === req.admin!.id && !body.active) throw new BadRequestException("Akun yang sedang digunakan tidak dapat dinonaktifkan.");
    const table = internal ? "admin_users" : "public_users";
    const connection = await this.db.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute<RowDataPacket[]>(internal ? "SELECT id,active FROM admin_users ORDER BY id FOR UPDATE" : "SELECT id,active FROM public_users WHERE id=? FOR UPDATE", internal ? [] : [id]);
      if (!rows.some(row => row.id === id)) throw new NotFoundException("User tidak ditemukan.");
      if (internal && !body.active && !rows.some(row => row.id !== id && row.active)) throw new BadRequestException("Harus ada minimal satu user internal aktif.");
      await connection.execute(`UPDATE ${table} SET active=? WHERE id=?`, [body.active, id]);
      if (!body.active) await connection.execute(`DELETE FROM ${internal ? "admin_sessions" : "public_sessions"} WHERE user_id=?`, [id]);
      await connection.commit();
      return { message: body.active ? "User diaktifkan." : "User dinonaktifkan." };
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }
}

import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "../auth/auth.guard";
import { AuthRequest } from "../auth/auth.service";
import { Database } from "../database/database.service";
import {
  ArchiveDto,
  AssetDto,
  CreateInterestDto,
  ListDto,
  StatusDto,
} from "./admin.dto";
const fields = [
  "slug",
  "code",
  "title",
  "category",
  "saleMethod",
  "province",
  "city",
  "address",
  "price",
  "oldPrice",
  "land",
  "building",
  "bedrooms",
  "image",
  "auctionDate",
  "certificate",
  "description",
  "featured",
] as const;
@Controller("api/admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly db: Database) {}
  @Get("dashboard") async dashboard() {
    const [assets] = await this.db.query(
      "SELECT COUNT(*) total, COALESCE(SUM(archived = 0),0) active, COALESCE(SUM(archived = 0 AND auctionDate >= NOW()),0) upcoming FROM assets",
    );
    const [interests] = await this.db.query(
      "SELECT COUNT(*) total, COALESCE(SUM(status = 'baru'),0) pending, COALESCE(SUM(status = 'diproses'),0) processing, COALESCE(SUM(status = 'selesai'),0) completed FROM interests",
    );
    const recent = await this.db.query(
      "SELECT i.id,i.name,i.status,i.created_at,a.title asset_title FROM interests i JOIN assets a ON a.id = i.asset_id ORDER BY i.created_at DESC,i.id DESC LIMIT 5",
    );
    return { assets, interests, recent };
  }
  @Get("assets") async assets() {
    return {
      data: await this.db.query("SELECT * FROM assets ORDER BY id DESC"),
    };
  }
  @Get("assets/:id") async asset(@Param("id", ParseIntPipe) id: number) {
    const [row] = await this.db.query("SELECT * FROM assets WHERE id = ?", [
      id,
    ]);
    if (!row) throw new NotFoundException("Aset tidak ditemukan.");
    return row;
  }
  private async checkCategory(name: string) {
    const rows = await this.db.query("SELECT name FROM asset_categories WHERE name=?", [name]);
    if (!rows.length) throw new BadRequestException("Pilih kategori yang terdaftar di Master Kategori.");
  }
  private values(body: AssetDto) {
    if (body.oldPrice && body.oldPrice < body.price)
      throw new BadRequestException(
        "Harga sebelumnya harus sama atau lebih besar dari harga limit.",
      );
    return fields.map((key) =>
      key === "auctionDate"
        ? new Date(new Date(body.auctionDate).getTime() + 7 * 3600000)
            .toISOString()
            .slice(0, 19)
            .replace("T", " ")
        : (body[key] ?? null),
    );
  }
  @Post("assets") async create(@Body() body: AssetDto) {
    await this.checkCategory(body.category);
    const result = await this.db.execute(
      `INSERT INTO assets (${fields.join(",")}) VALUES (${fields.map(() => "?").join(",")})`,
      this.values(body),
    );
    return this.asset(result.insertId);
  }
  @Put("assets/:id") async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: AssetDto,
  ) {
    const existing = await this.asset(id);
    body.province ??= existing.province;
    await this.checkCategory(body.category);
    await this.db.execute(
      `UPDATE assets SET ${fields.map((key) => key + " = ?").join(",")} WHERE id = ?`,
      [...this.values(body), id],
    );
    return this.asset(id);
  }
  @Patch("assets/:id/archive") async archive(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ArchiveDto,
  ) {
    await this.asset(id);
    await this.db.execute("UPDATE assets SET archived = ? WHERE id = ?", [
      body.archived,
      id,
    ]);
    return this.asset(id);
  }
  @Get("pengajuan") async interests(@Query() query: ListDto) {
    const where: string[] = [];
    const values: (string | number)[] = [];
    if (query.q) {
      where.push(
        "(i.name LIKE ? OR i.email LIKE ? OR a.title LIKE ? OR a.code LIKE ?)",
      );
      values.push(...Array(4).fill(`%${query.q}%`));
    }
    if (query.status) {
      where.push("i.status = ?");
      values.push(query.status);
    }
    const clause = where.length ? " WHERE " + where.join(" AND ") : "";
    const [count] = await this.db.query(
      "SELECT COUNT(*) total FROM interests i JOIN assets a ON a.id = i.asset_id" +
        clause,
      values,
    );
    const data = await this.db.query(
      "SELECT i.*,a.title asset_title,a.code asset_code FROM interests i JOIN assets a ON a.id = i.asset_id" +
        clause +
        " ORDER BY i.created_at DESC,i.id DESC LIMIT 20 OFFSET " +
        (query.page - 1) * 20,
      values,
    );
    return { data, total: count.total, page: query.page, pageSize: 20 };
  }
  @Get("pengajuan/:id") async interest(@Param("id", ParseIntPipe) id: number) {
    const [row] = await this.db.query(
      "SELECT i.*,a.title asset_title,a.code asset_code,a.price,a.city,a.slug FROM interests i JOIN assets a ON a.id = i.asset_id WHERE i.id = ?",
      [id],
    );
    if (!row) throw new NotFoundException("Pengajuan tidak ditemukan.");
    const history = await this.db.query(
      "SELECT h.id,h.status,h.notes,h.created_at,u.name admin_name FROM interest_history h JOIN admin_users u ON u.id=h.admin_id WHERE h.interest_id = ? ORDER BY h.id DESC",
      [id],
    );
    return { ...row, history };
  }
  @Post("pengajuan") async createInterest(
    @Body() body: CreateInterestDto,
    @Req() req: AuthRequest,
  ) {
    const asset = await this.asset(body.assetId);
    if (asset.archived) throw new BadRequestException("Aset sudah diarsipkan.");
    const result = await this.db.execute(
      "INSERT INTO interests (asset_id,name,email,phone,message,consent,source,created_by) VALUES (?,?,?,?,?,0,'admin',?)",
      [
        body.assetId,
        body.name,
        body.email,
        body.phone,
        body.message,
        req.admin!.id,
      ],
    );
    return this.interest(result.insertId);
  }
  @Patch("pengajuan/:id/status") async status(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: StatusDto,
    @Req() req: AuthRequest,
  ) {
    if (body.status === "ditolak" && !body.notes.trim())
      throw new BadRequestException("Alasan penolakan wajib diisi.");
    const connection = await this.db.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute<
        import("mysql2").ResultSetHeader
      >(
        "UPDATE interests SET status=?,admin_notes=?,version=version+1 WHERE id=? AND version=?",
        [body.status, body.notes, id, body.version],
      );
      if (result.affectedRows !== 1)
        throw new ConflictException(
          "Data telah berubah atau tidak ditemukan. Muat ulang sebelum menyimpan.",
        );
      await connection.execute(
        "INSERT INTO interest_history (interest_id,admin_id,status,notes) VALUES (?,?,?,?)",
        [id, req.admin!.id, body.status, body.notes],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return this.interest(id);
  }
}

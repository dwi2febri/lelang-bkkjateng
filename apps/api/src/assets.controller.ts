import { Database } from "./database/database.service";
import {getCategorySettings} from "./category-settings";
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  HttpCode,
  BadRequestException,
} from "@nestjs/common";
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  Equals,
  IsDateString,
  IsUUID,
} from "class-validator";
import { Req } from "@nestjs/common";
import type { Request } from "express";
import { PublicAccountService } from "./public-account/public-account.service";
import { Type } from "class-transformer";

class SearchDto {
  @IsOptional() @IsString() @Length(0, 100) q?: string;
  @IsOptional()
  @IsString() @Length(1,30)
  category?: string;
  @IsOptional() @IsString() @Length(0, 60) city?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000000000)
  maxPrice?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000000000)
  minPrice?: number;
  @IsOptional() @IsIn(["Jual Beli", "Lelang", "Cessie"]) saleMethod?: string;
  @IsOptional() @IsIn(["featured", "discount"]) tag?: string;
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  dateFrom?: string;
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  dateTo?: string;
  @IsOptional()
  @IsIn(["recommended", "lowest", "highest", "soonest"])
  sort?: string;
  @IsOptional() @IsIn(["true"]) featured?: string;
  @IsOptional() @IsIn(["upcoming", "past", "all"]) period?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page: number = 1;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize: number = 200;
}
class InterestDto {
  @IsString() @Length(2, 80) name!: string;
  @IsEmail() @Length(5, 150) email!: string;
  @IsString() @Matches(/^(?:\+62|0)[0-9]{8,13}$/) phone!: string;
  @IsString() @Length(0, 1000) message!: string;
  @Equals(true) consent!: boolean;
}
class ViewDto {
  @IsUUID("4") visitorId!: string;
}
@Controller("api")
export class AssetsController {
  constructor(private readonly db: Database, private readonly account: PublicAccountService) {}
  @Get("health") async health() {
    await this.db.query("SELECT 1");
    return { status: "ok", database: "mysql" };
  }
  @Get("assets") async list(@Query() query: SearchDto) {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    )
      throw new BadRequestException(
        "Harga minimal tidak boleh melebihi harga maksimal.",
      );
    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo)
      throw new BadRequestException(
        "Tanggal awal tidak boleh melewati tanggal akhir.",
      );
    const where: string[] = ["archived = 0"];
    const values: (string | number)[] = [];
    if (query.saleMethod) {
      where.push("saleMethod = ?");
      values.push(query.saleMethod);
    }
    if (query.period) where.push("saleMethod = 'Lelang' AND auctionDate IS NOT NULL");
    if (query.tag === "featured") where.push("featured = 1");
    if (query.tag === "discount") where.push("oldPrice > price");
    if (query.minPrice !== undefined) {
      where.push("price >= ?");
      values.push(query.minPrice);
    }
    if (query.dateFrom) {
      where.push("auctionDate >= ?");
      values.push(query.dateFrom + " 00:00:00");
    }
    if (query.dateTo) {
      where.push("auctionDate < DATE_ADD(?, INTERVAL 1 DAY)");
      values.push(query.dateTo + " 00:00:00");
    }
    if (query.featured === "true") where.push("featured = 1");
    if (query.period === "upcoming")
      where.push("auctionDate >= DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 HOUR)");
    if (query.period === "past")
      where.push("auctionDate < DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 HOUR)");
    if (query.q) {
      where.push("(title LIKE ? OR city LIKE ? OR code LIKE ?)");
      values.push(...Array(3).fill(`%${query.q}%`));
    }
    if (query.category && query.category !== "Semua") {
      where.push("category = ?");
      values.push(query.category);
    }
    if (query.city && query.city !== "Semua lokasi") {
      where.push("city = ?");
      values.push(query.city);
    }
    if (query.maxPrice !== undefined) {
      where.push("price <= ?");
      values.push(query.maxPrice);
    }
    const order = {
      recommended: "featured DESC, id ASC",
      lowest: "price ASC",
      highest: "price DESC",
      soonest: "auctionDate IS NULL, auctionDate ASC",
    }[query.sort || "recommended"];
    const clause = "WHERE " + where.join(" AND ");
    const [count] = await this.db.query(
      `SELECT COUNT(*) total FROM assets ${clause}`,
      values,
    );
    const data = await this.db.query(
      `SELECT * FROM assets ${clause} ORDER BY ${order}, id ASC LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}`,
      values,
    );
    return {
      data: data.map(row=>({...row,details:typeof row.details==="string"?JSON.parse(row.details):row.details||{}})),
      total: count.total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
  @Get("assets/:slug") async detail(@Param("slug") slug: string) {
    const rows = await this.db.query(
      "SELECT * FROM assets WHERE slug = ? AND archived = 0",
      [slug],
    );
    if (!rows.length) throw new NotFoundException("Aset tidak ditemukan");
    const photos = await this.db.query(
      "SELECT url FROM asset_photos WHERE asset_id = ? ORDER BY position, id",
      [rows[0].id],
    );
    const [stats] = await this.db.query(
      "SELECT (SELECT COUNT(*) FROM asset_views WHERE asset_id = ?) viewCount, (SELECT COUNT(*) FROM interests WHERE asset_id = ?) interestCount",
      [rows[0].id, rows[0].id],
    );
    const [category] = await this.db.query("SELECT settings FROM asset_categories WHERE name=?",[rows[0].category]);
    return {
      ...rows[0],
      categorySettings: getCategorySettings(rows[0].category,typeof category?.settings==="string"?JSON.parse(category.settings):category?.settings),
      details: typeof rows[0].details === "string" ? JSON.parse(rows[0].details) : rows[0].details || {},
      id: rows[0].id as number,
      code: rows[0].code as string,
      photos: [
        ...new Set([rows[0].image, ...photos.map((photo) => photo.url)]),
      ],
      ...stats,
    };
  }
  @Post("assets/:slug/views") @HttpCode(200) async recordView(
    @Param("slug") slug: string,
    @Body() body: ViewDto,
  ) {
    const rows = await this.db.query(
      "SELECT id FROM assets WHERE slug = ? AND archived = 0",
      [slug],
    );
    if (!rows.length) throw new NotFoundException("Aset tidak ditemukan");
    await this.db.execute(
      "INSERT IGNORE INTO asset_views(asset_id,visitor_id) VALUES(?,?)",
      [rows[0].id, body.visitorId],
    );
    const [stats] = await this.db.query(
      "SELECT COUNT(*) viewCount FROM asset_views WHERE asset_id = ?",
      [rows[0].id],
    );
    return stats;
  }
  @Post("assets/:slug/interests") @HttpCode(201) async interest(
    @Param("slug") slug: string,
    @Body() body: InterestDto,
    @Req() req: Request,
  ) {
    const asset = await this.detail(slug);
    const user = await this.account.maybeUser(req);
    if (user && user.email !== body.email.trim().toLowerCase())
      throw new BadRequestException("Gunakan email akun Anda untuk pengajuan ini.");
    await this.db.query(
      "INSERT INTO interests (asset_id, name, email, phone, message, consent, public_user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [asset.id, body.name, body.email, body.phone, body.message, body.consent, user?.id || null],
    );
    return { message: "Minat Anda berhasil tersimpan.", reference: asset.code };
  }
}

import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { randomUUID } from "node:crypto";
import type { Response } from "express";
import { Database } from "./database/database.service";
import { AdminGuard } from "./auth/auth.guard";

class BlockDto {
  @IsIn(["text", "image"]) type!: string;
  @IsOptional() @IsString() @Length(0, 150) heading?: string;
  @IsOptional() @IsString() @Length(0, 10000) text?: string;
  @IsOptional() @Matches(/^\/api\/guide\/images\/[0-9a-f-]{36}$/) url?: string;
  @IsOptional() @IsString() @Length(0, 300) caption?: string;
}
class GuideDto {
  @IsString() @Length(1, 150) title!: string;
  @IsInt() @Min(1) version!: number;
  @IsArray()
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => BlockDto)
  blocks!: BlockDto[];
}
@Controller("api")
export class GuideController {
  constructor(private readonly db: Database) {}
  @Get("guide") async read() {
    const [row] = await this.db.query(
      "SELECT title,blocks,version,updated_at FROM guide_content WHERE id=1",
    );
    if (!row) throw new NotFoundException("Panduan belum tersedia.");
    return {
      ...row,
      blocks:
        typeof row.blocks === "string" ? JSON.parse(row.blocks) : row.blocks,
    };
  }
  @Put("admin/guide") @UseGuards(AdminGuard) async save(
    @Body() body: GuideDto,
  ) {
    if (!body.title.trim()) throw new BadRequestException("Judul wajib diisi.");
    for (const block of body.blocks) {
      if (block.type === "text" && !block.text?.trim())
        throw new BadRequestException("Isi teks tidak boleh kosong.");
      if (block.type === "image") {
        if (!block.url)
          throw new BadRequestException("Unggah gambar terlebih dahulu.");
        const rows = await this.db.query(
          "SELECT id FROM guide_images WHERE id=?",
          [block.url.split("/").pop()!],
        );
        if (!rows.length)
          throw new BadRequestException("Gambar tidak ditemukan.");
      }
    }
    const result = await this.db.execute(
      "UPDATE guide_content SET title=?,blocks=?,version=version+1 WHERE id=1 AND version=?",
      [body.title.trim(), JSON.stringify(body.blocks), body.version],
    );
    if (!result.affectedRows)
      throw new ConflictException(
        "Panduan telah diubah admin lain. Muat ulang sebelum menyimpan.",
      );
    return this.read();
  }
  @Post("admin/guide/images")
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileInterceptor("image", {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  async upload(@UploadedFile() file?: { buffer: Buffer }) {
    const data = file?.buffer;
    if (!data || data.length < 12)
      throw new BadRequestException("Pilih gambar PNG, JPG, atau WebP.");
    const mime = data
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? "image/png"
      : data[0] === 255 && data[1] === 216 && data[2] === 255
        ? "image/jpeg"
        : data.toString("ascii", 0, 4) === "RIFF" &&
            data.toString("ascii", 8, 12) === "WEBP"
          ? "image/webp"
          : "";
    if (!mime)
      throw new BadRequestException("Format gambar harus PNG, JPG, atau WebP.");
    const id = randomUUID();
    await this.db.pool.execute(
      "INSERT INTO guide_images(id,mime,data) VALUES(?,?,?)",
      [id, mime, data],
    );
    return { url: `/api/guide/images/${id}` };
  }
  @Get("guide/images/:id") async image(
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    const [row] = await this.db.query(
      "SELECT mime,data FROM guide_images WHERE id=?",
      [id],
    );
    if (!row) throw new NotFoundException();
    res.setHeader("Content-Type", row.mime);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(row.data);
  }
}

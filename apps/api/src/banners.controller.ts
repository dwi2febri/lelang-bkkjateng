import { BadRequestException, Body, ConflictException, Controller, Get, Header, NotFoundException, Param, Post, Put, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ArrayMinSize, ArrayMaxSize, IsArray, IsInt, IsString, Length, Matches, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { randomUUID } from "node:crypto";
import type { Response } from "express";
import { Database } from "./database/database.service";
import { AdminGuard } from "./auth/auth.guard";
class SlideDto {
 @IsString() @Length(1,1000) image!: string;
 @IsString() @Length(0,100) eyebrow!: string;
 @IsString() @Length(1,100) title!: string;
 @IsString() @Length(0,100) accent!: string;
 @IsString() @Length(0,500) description!: string;
 @IsString() @Length(1,60) action!: string;
 @IsString() @Length(1,500) href!: string;
 @IsString() @Length(0,150) note!: string;
 @IsString() @Length(0,100) caption!: string;
 @IsString() @Length(0,100) trustFirst!: string;
 @IsString() @Length(0,100) trustSecond!: string;
}
class BannersDto {
 @IsInt() @Min(1) version!: number;
 @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @ValidateNested({each:true}) @Type(()=>SlideDto) slides!: SlideDto[];
}
function safeLink(value: string) {
 if (/[\\\s\u0000-\u001f]/.test(value)) return false;
 if (value.startsWith("/") && !value.startsWith("//")) return true;
 try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}
@Controller("api")
export class BannersController {
 constructor(private readonly db: Database) {}
 @Get("banners") @Header("Cache-Control", "no-store") async read() {
  const [row] = await this.db.query("SELECT slides,version FROM banner_content WHERE id=1");
  if (!row) throw new NotFoundException("Banner belum tersedia.");
  return {...row, slides:typeof row.slides === "string" ? JSON.parse(row.slides) : row.slides};
 }
 @Put("admin/banners") @UseGuards(AdminGuard) async save(@Body() body:BannersDto) {
  for (const slide of body.slides) {
   if (!slide.title.trim() || !slide.action.trim()) throw new BadRequestException("Judul dan tulisan tombol wajib diisi.");
   if (!safeLink(slide.href)) throw new BadRequestException("Tujuan tombol harus path lokal atau URL HTTPS yang valid.");
   if (slide.image.startsWith("/api/banners/images/")) {
    const id=slide.image.slice("/api/banners/images/".length);
    if (!/^[0-9a-f-]{36}$/.test(id) || !(await this.db.query("SELECT id FROM banner_images WHERE id=?",[id])).length) throw new BadRequestException("Gambar banner tidak ditemukan.");
   } else {
    if (!slide.image.startsWith("https://") || !safeLink(slide.image)) throw new BadRequestException("Unggah gambar atau gunakan URL gambar HTTPS.");
   }
  }
  const result=await this.db.execute("UPDATE banner_content SET slides=?,version=version+1 WHERE id=1 AND version=?",[JSON.stringify(body.slides),body.version]);
  if (!result.affectedRows) throw new ConflictException("Banner telah diubah admin lain. Muat ulang sebelum menyimpan.");
  return this.read();
 }
  @Post("admin/banners/images")
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
      "INSERT INTO banner_images(id,mime,data) VALUES(?,?,?)",
      [id, mime, data],
    );
    return { url: `/api/banners/images/${id}` };
  }
  @Get("banners/images/:id") async image(
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    const [row] = await this.db.query(
      "SELECT mime,data FROM banner_images WHERE id=?",
      [id],
    );
    if (!row) throw new NotFoundException();
    res.setHeader("Content-Type", row.mime);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(row.data);
  }
}

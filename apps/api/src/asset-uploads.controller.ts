import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { AdminGuard } from "./auth/auth.guard";

const directory = resolve(__dirname, "../../../uploads/assets");
const formats: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
type UploadFile = { buffer: Buffer; mimetype: string; size: number };

function validImage(file: UploadFile) {
  const bytes = file.buffer;
  if (file.mimetype === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.mimetype === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (file.mimetype === "image/webp") return bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  return false;
}

@Controller("api/admin/uploads/assets")
@UseGuards(AdminGuard)
export class AssetUploadsController {
  @Post()
  @UseInterceptors(FilesInterceptor("files", 12, {
    limits: { fileSize: 5 * 1024 * 1024, files: 12 },
  }))
  async upload(@UploadedFiles() files: UploadFile[]) {
    if (!files?.length) throw new BadRequestException("Pilih minimal satu foto.");
    if (files.some((file) => !formats[file.mimetype] || !validImage(file)))
      throw new BadRequestException("Gunakan foto JPG, PNG, atau WebP yang valid.");
    await mkdir(directory, { recursive: true });
    const urls = await Promise.all(files.map(async (file) => {
      const filename = `${randomUUID()}.${formats[file.mimetype]}`;
      await writeFile(resolve(directory, filename), file.buffer, { flag: "wx" });
      return `/api/uploads/assets/${filename}`;
    }));
    return { urls };
  }
}

@Controller("api/uploads/assets")
export class PublicAssetUploadsController {
  @Get(":filename")
  async image(@Param("filename") filename: string) {
    const match = /^[0-9a-f-]{36}\.(jpg|png|webp)$/.exec(filename);
    if (!match) throw new NotFoundException("Foto tidak ditemukan.");
    const path = resolve(directory, filename);
    try { await stat(path); } catch { throw new NotFoundException("Foto tidak ditemukan."); }
    const type = match[1] === "jpg" ? "image/jpeg" : `image/${match[1]}`;
    return new StreamableFile(createReadStream(path), { type });
  }
}

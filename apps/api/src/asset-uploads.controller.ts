import { imageToWebp } from "./image-webp";
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
type UploadFile = { buffer: Buffer; mimetype: string; size: number };

@Controller("api/admin/uploads/assets")
@UseGuards(AdminGuard)
export class AssetUploadsController {
  @Post()
  @UseInterceptors(FilesInterceptor("files", 12, {
    limits: { fileSize: 5 * 1024 * 1024, files: 12 },
  }))
  async upload(@UploadedFiles() files: UploadFile[]) {
    if (!files?.length) throw new BadRequestException("Pilih minimal satu foto.");
    const images: Buffer[] = [];
    for (const file of files) images.push(await imageToWebp(file.buffer));
    await mkdir(directory, { recursive: true });
    const urls = await Promise.all(images.map(async (data) => {
      const filename = `${randomUUID()}.webp`;
      await writeFile(resolve(directory, filename), data, { flag: "wx" });
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

import { BadRequestException } from "@nestjs/common";
import sharp from "sharp";

/** Decode and validate real pixels, then normalize orientation and stored format. */
export async function imageToWebp(data?: Buffer): Promise<Buffer> {
  try {
    if (!data?.length) throw new Error("Empty image");
    const image = sharp(data, { limitInputPixels: 40_000_000, failOn: "error" });
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format || "") || (metadata.pages || 1) > 1)
      throw new Error("Unsupported image");
    return await image.rotate()
      .resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85, alphaQuality: 100 }).toBuffer();
  } catch {
    throw new BadRequestException("Gunakan gambar JPG, PNG, atau WebP yang valid, tidak animasi, maksimal 40 megapiksel.");
  }
}

import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
export class AssetDto {
  @IsString()
  @Length(3, 150)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;
  @IsString() @Length(2, 30) @Matches(/^[A-Z0-9-]+$/) code!: string;
  @IsString() @Length(3, 200) title!: string;
  @IsString() @Length(2,30) category!: string;
  @IsIn(["Jual Beli", "Lelang", "Cessie"]) saleMethod: string = "Lelang";
  @IsOptional() @IsString() @Length(2, 60) province?: string;
  @IsString() @Length(2, 60) city!: string;
  @IsString() @Length(5, 250) address!: string;
  @IsInt() @Min(1) @Max(1000000000000) price!: number;
  @IsOptional() @IsInt() @Min(1) @Max(1000000000000) oldPrice?: number | null;
  @IsInt() @Min(0) @Max(10000000) land!: number;
  @IsInt() @Min(0) @Max(10000000) building!: number;
  @IsInt() @Min(0) @Max(1000) bedrooms!: number;
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @Length(10, 500)
  image!: string;
  @IsISO8601({ strict: true }) auctionDate!: string;
  @IsString() @Length(2, 30) certificate!: string;
  @IsString() @Length(10, 10000) description!: string;
  @IsBoolean() featured!: boolean;
}
export class ArchiveDto {
  @IsBoolean() archived!: boolean;
}
export class ListDto {
  @IsOptional() @IsString() @Length(0, 100) q?: string;
  @IsOptional()
  @IsIn(["baru", "diproses", "selesai", "ditolak"])
  status?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
}
export class StatusDto {
  @IsIn(["baru", "diproses", "selesai", "ditolak"]) status!: string;
  @IsString() @Length(0, 2000) notes!: string;
  @IsInt() @Min(0) version!: number;
}
export class CreateInterestDto {
  @IsInt() @Min(1) assetId!: number;
  @IsString() @Length(2, 80) name!: string;
  @IsEmail() @Length(5, 150) email!: string;
  @IsString() @Matches(/^(?:\+62|0)[0-9]{8,13}$/) phone!: string;
  @IsString() @Length(0, 1000) message!: string;
}

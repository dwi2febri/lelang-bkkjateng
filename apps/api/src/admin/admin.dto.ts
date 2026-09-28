import {
  IsBoolean,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  ValidateIf,
  IsISO8601,
  IsOptional,
  IsObject,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  Min,
  ArrayMaxSize,
  ArrayMinSize,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import {googleMapsUrlPattern} from "../google-maps";
export class AssetDetailsDto {
  @IsOptional() @IsBoolean() locationIsDemo?: boolean;
  @ValidateIf(o=>o.latitude!==undefined||o.longitude!==undefined) @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @ValidateIf(o=>o.latitude!==undefined||o.longitude!==undefined) @IsNumber() @Min(-180) @Max(180) longitude?: number;
  @IsOptional() @IsString() @Length(10,2048) @IsUrl({protocols:["https"],require_protocol:true}) @Matches(googleMapsUrlPattern,{message:"Gunakan tautan lokasi Google Maps yang valid (HTTPS)."}) googleMapsUrl?: string;
  @IsOptional() @IsObject() attributes?: Record<string, string | number>;
  @IsOptional() @IsInt() @Min(0) @Max(1000) bathrooms?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1000) floors?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1000000) electricity?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1000) carport?: number;
  @IsOptional() @IsInt() @Min(1800) @Max(2200) yearBuilt?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1000000000000) auctionDeposit?: number;
  @IsOptional() @IsString() @Length(0, 150) auctionOrganizer?: string;
  @IsOptional() @IsUrl({ protocols: ["https"], require_protocol: true }) @Length(10, 500) auctionUrl?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) @Length(1,80,{each:true}) facilities?: string[];
}
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
  @IsOptional() @IsString() @Length(0, 100) district?: string;
  @IsOptional() @IsString() @Length(0, 100) village?: string;
  @IsString() @Length(5, 250) address!: string;
  @IsInt() @Min(1) @Max(1000000000000) price!: number;
  @IsOptional() @IsInt() @Min(1) @Max(1000000000000) oldPrice?: number | null;
  @IsInt() @Min(0) @Max(10000000) land!: number;
  @IsInt() @Min(0) @Max(10000000) building!: number;
  @IsInt() @Min(0) @Max(1000) bedrooms!: number;
  @Matches(/^(https:\/\/\S+|\/api\/uploads\/assets\/[0-9a-f-]{36}\.(?:jpg|png|webp))$/)
  @Length(10, 500)
  image!: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(12) @IsString({ each: true })
  @Matches(/^(https:\/\/\S+|\/api\/uploads\/assets\/[0-9a-f-]{36}\.(?:jpg|png|webp))$/, { each: true })
  photos?: string[];
  @IsOptional() @IsObject() @ValidateNested() @Type(() => AssetDetailsDto)
  details?: AssetDetailsDto;
  @ValidateIf((body: AssetDto) => body.saleMethod === "Lelang" || body.auctionDate != null)
  @IsISO8601({ strict: true }) auctionDate?: string | null;
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

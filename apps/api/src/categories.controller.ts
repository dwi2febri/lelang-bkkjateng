import {Body, Controller, Get, Post, Put, Param, UseGuards, Header, BadRequestException, ConflictException} from "@nestjs/common";
import {IsString, Length, Matches, IsIn, IsBoolean, IsInt, Min, Max, IsOptional, IsObject} from "class-validator";
import {CategorySettings, getCategorySettings, validateCategorySettings} from "./category-settings";
import {Database} from "./database/database.service";
import {AdminGuard} from "./auth/auth.guard";
class CategoryDto {
 @IsOptional() @IsObject() settings?: CategorySettings;
 @IsString() @Length(1,80) @Matches(/\S/) label!: string;
 @IsIn(["house","building","trees","car","warehouse","store","landmark","factory","key","truck","map","hotel","apartment","office","shop","bed","fence","land","mountain","farm","garden","forest","water","beach","bike","bus","van","tractor","ship","plane","train","parking","garage","school","hospital","sports","restaurant","cafe","fuel","tools","machine","solar","auction"]) icon!: string;
 @IsBoolean() showHome!: boolean;
 @IsInt() @Min(0) @Max(999) sortOrder!: number;
 @IsInt() @Min(0) version!: number;
}
class CreateCategoryDto extends CategoryDto {
 @IsString() @Length(2,30) @Matches(/^[A-Za-z0-9][A-Za-z0-9 &-]*$/) name!: string;
}
@Controller("api")
export class CategoriesController {
 constructor(private readonly db: Database) {}
 @Get("categories") @Header("Cache-Control","no-store") async list() {
  const rows=await this.db.query("SELECT * FROM asset_categories ORDER BY sortOrder,name");
  return rows.map(row=>({...row,showHome:!!row.showHome,settings:getCategorySettings(row.name,typeof row.settings==="string"?JSON.parse(row.settings):row.settings)}));
 }
 @Post("admin/categories") @UseGuards(AdminGuard) async create(@Body() body:CreateCategoryDto) {
  if(body.name.toLowerCase()==="semua") throw new BadRequestException("Nama ini digunakan untuk semua kategori.");
  const settings=getCategorySettings(body.name,body.settings);
  this.checkSettings(settings);
  await this.db.execute("INSERT INTO asset_categories(name,label,icon,showHome,sortOrder,settings) VALUES(?,?,?,?,?,?)",[body.name.trim(),body.label.trim(),body.icon,body.showHome,body.sortOrder,JSON.stringify(settings)]);
  return this.list();
 }
 @Put("admin/categories/:name") @UseGuards(AdminGuard) async update(@Param("name") name:string,@Body() body:CategoryDto) {
  if(body.settings) this.checkSettings(body.settings);
  const result=await this.db.execute("UPDATE asset_categories SET label=?,icon=?,showHome=?,sortOrder=?,settings=COALESCE(?,settings),version=version+1 WHERE name=? AND version=?",[body.label.trim(),body.icon,body.showHome,body.sortOrder,body.settings?JSON.stringify(body.settings):null,name,body.version]);
  if(!result.affectedRows) throw new ConflictException("Kategori telah berubah. Muat ulang sebelum menyimpan.");
  return this.list();
 }
 private checkSettings(value:unknown) {try {validateCategorySettings(value);}catch(e){throw new BadRequestException((e as Error).message);}}
}

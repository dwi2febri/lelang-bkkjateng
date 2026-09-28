import { ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsInt, IsString, Length, Matches, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { PublicAccountService } from "./public-account.service";

class EmailDto { @IsEmail() @Length(5,150) email!: string; }
class CodeDto extends EmailDto { @Matches(/^[0-9]{8}$/) code!: string; }
class RegisterDto extends CodeDto {
  @IsString() @Length(2,80) name!: string;
  @IsString() @Matches(/^(?:\+62|0)[0-9]{8,13}$/) phone!: string;
  @IsString() @Length(12,128) password!: string;
  @IsString() confirmation!: string;
}
class LoginDto extends EmailDto { @IsString() password!: string; }
class FavoriteIdsDto {
  @IsArray() @ArrayMaxSize(200) @IsInt({each:true}) @Min(1,{each:true}) @Max(2147483647,{each:true}) ids!: number[];
}
class FavoriteDto { @IsBoolean() favorite!: boolean; }

@Controller("api/public-account")
export class PublicAccountController {
  constructor(private readonly account: PublicAccountService) {}
  @Post("send-code") @HttpCode(200) sendCode(@Body() body: EmailDto, @Req() req: Request) { return this.account.sendCode(body.email, req); }
  @Post("preview") @HttpCode(200) preview(@Body() body: CodeDto, @Req() req: Request) { return this.account.preview(body.email, body.code, req); }
  @Post("register") @HttpCode(201) register(@Body() body: RegisterDto, @Req() req: Request, @Res({passthrough:true}) res: Response) { return this.account.register(body, req, res); }
  @Post("login") @HttpCode(200) login(@Body() body: LoginDto, @Req() req: Request, @Res({passthrough:true}) res: Response) { return this.account.login(body.email, body.password, req, res); }
  @Post("logout") @HttpCode(200) logout(@Req() req: Request, @Res({passthrough:true}) res: Response) { return this.account.logout(req, res); }
  @Get("me") me(@Req() req: Request) { return this.account.user(req); }
  @Get("history") history(@Req() req: Request) { return this.account.history(req); }
  @Get("favorites") favorites(@Req() req: Request) { return this.account.favorites(req); }
  @Post("favorites/sync") @HttpCode(200) syncFavorites(@Body() body: FavoriteIdsDto, @Req() req: Request) { return this.account.syncFavorites(req, body.ids); }
  @Post("favorites/:id") @HttpCode(200) setFavorite(@Param("id",ParseIntPipe) id: number, @Body() body: FavoriteDto, @Req() req: Request) { return this.account.setFavorite(req,id,body.favorite); }
}

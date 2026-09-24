import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { IsEmail, IsString, Length } from "class-validator";
import type { Request, Response } from "express";
import { AdminGuard } from "./auth.guard";
import { AuthRequest, AuthService } from "./auth.service";
class LoginDto {
  @IsEmail() @Length(3, 150) email!: string;
  @IsString() @Length(1, 128) password!: string;
}
@Controller("api/auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post("login") @HttpCode(200) login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader("Cache-Control", "no-store");
    return this.auth.login(body.email, body.password, req, res);
  }
  @Get("me") @UseGuards(AdminGuard) me(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader("Cache-Control", "no-store");
    return req.admin;
  }
  @Post("logout") @HttpCode(200) logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.logout(req, res);
  }
}

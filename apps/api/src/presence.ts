import { Body, Controller, Get, Header, Injectable, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { createHash, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import type { RowDataPacket } from "mysql2/promise";
import { Database } from "./database/database.service";
import { AuthService } from "./auth/auth.service";
import { AdminGuard } from "./auth/auth.guard";
import { PublicAccountService } from "./public-account/public-account.service";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
function cookie(req: Request, key: string) {
  const raw = req.headers.cookie?.split(";").map(value => value.trim()).find(value => value.startsWith(key + "="))?.slice(key.length + 1);
  return raw && /^[a-f0-9]{64}$/.test(raw) ? raw : null;
}
class HeartbeatDto {
  @IsIn(["internal", "external"]) kind!: "internal" | "external";
  @IsString() @Length(1,250) @Matches(/^\/(?!\/)[^?#\s]*$/) path!: string;
}
class LogQuery {
  @IsIn(["internal", "external"]) type: "internal" | "external" = "internal";
  @IsOptional() @IsIn(["all", "online"]) status: string = "all";
  @IsOptional() @IsString() @Length(0,100) q: string = "";
  @Type(() => Number) @IsInt() @Min(1) @Max(100000) page: number = 1;
}
class ActivityQuery {
  @IsIn(["internal", "external"]) type: string = "internal";
  @IsOptional() @IsIn(["all","visit","resume","session","submission"]) action: string = "all";
  @IsOptional() @IsString() @Length(0,100) q: string = "";
  @Type(() => Number) @IsInt() @Min(1) @Max(100000) page: number = 1;
}
// Online state additionally requires a still-valid authenticated session.
const online = `(p.last_seen > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 75 SECOND) AND (
  (p.kind='external' AND p.user_id IS NULL) OR
  (p.kind='internal' AND EXISTS(SELECT 1 FROM admin_sessions s JOIN admin_users u ON u.id=s.user_id WHERE s.token_hash=p.session_hash AND s.user_id=p.user_id AND s.expires_at>UTC_TIMESTAMP() AND u.active=1)) OR
  (p.kind='external' AND EXISTS(SELECT 1 FROM public_sessions s JOIN public_users u ON u.id=s.user_id WHERE s.token_hash=p.session_hash AND s.user_id=p.user_id AND s.expires_at>UTC_TIMESTAMP() AND u.active=1))
))`;

@Injectable()
export class PresenceService {
  constructor(private readonly db: Database, private readonly auth: AuthService, private readonly account: PublicAccountService) {}
  visitor(req: Request, res: Response) {
    let token = cookie(req, "bkk_presence");
    if (!token) {
      token = randomBytes(32).toString("hex");
      res.cookie("bkk_presence", token, {httpOnly:true, sameSite:"lax", secure:process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true", path:"/", maxAge:365*86400000});
    }
    return hash(token);
  }
  async beat(body: HeartbeatDto, req: Request, res: Response) {
    this.account.checkMutation(req);
    const user = body.kind === "internal" ? await this.auth.user(req) : await this.account.maybeUser(req);
    const token = cookie(req, body.kind === "internal" ? "bkk_admin_session" : "bkk_public_session");
    const visitor = this.visitor(req,res);
    const ip = (req.ip||req.socket.remoteAddress||"unknown").replace(/^::ffff:/,"").slice(0,45);
    const session = user && token ? hash(token) : null;
    const connection = await this.db.pool.getConnection();
    try {
    await connection.beginTransaction();
    const [previous] = await connection.execute<RowDataPacket[]>("SELECT *,last_seen < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 75 SECOND) stale,EXISTS(SELECT 1 FROM user_activity a WHERE a.visitor_hash=user_presence.visitor_hash AND a.kind=user_presence.kind) history_started FROM user_presence WHERE visitor_hash=? AND kind=? FOR UPDATE",[visitor,body.kind]);
    const old = previous[0];
    await connection.execute(`INSERT INTO user_presence(visitor_hash,kind,user_id,session_hash,name,ip,path,first_seen,last_seen)
      VALUES(?,?,?,?,?,?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE
      user_id=VALUES(user_id),session_hash=VALUES(session_hash),name=VALUES(name),ip=VALUES(ip),path=VALUES(path),last_seen=UTC_TIMESTAMP()`,
      [visitor,body.kind,user?.id||null,session,user?.name||null,ip,body.path]);
    const action = !old || !old.history_started ? "visit" : old.session_hash !== session ? "session" : old.path !== body.path ? "visit" : old.stale ? "resume" : null;
    if(action) await connection.execute(`INSERT INTO user_activity(visitor_hash,kind,user_id,name,identity,ip,path,action,occurred_at) VALUES(?,?,?,?,?,?,?,?,UTC_TIMESTAMP())`,
      [visitor,body.kind,user?.id||null,user?.name||old?.applicant_name||null,user?"account":old?.applicant_name?"applicant":"guest",ip,body.path,action]);
    await connection.commit();
    } catch(error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
    return {ok:true};
  }
  async applicant(req: Request, res: Response, name: string, path: string) {
    const visitor = this.visitor(req,res);
    const ip = (req.ip||req.socket.remoteAddress||"unknown").replace(/^::ffff:/,"").slice(0,45);
    await this.db.execute(`INSERT INTO user_presence(visitor_hash,kind,applicant_name,ip,path,first_seen,last_seen)
      VALUES(?,'external',?,?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE applicant_name=VALUES(applicant_name),last_seen=UTC_TIMESTAMP()`,
      [visitor,name,ip,path.slice(0,250)]);
    const user = await this.account.maybeUser(req);
    await this.db.execute("INSERT INTO user_activity(visitor_hash,kind,user_id,name,identity,ip,path,action,occurred_at) VALUES(?,'external',?,?,?,?,?,'submission',UTC_TIMESTAMP())",[visitor,user?.id||null,user?.name||name,user?"account":"applicant",ip,path.slice(0,250)]);
  }
  async history(query: ActivityQuery) {
    const values: (string|number)[] = [query.type];
    let where = "kind=?";
    if(query.action !== "all") {where += " AND action=?"; values.push(query.action);}
    if(query.q) {where += " AND (name LIKE ? OR ip LIKE ? OR path LIKE ?)";values.push(...Array(3).fill(`%${query.q}%`));}
    const [count] = await this.db.query(`SELECT COUNT(*) total FROM user_activity WHERE ${where}`,values);
    const data = await this.db.query(`SELECT id,COALESCE(name,ip) name,identity,ip,path,action,DATE_FORMAT(occurred_at,'%Y-%m-%dT%H:%i:%sZ') occurredAt FROM user_activity WHERE ${where} ORDER BY id DESC LIMIT 30 OFFSET ${(query.page-1)*30}`,values);
    return {data,total:Number(count.total)};
  }
  async list(query: LogQuery) {
    const values: (string | number)[] = [query.type];
    let where = "p.kind=?";
    if(query.q) { where += " AND (COALESCE(p.name,p.applicant_name,'') LIKE ? OR p.ip LIKE ? OR p.path LIKE ?)"; values.push(...Array(3).fill(`%${query.q}%`)); }
    const [summary] = await this.db.query(`SELECT COUNT(*) total, COALESCE(SUM(${online}),0) online FROM user_presence p WHERE ${where}`,values);
    if(query.status === "online") where += ` AND ${online}`;
    const rows = await this.db.query(`SELECT p.visitor_hash id, p.user_id userId, COALESCE(p.name,p.applicant_name,p.ip) name,
      CASE WHEN p.user_id IS NOT NULL THEN 'account' WHEN p.applicant_name IS NOT NULL THEN 'applicant' ELSE 'guest' END identity,
      p.ip,p.path,DATE_FORMAT(p.first_seen,'%Y-%m-%dT%H:%i:%sZ') firstSeen,DATE_FORMAT(p.last_seen,'%Y-%m-%dT%H:%i:%sZ') lastSeen,${online} online
      FROM user_presence p WHERE ${where} ORDER BY online DESC,p.last_seen DESC,p.visitor_hash LIMIT 30 OFFSET ${(query.page-1)*30}`,values);
    return {data:rows,total:query.status === "online" ? Number(summary.online):Number(summary.total),online:Number(summary.online),page:query.page};
  }
}
@Controller("api")
export class PresenceController {
  constructor(private readonly presence: PresenceService) {}
  @Post("presence") @Header("Cache-Control","no-store")
  beat(@Body() body: HeartbeatDto,@Req() req: Request,@Res({passthrough:true}) res: Response) { return this.presence.beat(body,req,res); }
  @Get("admin/user-logs") @UseGuards(AdminGuard) @Header("Cache-Control","no-store")
  logs(@Query() query: LogQuery) { return this.presence.list(query); }
  @Get("admin/user-activity") @UseGuards(AdminGuard) @Header("Cache-Control","no-store")
  history(@Query() query: ActivityQuery) { return this.presence.history(query); }
}

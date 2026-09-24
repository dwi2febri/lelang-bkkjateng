import { Body, Controller, Post, Header } from "@nestjs/common";
import { IsUUID } from "class-validator";
import { Database } from "./database/database.service";

class VisitDto {
  @IsUUID("4") visitorId!: string;
}

@Controller("api/visitors")
export class VisitorsController {
  constructor(private readonly db: Database) {}

  @Post()
  @Header("Cache-Control", "no-store")
  async visit(@Body() body: VisitDto) {
    // One browser per WIB calendar day, including concurrent tabs/requests.
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
    await this.db.execute("INSERT IGNORE INTO site_visits(visitor_id, visit_date) VALUES (?, ?)", [body.visitorId, day]);
    const [counts] = await this.db.query("SELECT COUNT(DISTINCT visitor_id) AS total, COALESCE(SUM(visit_date = ?), 0) AS daily FROM site_visits", [day]);
    return { daily: Number(counts.daily), total: Number(counts.total) };
  }
}

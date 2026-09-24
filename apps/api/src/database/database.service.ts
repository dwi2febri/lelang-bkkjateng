import {
  ConflictException,
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from "@nestjs/common";
import mysql, { RowDataPacket, ResultSetHeader } from "mysql2/promise";
type Value = string | number | boolean | null;
@Injectable()
export class Database implements OnModuleDestroy {
  readonly pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "lelang_bkkjateng",
    connectionLimit: 8,
    decimalNumbers: true,
    timezone: "+07:00",
  });
  private failure(error: unknown): never {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY")
      throw new ConflictException("Kode atau slug sudah digunakan.");
    throw new ServiceUnavailableException(
      "Database belum tersedia. Silakan coba kembali.",
    );
  }
  async query(sql: string, values: Value[] = []) {
    try {
      const [rows] = await this.pool.execute<RowDataPacket[]>(sql, values);
      return rows;
    } catch (error) {
      return this.failure(error);
    }
  }
  async execute(sql: string, values: Value[] = []) {
    try {
      const [result] = await this.pool.execute<ResultSetHeader>(sql, values);
      return result;
    } catch (error) {
      return this.failure(error);
    }
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}

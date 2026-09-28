import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config({ quiet: true });
const db = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "lelang_bkkjateng",
});
try {
  const [columns] = await db.query("SHOW COLUMNS FROM assets LIKE 'details'");
  if (!columns.length) await db.query("ALTER TABLE assets ADD COLUMN details JSON NULL");
  console.log("Kolom detail aset siap.");
} finally {
  await db.end();
}

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
  await db.query(`CREATE TABLE IF NOT EXISTS public_users (
    id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(80) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE, phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(200) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS public_sessions (
    token_hash CHAR(64) PRIMARY KEY, user_id INT NOT NULL,
    expires_at DATETIME NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX(expires_at), FOREIGN KEY(user_id) REFERENCES public_users(id) ON DELETE CASCADE
  )`);
  const [activeColumns] = await db.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='public_users' AND COLUMN_NAME='active'");
  if (!activeColumns.length) await db.query("ALTER TABLE public_users ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE");
  await db.query(`CREATE TABLE IF NOT EXISTS public_password_resets (
    user_id INT PRIMARY KEY, token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL, sent_at DATETIME NOT NULL,
    INDEX(expires_at), FOREIGN KEY(user_id) REFERENCES public_users(id) ON DELETE CASCADE
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS public_email_codes (
    email VARCHAR(150) PRIMARY KEY, code_hash VARCHAR(200) NOT NULL,
    expires_at DATETIME NOT NULL, attempts INT NOT NULL DEFAULT 0,
    sent_at DATETIME NOT NULL
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS public_favorites (
    user_id INT NOT NULL, asset_id INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id,asset_id), FOREIGN KEY(user_id) REFERENCES public_users(id) ON DELETE CASCADE,
    FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE
  )`);
  const [columns] = await db.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='interests' AND COLUMN_NAME='public_user_id'");
  if (!columns.length) await db.query("ALTER TABLE interests ADD COLUMN public_user_id INT NULL, ADD INDEX(public_user_id), ADD FOREIGN KEY(public_user_id) REFERENCES public_users(id) ON DELETE SET NULL");
  console.log("Migrasi akun publik selesai.");
} finally { await db.end(); }

import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
if (!existsSync(".env"))
  writeFileSync(".env", readFileSync(".env.example", "utf8"));
dotenv.config({ quiet: true });
const db = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "lelang_bkkjateng",
});
try {
  await db.query(
    `CREATE TABLE IF NOT EXISTS admin_users (id INT PRIMARY KEY AUTO_INCREMENT,name VARCHAR(80) NOT NULL,email VARCHAR(150) NOT NULL UNIQUE,password_hash VARCHAR(200) NOT NULL,role VARCHAR(20) NOT NULL DEFAULT 'admin',active BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
  );
  await db.query(
    `CREATE TABLE IF NOT EXISTS admin_sessions (token_hash CHAR(64) PRIMARY KEY,user_id INT NOT NULL,expires_at DATETIME NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,INDEX(expires_at),FOREIGN KEY(user_id) REFERENCES admin_users(id) ON DELETE CASCADE)`,
  );
  const additions = {
    assets: {
      archived: "BOOLEAN NOT NULL DEFAULT FALSE",
      saleMethod: "VARCHAR(20) NOT NULL DEFAULT 'Lelang'",
    },
    interests: {
      status: "VARCHAR(20) NOT NULL DEFAULT 'baru'",
      admin_notes: "TEXT NULL",
      version: "INT NOT NULL DEFAULT 0",
      source: "VARCHAR(20) NOT NULL DEFAULT 'public'",
      created_by: "INT NULL",
    },
  };
  for (const [table, columns] of Object.entries(additions))
    for (const [column, type] of Object.entries(columns)) {
      const [rows] = await db.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?",
        [table, column],
      );
      if (!rows.length)
        await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
  await db.query(
    `CREATE TABLE IF NOT EXISTS interest_history (id INT PRIMARY KEY AUTO_INCREMENT,interest_id INT NOT NULL,admin_id INT NOT NULL,status VARCHAR(20) NOT NULL,notes TEXT NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(interest_id) REFERENCES interests(id) ON DELETE CASCADE,FOREIGN KEY(admin_id) REFERENCES admin_users(id))`,
  );
  const email = (process.env.ADMIN_EMAIL || "admin@bkkjateng.local")
    .trim()
    .toLowerCase();
  const [existing] = await db.execute(
    "SELECT id FROM admin_users WHERE email=?",
    [email],
  );
  if (existing.length) {
    console.log("Migrasi admin selesai; akun yang ada tidak diubah.");
  } else {
    const password =
      process.env.ADMIN_PASSWORD || randomBytes(18).toString("base64url");
    if (password.length < 12 || password.length > 128)
      throw new Error("ADMIN_PASSWORD harus 12–128 karakter.");
    const salt = randomBytes(16).toString("hex");
    const key = await promisify(scrypt)(password, salt, 64);
    await db.execute(
      "INSERT INTO admin_users(name,email,password_hash) VALUES (?,?,?)",
      [
        process.env.ADMIN_NAME || "Administrator BKK Jateng",
        email,
        salt + ":" + key.toString("hex"),
      ],
    );
    if (!process.env.ADMIN_EMAIL)
      appendFileSync(".env", `\nADMIN_EMAIL=${email}\n`);
    if (!process.env.ADMIN_PASSWORD)
      appendFileSync(".env", `ADMIN_PASSWORD=${password}\n`);
    console.log(
      "Akun admin dibuat. Email dan password awal tersedia pada .env lokal (tidak dicetak ke log).",
    );
  }
} finally {
  await db.end();
}

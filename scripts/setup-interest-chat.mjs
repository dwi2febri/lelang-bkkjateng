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
  await db.query(`CREATE TABLE IF NOT EXISTS interest_messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    interest_id INT NOT NULL,
    sender_role ENUM('admin','public') NOT NULL,
    admin_id INT NULL,
    public_user_id INT NULL,
    body VARCHAR(2000) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX interest_messages_cursor (interest_id,id),
    FOREIGN KEY (interest_id) REFERENCES interests(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,
    FOREIGN KEY (public_user_id) REFERENCES public_users(id) ON DELETE SET NULL
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS interest_chat_reads (
    interest_id INT NOT NULL,
    public_user_id INT NOT NULL,
    last_read_message_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (interest_id,public_user_id),
    FOREIGN KEY (interest_id) REFERENCES interests(id) ON DELETE CASCADE,
    FOREIGN KEY (public_user_id) REFERENCES public_users(id) ON DELETE CASCADE
  )`);
  console.log("Migrasi chat pengajuan selesai.");
} finally { await db.end(); }

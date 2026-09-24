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
  await db.query(
    "CREATE TABLE IF NOT EXISTS guide_content (id INT PRIMARY KEY, title VARCHAR(150) NOT NULL, blocks JSON NOT NULL, version INT NOT NULL DEFAULT 1, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)",
  );
  await db.query(
    "CREATE TABLE IF NOT EXISTS guide_images (id CHAR(36) PRIMARY KEY, mime VARCHAR(30) NOT NULL, data LONGBLOB NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
  );
  const blocks = [
    {
      type: "text",
      heading: "Temukan aset",
      text: "Gunakan kategori, lokasi, dan harga untuk menemukan aset yang sesuai.",
    },
    {
      type: "text",
      heading: "Pelajari dan konfirmasi",
      text: "Periksa dokumen, kondisi fisik, jadwal, dan persyaratan dengan petugas melalui formulir minat.",
    },
    {
      type: "text",
      heading: "Ikuti prosedur resmi",
      text: "Pendaftaran, verifikasi, uang jaminan, dan penawaran mengikuti kanal penyelenggara yang tercantum di pengumuman resmi.",
    },
    {
      type: "text",
      heading: "Selesaikan kewajiban",
      text: "Jika ditetapkan sebagai pemenang, ikuti ketentuan pelunasan dan pengurusan dokumen dari penyelenggara.",
    },
  ];
  await db.execute(
    "INSERT IGNORE INTO guide_content(id,title,blocks) VALUES(1,?,?)",
    ["Panduan Lelang", JSON.stringify(blocks)],
  );
  console.log("Halaman panduan dan penyimpanan gambar siap.");
} finally {
  await db.end();
}

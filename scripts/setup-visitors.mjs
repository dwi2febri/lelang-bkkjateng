import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });
const db = await mysql.createConnection({ host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'lelang_bkkjateng' });
try {
  await db.query('CREATE TABLE IF NOT EXISTS site_visits (visitor_id CHAR(36) NOT NULL, visit_date DATE NOT NULL, PRIMARY KEY(visitor_id, visit_date), INDEX visit_day(visit_date))');
  console.log('Tabel pengunjung siap.');
} finally { await db.end(); }

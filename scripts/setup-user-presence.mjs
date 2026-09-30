import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({quiet:true});
const db=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'lelang_bkkjateng'});
try {
  await db.query(`CREATE TABLE IF NOT EXISTS user_presence (
    visitor_hash CHAR(64) NOT NULL,
    kind ENUM('internal','external') NOT NULL,
    user_id INT NULL,
    session_hash CHAR(64) NULL,
    name VARCHAR(80) NULL,
    applicant_name VARCHAR(80) NULL,
    ip VARCHAR(45) NOT NULL,
    path VARCHAR(250) NOT NULL,
    first_seen DATETIME NOT NULL,
    last_seen DATETIME NOT NULL,
    PRIMARY KEY(visitor_hash,kind), INDEX presence_seen(kind,last_seen)
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS user_activity (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    visitor_hash CHAR(64) NOT NULL, kind ENUM('internal','external') NOT NULL,
    user_id INT NULL, name VARCHAR(80) NULL, identity VARCHAR(20) NOT NULL,
    ip VARCHAR(45) NOT NULL, path VARCHAR(250) NOT NULL,
    action VARCHAR(30) NOT NULL, occurred_at DATETIME NOT NULL,
    INDEX activity_time(kind,occurred_at,id), INDEX activity_visitor(visitor_hash)
  )`);
  console.log('Tabel log user dan riwayat aktivitas siap.');
} finally { await db.end(); }

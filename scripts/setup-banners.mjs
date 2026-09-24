import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
dotenv.config({quiet:true});
const db=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'lelang_bkkjateng'});
try {
 await db.query('CREATE TABLE IF NOT EXISTS banner_content (id INT PRIMARY KEY, slides JSON NOT NULL, version INT NOT NULL DEFAULT 1, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)');
 await db.query('CREATE TABLE IF NOT EXISTS banner_images (id CHAR(36) PRIMARY KEY, mime VARCHAR(30) NOT NULL, data LONGBLOB NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
 const slides=JSON.parse(readFileSync(new URL('../apps/web/src/features/banner/defaults.json',import.meta.url),'utf8'));
 await db.execute('INSERT IGNORE INTO banner_content(id,slides) VALUES(1,?)',[JSON.stringify(slides)]);
 console.log('Pengaturan banner siap; konten lama tidak ditimpa.');
} finally {await db.end();}

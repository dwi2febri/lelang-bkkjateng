import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import {readFileSync} from 'node:fs';
dotenv.config({quiet:true});
const db=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'lelang_bkkjateng'});
try {
 await db.query('CREATE TABLE IF NOT EXISTS asset_categories (name VARCHAR(30) PRIMARY KEY, label VARCHAR(80) NOT NULL, icon VARCHAR(30) NOT NULL, showHome BOOLEAN NOT NULL DEFAULT TRUE, sortOrder INT NOT NULL DEFAULT 0, version INT NOT NULL DEFAULT 1)');
 const defaults=JSON.parse(readFileSync(new URL('../apps/web/src/features/categories/defaults.json',import.meta.url),'utf8'));
 for(const c of defaults) await db.execute('INSERT IGNORE INTO asset_categories(name,label,icon,showHome,sortOrder) VALUES(?,?,?,?,?)',[c.name,c.label,c.icon,c.showHome,c.sortOrder]);
 await db.query("INSERT IGNORE INTO asset_categories(name,label,icon) SELECT DISTINCT category,category,'building' FROM assets");
 console.log('Master kategori siap; data lama tetap dipertahankan.');
} finally {await db.end();}

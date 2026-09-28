import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config({quiet:true});
const db=await mysql.createConnection({host:process.env.DB_HOST||"127.0.0.1",port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||"root",password:process.env.DB_PASSWORD||"",database:process.env.DB_NAME||"lelang_bkkjateng"});
try {
 const [columns]=await db.query("SHOW COLUMNS FROM asset_categories LIKE 'settings'");
 if(!columns.length) await db.query("ALTER TABLE asset_categories ADD COLUMN settings JSON NULL");
 console.log("Pengaturan kategori siap; data aset lama dipertahankan.");
} finally {await db.end();}

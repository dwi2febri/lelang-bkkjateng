import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import {readFileSync} from 'node:fs';
dotenv.config({quiet:true});
const db=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'lelang_bkkjateng'});
try {
 const [columns]=await db.query("SHOW COLUMNS FROM assets LIKE 'province'");
 if(!columns.length) await db.query('ALTER TABLE assets ADD COLUMN province VARCHAR(60) NULL AFTER city');
 for (const column of ['district', 'village']) {
   const [existing] = await db.query('SHOW COLUMNS FROM assets LIKE ?', [column]);
   if (!existing.length) await db.query(`ALTER TABLE assets ADD COLUMN ${column} VARCHAR(100) NULL`);
 }
 // Only backfill known Central Java locations; leave other locations for admin review.
 const cities=['Semarang','Surakarta','Karanganyar','Banyumas','Pekalongan','Kendal','Boyolali','Sukoharjo','Wonogiri','Sragen','Klaten','Magelang','Temanggung','Wonosobo','Purworejo','Kebumen','Cilacap','Purbalingga','Banjarnegara','Batang','Pemalang','Tegal','Brebes','Demak','Grobogan','Kudus','Jepara','Pati','Rembang','Blora','Salatiga'];
 await db.execute(`UPDATE assets SET province='Jawa Tengah' WHERE province IS NULL AND city IN (${cities.map(()=>'?').join(',')})`,cities);
 console.log('Kolom provinsi siap; lokasi yang belum dikenali perlu dilengkapi admin.');
} finally {await db.end();}

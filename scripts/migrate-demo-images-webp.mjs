// Only change the format requested from the demo image provider; keep image IDs and sizing.
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({quiet:true});
const db = await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'lelang_bkkjateng'});
function webp(value) {
  if (typeof value !== 'string') return value;
  try {
    const url = new URL(value);
    if (url.hostname !== 'images.unsplash.com' || url.protocol !== 'https:') return value;
    url.searchParams.delete('auto');
    url.searchParams.set('fm', 'webp');
    return url.toString();
  } catch { return value; }
}
let changed = 0;
try {
  await db.beginTransaction();
  for (const [table, column] of [['assets','image'], ['asset_photos','url']]) {
    const [rows] = await db.query(`SELECT id,${column} value FROM ${table} FOR UPDATE`);
    for (const row of rows) {
      const next = webp(row.value);
      if (next === row.value) continue;
      await db.execute(`UPDATE ${table} SET ${column}=? WHERE id=?`, [next,row.id]);
      changed++;
    }
  }
  const [banners] = await db.query('SELECT id,slides FROM banner_content FOR UPDATE');
  for (const row of banners) {
    const slides = typeof row.slides === 'string' ? JSON.parse(row.slides) : row.slides;
    const next = slides.map(slide => ({...slide,image:webp(slide.image)}));
    if (JSON.stringify(next) === JSON.stringify(slides)) continue;
    await db.execute('UPDATE banner_content SET slides=?,version=version+1 WHERE id=?',[JSON.stringify(next),row.id]);
    changed++;
  }
  await db.commit();
  console.log(`${changed} referensi gambar contoh diperbarui ke WebP.`);
} catch (error) { await db.rollback(); throw error; }
finally { await db.end(); }

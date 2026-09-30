import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({quiet:true});
// Match both code and slug so this command only updates known seeds.
const originalSlugs = ['rumah-banyumanik','rumah-colomadu','ruko-purwokerto','tanah-ungaran','rumah-solo','ruko-pekalongan','gudang-kendal','kendaraan-semarang'];
const known = new Map(originalSlugs.map((slug,index)=>[`BKK-${String(index+1).padStart(4,'0')}`,slug]));
for (const [code,slug] of [
 ['DEMO-JB-001','demo-jual-beli-rumah-tembalang'],
 ['DEMO-JB-002','demo-jual-beli-ruko-laweyan'],
 ['DEMO-JB-003','demo-jual-beli-tanah-kendal'],
 ['DEMO-CS-001','demo-cessie-agunan-rumah-banyumas'],
 ['DEMO-CS-002','demo-cessie-agunan-ruko-pekalongan'],
 ['DEMO-CS-003','demo-cessie-agunan-tanah-karanganyar'],
]) known.set(code,slug);
const db = await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'lelang_bkkjateng'});
try {
 await db.beginTransaction();
 const [products] = await db.query("SELECT id,code FROM credit_products WHERE code IN ('migunani','joglo') AND active=1");
 const ids = new Map(products.map(product=>[product.code,product.id]));
 if(ids.size!==2) throw new Error('Produk BKK Migunani dan BKK Joglo harus tersedia dan aktif. Jalankan npm run db:credit-products terlebih dahulu.');
 const [assets] = await db.query('SELECT id,code,slug,category,creditProductId FROM assets FOR UPDATE');
 const counts = {migunani:0,joglo:0};
 let changed = 0;
 for(const asset of assets) {
  const extra = /^DEMO-EXT-(\d{3})$/.exec(asset.code);
  if(known.get(asset.code)!==asset.slug && !(extra && asset.slug===`demo-katalog-tambahan-${extra[1]}`)) continue;
  const code = asset.category==='Kendaraan'?'migunani':'joglo';
  counts[code]++;
  if(asset.creditProductId===ids.get(code)) continue;
  await db.execute('UPDATE assets SET creditProductId=? WHERE id=?',[ids.get(code),asset.id]);
  changed++;
 }
 await db.commit();
 console.log(`Produk kredit dummy siap: ${counts.migunani} BKK Migunani, ${counts.joglo} BKK Joglo; ${changed} aset diperbarui.`);
} catch(error) {
 await db.rollback();
 throw error;
} finally {await db.end();}

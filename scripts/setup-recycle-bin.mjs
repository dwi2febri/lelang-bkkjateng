import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({quiet:true});
const db=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'lelang_bkkjateng'});
try {
  for (const table of ['assets','interests']) {
    const [columns]=await db.query(`SHOW COLUMNS FROM ${table} LIKE 'deleted_at'`);
    if (!columns.length) await db.query(`ALTER TABLE ${table} ADD COLUMN deleted_at DATETIME NULL, ADD INDEX ${table}_deleted_at (deleted_at)`);
  }
  const [columns]=await db.query("SHOW COLUMNS FROM credit_products LIKE 'used_at'");
  if (!columns.length) await db.query('ALTER TABLE credit_products ADD COLUMN used_at DATETIME NULL');
  // Record usage in the database, including imports and later reassignment of assets.
  for (const event of ['INSERT','UPDATE']) {
    const name=`assets_credit_usage_${event.toLowerCase()}`;
    const [triggers]=await db.execute('SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND TRIGGER_NAME=?',[name]);
    if (!triggers.length) await db.query(`CREATE TRIGGER ${name} AFTER ${event} ON assets FOR EACH ROW BEGIN IF NEW.creditProductId IS NOT NULL THEN UPDATE credit_products SET used_at=COALESCE(used_at,NOW()) WHERE id=NEW.creditProductId; END IF; END`);
  }
  await db.query('UPDATE credit_products p SET used_at=COALESCE(used_at,NOW()) WHERE EXISTS (SELECT 1 FROM assets a WHERE a.creditProductId=p.id)');
  const [constraints]=await db.query("SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='assets' AND CONSTRAINT_NAME='assets_category_fk'");
  if (!constraints.length) await db.query('ALTER TABLE assets ADD CONSTRAINT assets_category_fk FOREIGN KEY (category) REFERENCES asset_categories(name)');
  console.log('Recycle Bin dan perlindungan kategori/produk kredit siap. Data lama tetap tersimpan.');
} finally {await db.end();}

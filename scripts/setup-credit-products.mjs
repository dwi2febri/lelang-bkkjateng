import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import {readFileSync} from 'node:fs';
dotenv.config({quiet:true});
const db=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'lelang_bkkjateng'});
try {
 await db.query(`CREATE TABLE IF NOT EXISTS credit_products (
 id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(40) NOT NULL UNIQUE, name VARCHAR(100) NOT NULL,
 description VARCHAR(1000) NOT NULL DEFAULT '', requiresEmployee BOOLEAN NOT NULL DEFAULT FALSE,
 rules JSON NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, version INT NOT NULL DEFAULT 0,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
 const [columns]=await db.query("SHOW COLUMNS FROM assets LIKE 'creditProductId'");
 if(!columns.length) await db.query('ALTER TABLE assets ADD COLUMN creditProductId INT NULL, ADD CONSTRAINT assets_credit_product_fk FOREIGN KEY(creditProductId) REFERENCES credit_products(id)');
 const seeds=JSON.parse(readFileSync(new URL('./data/credit-products.json',import.meta.url),'utf8'));
 for(const product of seeds) await db.execute('INSERT IGNORE INTO credit_products(code,name,requiresEmployee,rules) VALUES(?,?,?,?)',[product.code,product.name,product.requiresEmployee,JSON.stringify(product.rules)]);
 console.log('Master produk kredit siap. Produk yang sudah ada tidak ditimpa.');
} finally {await db.end();}

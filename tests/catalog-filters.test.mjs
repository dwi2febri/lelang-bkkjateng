import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({quiet:true});
const api='http://127.0.0.1:3001/api/assets';
test('metode, tag, rentang harga, dan tanggal WIB dapat difilter bersamaan',async()=>{
 const db=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'lelang_bkkjateng'});
 const prefix='FILTER-'+Date.now(); const ids=[];
 try {
  const fixtures=[['Jual Beli',100000000,150000000,1,'2032-05-10 00:00:00'],['Lelang',200000000,250000000,0,'2032-05-10 23:59:59'],['Cessie',300000000,null,1,'2032-05-11 00:00:00']];
  for(const [index,fixture] of fixtures.entries()){
   const [method,price,oldPrice,featured,date]=fixture;
   const [result]=await db.execute('INSERT INTO assets (slug,code,title,category,city,address,price,oldPrice,land,building,bedrooms,image,auctionDate,certificate,description,featured,saleMethod) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[prefix.toLowerCase()+'-'+index,prefix+'-'+index,'Aset uji filter','Rumah','Semarang','Alamat uji filter',price,oldPrice,100,80,2,'https://example.com/test.jpg',date,'SHM','Data uji filter sementara',featured,method]);ids.push(result.insertId);
  }
  const find=async(params)=>{const response=await fetch(api+'?'+new URLSearchParams({q:prefix,...params}));assert.equal(response.status,200);return (await response.json()).data;};
  for(const [i,method] of ['Jual Beli','Lelang','Cessie'].entries())assert.deepEqual((await find({saleMethod:method})).map(a=>a.id),[ids[i]]);
  assert.deepEqual((await find({saleMethod:'Lelang',tag:'discount',minPrice:'200000000',maxPrice:'200000000',dateFrom:'2032-05-10',dateTo:'2032-05-10'})).map(a=>a.id),[ids[1]]);
  assert.equal((await find({dateFrom:'2032-05-10',dateTo:'2032-05-10'})).length,2);
  assert.equal((await find({tag:'featured'})).length,2);
  assert.equal((await find({tag:'discount'})).length,2);
  assert.equal((await find({minPrice:'300000001'})).length,0);
  assert.equal((await find({maxPrice:'0'})).length,0);
  for(const query of ['minPrice=500&maxPrice=100','dateFrom=2032-05-11&dateTo=2032-05-10','dateFrom=2032-02-30','saleMethod=invalid','tag=invalid','minPrice=-1','dateTo=2032-05-10T00:00:00Z'])assert.equal((await fetch(api+'?'+query)).status,400,query);
 } finally {for(const id of ids)await db.execute('DELETE FROM assets WHERE id=? AND code LIKE ?',[id,prefix+'%']);await db.end();}
});
test('harga berseparator tetap berupa angka di URL dan filter tersimpan setelah refresh',async()=>{
 const {priceDigits,formatPriceInput}=await import('../apps/web/src/lib/price.ts');
 const {catalogHref}=await import('../apps/web/src/features/catalog/types/page.ts');
 assert.equal(formatPriceInput('500000000'),'500.000.000');assert.equal(priceDigits('Rp 1.250.000.000'),'1250000000');assert.equal(formatPriceInput(''),'');
 const filters={saleMethod:'Cessie',tag:'featured',minPrice:priceDigits('100.000.000'),maxPrice:priceDigits('500.000.000'),dateFrom:'2032-05-10',dateTo:'2032-05-11'};
 const path=catalogHref(filters);const params=new URL(path,'http://localhost').searchParams;
 for(const [key,value] of Object.entries(filters))assert.equal(params.get(key),value);
 const html=await(await fetch('http://127.0.0.1:3000'+path)).text();
 assert.match(html,/value="100\.000\.000"/);assert.match(html,/value="500\.000\.000"/);assert.match(html,/name="saleMethod" value="Cessie"/);assert.match(html,/name="tag" value="featured"/);assert.match(html,/value="2032-05-11"/);
});

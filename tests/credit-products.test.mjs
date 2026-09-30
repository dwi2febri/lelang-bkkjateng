import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({quiet:true});
const api=process.env.TEST_API_URL||'http://127.0.0.1:3001/api';
test('master kredit: validasi aturan, otorisasi, pemilihan aset, pembaruan dan simulasi publik',async()=>{
 const db=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'lelang_bkkjateng'});
 const suffix=randomBytes(6).toString('hex'),token=randomBytes(32).toString('hex');let adminId,productId,assetId;
 const headers={'Content-Type':'application/json','X-Requested-With':'BKKAdmin',Origin:'http://localhost:3000',Cookie:`bkk_admin_session=${token}`};
 const send=(path,body,method='POST')=>fetch(api+path,{method,headers,body:JSON.stringify(body)});
 const product={code:'test-'+suffix,name:'Produk Kredit Uji '+suffix,description:'Produk uji sementara',active:true,requiresEmployee:false,version:0,rules:[{audience:'all',minMonths:1,maxMonths:36,flatRate:9,annuityRate:15},{audience:'all',minMonths:37,maxMonths:null,flatRate:null,annuityRate:18}]};
 try {
  const [admin]=await db.execute('INSERT INTO admin_users(name,email,password_hash) VALUES(?,?,?)',['Credit test','credit-'+suffix+'@example.test','no-login']);adminId=admin.insertId;
  await db.execute('INSERT INTO admin_sessions(token_hash,user_id,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 HOUR))',[createHash('sha256').update(token).digest('hex'),adminId]);
  assert.equal((await fetch(api+'/admin/credit-products')).status,401);
  const invalid=structuredClone(product);invalid.rules[1].minMonths=36;
  assert.equal((await send('/admin/credit-products',invalid)).status,400);
  assert.equal((await send('/admin/credit-products',{...product,rules:[{audience:'all',minMonths:1,maxMonths:null,flatRate:null,annuityRate:null}]})).status,400);
  const created=await send('/admin/credit-products',product);assert.equal(created.status,201,await created.clone().text());productId=(await created.json()).id;
  assert.equal((await send('/admin/credit-products',product)).status,409);
  const list=await (await fetch(api+'/admin/credit-products',{headers})).json();assert.ok(list.find(row=>row.id===productId));assert.ok(list.find(row=>row.code==='makaryo'));
  const input={creditProductId:productId,slug:'credit-'+suffix,code:'CREDIT-'+suffix.toUpperCase(),title:'Aset uji kredit',category:'Rumah',saleMethod:'Jual Beli',province:'Jawa Tengah',city:'Semarang',address:'Alamat uji kredit',price:100000000,oldPrice:null,land:100,building:80,bedrooms:2,image:'https://example.com/test.jpg',photos:['https://example.com/test.jpg'],details:{},auctionDate:null,certificate:'SHM',description:'Deskripsi aset uji produk kredit',featured:false};
  assert.equal((await send('/admin/assets',{...input,creditProductId:2147483647})).status,400);
  const asset=await send('/admin/assets',input);assert.equal(asset.status,201,await asset.clone().text());assetId=(await asset.json()).id;
  const detail=await (await fetch(api+'/assets/'+input.slug)).json();assert.equal(detail.creditProduct.name,product.name);assert.deepEqual(detail.creditProduct.rules,product.rules);
  const page=await fetch('http://127.0.0.1:3000/katalog-aset/'+input.slug);assert.equal(page.status,200);const html=await page.text();assert.ok(html.includes('Ajukan '+product.name));assert.ok(html.includes('Bunga per tahun'));
  const edit={...product,name:'Produk berubah '+suffix,rules:[{audience:'all',minMonths:1,maxMonths:null,flatRate:6,annuityRate:null}]};
  assert.equal((await send('/admin/credit-products/'+productId,edit,'PUT')).status,200);
  assert.equal((await send('/admin/credit-products/'+productId,edit,'PUT')).status,409);
  const updated=await (await fetch(api+'/assets/'+input.slug)).json();assert.equal(updated.creditProduct.name,edit.name);assert.equal(updated.creditProduct.rules[0].flatRate,6);
  assert.equal((await send('/admin/credit-products/'+productId,{...edit,version:1,active:false},'PUT')).status,200);
  assert.equal((await send('/admin/assets',{...input,slug:input.slug+'-new',code:input.code+'-NEW'})).status,400);
  assert.equal((await send('/admin/assets/'+assetId,input,'PUT')).status,200,'Existing asset may retain an inactive product');
  assert.equal((await send('/admin/assets/'+assetId,{...input,creditProductId:null},'PUT')).status,200);
  const cleared=await (await fetch(api+'/assets/'+input.slug)).json();assert.equal(cleared.creditProduct,null);
 }finally{
  if(assetId){await db.execute('DELETE FROM asset_photos WHERE asset_id=?',[assetId]);await db.execute('DELETE FROM assets WHERE id=?',[assetId]);}
  if(productId)await db.execute('DELETE FROM credit_products WHERE id=?',[productId]);
  if(adminId)await db.execute('DELETE FROM admin_users WHERE id=?',[adminId]);
  await db.end();
 }
});

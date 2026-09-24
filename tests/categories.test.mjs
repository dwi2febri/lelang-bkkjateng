import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({quiet:true});
const base='http://127.0.0.1:3000';
const headers={'Content-Type':'application/json','X-Requested-With':'BKKAdmin',Origin:base};
test('master kategori: auth, tambah, ikon, visibilitas, konflik versi dan filter dinamis',async()=>{
 assert.equal((await fetch(base+'/api/admin/categories',{method:'POST',headers,body:'{}'})).status,401);
 assert.equal((await fetch(base+'/master-kategori',{redirect:'manual'})).status,307);
 const login=await fetch(base+'/api/auth/login',{method:'POST',headers,body:JSON.stringify({email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD})});
 assert.equal(login.status,200);
 const Cookie=login.headers.get('set-cookie').split(';')[0];const auth={...headers,Cookie};
 const db=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'lelang_bkkjateng'});
 const name='Test'+Date.now();let assetId;
 const create=body=>fetch(base+'/api/admin/categories',{method:'POST',headers:auth,body:JSON.stringify(body)});
 const draft={name,label:'Apartemen uji',icon:'auction',showHome:true,sortOrder:99,version:0};
 try {
  assert.equal((await create({...draft,icon:'invalid'})).status,400);
  assert.equal((await create({...draft,label:'   '})).status,400);
  assert.equal((await create({...draft,name:'Semua'})).status,400);
  assert.equal((await create(draft)).status,201);
  assert.equal((await create(draft)).status,409);
  let rows=await (await fetch(base+'/api/categories')).json();
  let row=rows.find(c=>c.name===name);assert.equal(row.icon,'auction');assert.equal(row.showHome,true);
  const {name:_,...fields}=row;
  const update=body=>fetch(base+'/api/admin/categories/'+name,{method:'PUT',headers:auth,body:JSON.stringify(body)});
  assert.equal((await update({...fields,label:'Nama baru',showHome:false,icon:'key'})).status,200);
  assert.equal((await update(fields)).status,409);
  rows=await (await fetch(base+'/api/categories')).json();row=rows.find(c=>c.name===name);assert.equal(row.showHome,false);assert.equal(row.label,'Nama baru');assert.equal(row.icon,'key');
  const body={slug:name.toLowerCase(),code:name.toUpperCase(),title:'Aset kategori baru',category:name,saleMethod:'Lelang',province:'Jawa Tengah',city:'Semarang',address:'Alamat untuk pengujian',price:100000000,oldPrice:null,land:100,building:80,bedrooms:2,image:'https://example.com/image.jpg',auctionDate:'2027-10-15T03:00:00Z',certificate:'SHM',description:'Aset pengujian kategori dinamis',featured:false};
  const saved=await fetch(base+'/api/admin/assets',{method:'POST',headers:auth,body:JSON.stringify(body)});assert.equal(saved.status,201);const savedAsset=await saved.json();assetId=savedAsset.id;assert.equal(savedAsset.province,'Jawa Tengah');
  const edited=await fetch(base+'/api/admin/assets/'+assetId,{method:'PUT',headers:auth,body:JSON.stringify({...body,province:'Daerah Khusus Ibukota Jakarta',city:'Kota Jakarta Pusat'})});assert.equal(edited.status,200);assert.equal((await edited.json()).province,'Daerah Khusus Ibukota Jakarta');
  const filtered=await fetch(base+'/api/assets?category='+name);assert.equal(filtered.status,200);const data=await filtered.json();assert.ok(data.data.some(a=>a.id===assetId));
  assert.equal((await fetch(base+'/master-kategori',{headers:{Cookie}})).status,200);
 } finally {
  if(assetId)await db.execute('DELETE FROM assets WHERE id=?',[assetId]);
  await db.execute('DELETE FROM asset_categories WHERE name=?',[name]);await db.end();
  await fetch(base+'/api/auth/logout',{method:'POST',headers:auth});
 }
});

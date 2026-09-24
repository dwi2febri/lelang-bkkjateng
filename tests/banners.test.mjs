import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({quiet:true});
const base='http://127.0.0.1:3000';
const headers={'Content-Type':'application/json','X-Requested-With':'BKKAdmin',Origin:base};
test('banner: proteksi, gambar upload, validasi tautan, penyimpanan dan konflik versi',async()=>{
 assert.equal((await fetch(base+'/api/admin/banners',{method:'PUT',headers,body:'{}'})).status,401);
 assert.equal((await fetch(base+'/kelola-banner',{redirect:'manual'})).status,307);
 const login=await fetch(base+'/api/auth/login',{method:'POST',headers,body:JSON.stringify({email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD})});
 assert.equal(login.status,200);
 const Cookie=login.headers.get('set-cookie').split(';')[0];const auth={...headers,Cookie};
 const db=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'lelang_bkkjateng'});
 const [rows]=await db.query('SELECT * FROM banner_content WHERE id=1');const original=rows[0];let imageId;
 const save=body=>fetch(base+'/api/admin/banners',{method:'PUT',headers:auth,body:JSON.stringify(body)});
 try {
  const current=await (await fetch(base+'/api/banners')).json();
  assert.ok(current.slides.length);
  for(const href of ['javascript:alert(1)','//example.com','/\\example.com']) {
   assert.equal((await save({...current,slides:[{...current.slides[0],href}]})).status,400);
  }
  assert.equal((await save({...current,slides:[]})).status,400);
  const bad=new FormData();bad.append('image',new Blob(['not an image']), 'bad.png');
  assert.equal((await fetch(base+'/api/admin/banners/images',{method:'POST',headers:{Cookie,'X-Requested-With':'BKKAdmin',Origin:base},body:bad})).status,400);
  const file=new FormData();file.append('image',new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jfZkAAAAASUVORK5CYII=','base64')],{type:'image/png'}),'test.png');
  const uploaded=await fetch(base+'/api/admin/banners/images',{method:'POST',headers:{Cookie,'X-Requested-With':'BKKAdmin',Origin:base},body:file});assert.equal(uploaded.status,201);
  const {url}=await uploaded.json();imageId=url.split('/').pop();
  const image=await fetch(base+url);assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');
  const changed={...current,slides:[{...current.slides[0],image:url,title:'Uji banner',action:'Buka katalog',href:'/katalog-aset?category=Rumah'}]};
  const saved=await save(changed);assert.equal(saved.status,200);
  const actual=await (await fetch(base+'/api/banners')).json();assert.deepEqual(actual.slides,changed.slides);
  assert.equal((await save(changed)).status,409);
  assert.equal((await fetch(base+'/kelola-banner',{headers:{Cookie}})).status,200);
 } finally {
  await db.execute('UPDATE banner_content SET slides=?,version=?,updated_at=? WHERE id=1',[typeof original.slides==='string'?original.slides:JSON.stringify(original.slides),original.version,original.updated_at]);
  if(imageId)await db.execute('DELETE FROM banner_images WHERE id=?',[imageId]);
  await db.end();await fetch(base+'/api/auth/logout',{method:'POST',headers:auth});
 }
});

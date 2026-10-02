import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {readFile,readdir,unlink} from 'node:fs/promises';
import {basename,resolve} from 'node:path';
import {createRequire} from 'node:module';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import JSZip from 'jszip';
import sharp from 'sharp';
const require=createRequire(import.meta.url);
const {readWorkbook}=require('../apps/api/dist/excel-import/read-workbook.js');
const {AssetImportController}=require('../apps/api/dist/asset-import.controller.js');
const {defaultCategorySettings}=require('../apps/api/dist/category-settings.js');
dotenv.config({quiet:true});
const api=process.env.TEST_API_URL||'http://127.0.0.1:3001/api';
test('Excel aset: template 5 kategori, foto, validasi, transaksi dan otorisasi',async()=>{
 const db=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'lelang_bkkjateng',decimalNumbers:true});
 const suffix=randomBytes(4).toString('hex').toUpperCase(),token=randomBytes(32).toString('hex');let adminId,newCategory;
 const codes=[],createdFiles=[];
 const headers={'X-Requested-With':'BKKAdmin',Origin:'http://localhost:3000',Cookie:`bkk_admin_session=${token}`};
 const checksum=buffer=>createHash('sha256').update(buffer).digest('hex');
 const send=(path,buffer,hash,customHeaders=headers)=>{
  const form=new FormData();form.append('file',new Blob([buffer]),'aset.xlsx');if(hash!==undefined)form.append('checksum',hash);
  return fetch(api+'/admin/asset-import/'+path,{method:'POST',headers:customHeaders,body:form});
 };
 try {
  const [admin]=await db.execute('INSERT INTO admin_users(name,email,password_hash) VALUES(?,?,?)',['Excel import test','excel-'+suffix+'@example.test','no-login']);adminId=admin.insertId;
  await db.execute('INSERT INTO admin_sessions(token_hash,user_id,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 HOUR))',[createHash('sha256').update(token).digest('hex'),adminId]);
  assert.equal((await fetch(api+'/admin/asset-import/template')).status,401);
  const template=await fetch(api+'/admin/asset-import/template',{headers});assert.equal(template.status,200);
  assert.match(template.headers.get('content-disposition'),/attachment/);
  const source=Buffer.from(await template.arrayBuffer()),book=await readWorkbook(source);
  assert.equal(book.worksheets[0].name,'Panduan');
  assert.equal(book.views[0].activeTab,0);
  assert.equal(book.getWorksheet('Foto'),undefined);
  const sheetNames=book.getWorksheet('_Kategori').getColumn(1).values.slice(2).filter(Boolean);
  assert.equal(sheetNames.length,5);assert.equal(book.getWorksheet('Data Aset'),undefined);
  const dataSheets=sheetNames.map(name=>book.getWorksheet(name));
  for(const sheet of dataSheets){const pictures=sheet.getImages();assert.ok(pictures[1].range.tl.nativeColOff-pictures[0].range.tl.nativeColOff>=pictures[0].range.ext.width*9525,'Example images must not overlap');}
  const field=(sheet,prefix)=>{let found;sheet.getRow(1).eachCell((cell,col)=>{if(String(cell.value).startsWith(prefix))found=col;});assert.ok(found,prefix);return sheet.getCell(2,found);};
  for(const sheet of dataSheets){assert.equal(sheet.actualRowCount,2);assert.equal(sheet.getCell('A1').value,'Nomor (angka)');assert.equal(sheet.getCell('A2').value,1);assert.equal(sheet.getRow(1).getCell(sheet.columnCount).value,'Foto aset (gambar)');assert.equal(sheet.getImages().length,2);assert.ok(sheet.getImages().every(image=>image.range.tl.nativeCol===sheet.columnCount-1&&image.range.tl.nativeRow===1));sheet.getRow(1).eachCell(cell=>assert.match(String(cell.value),/\((teks|angka|pilihan|tautan|tanggal dan jam|gambar)\)$/));assert.equal(field(sheet,'Metode penjualan').dataValidation.type,'list');}
  const vehicle=dataSheets.find(s=>s.name==='Kendaraan');assert.ok(vehicle);assert.equal(field(vehicle,'Transmisi').dataValidation.type,'list');assert.ok(!vehicle.getRow(1).values.some(v=>String(v).includes('Luas tanah')));
  const original=await send('preview',source);assert.equal(original.status,201,await original.clone().text());
  const orig=await original.json();assert.equal(orig.valid,true,JSON.stringify(orig.issues));assert.equal(orig.totalPhotos,10);
  for(const [index,sheet] of dataSheets.entries()){const code='EX-'+suffix+'-'+(index+1);codes.push(code);field(sheet,'Kode aset').value=code;}
  const house=dataSheets.find(s=>s.name==='Rumah Tinggal');
  house.getCell('A3').value=2; // Numbering a blank row must not create an empty asset.
  field(house,'Provinsi').value=null;
  field(house,'Metode penjualan').value='Lelang';
  field(house,'Jadwal lelang WIB').value=new Date('2026-12-15T10:00:00Z');
  field(house,'Jadwal lelang WIB').numFmt='yyyy-mm-dd hh:mm';
  field(vehicle,'AC (').value='Ya';
  // The cover follows the displayed position, not image insertion order.
  const pictures=house.getImages(),left=pictures[0].range.tl.nativeColOff,right=pictures[1].range.tl.nativeColOff;
  pictures[0].range.tl.nativeColOff=right;pictures[1].range.tl.nativeColOff=left;
  pictures[0].imageId=String(book.addImage({buffer:await sharp({create:{width:30,height:20,channels:3,background:'blue'}}).png().toBuffer(),extension:'png'}));
  pictures[1].imageId=String(book.addImage({buffer:await sharp({create:{width:30,height:20,channels:3,background:'red'}}).png().toBuffer(),extension:'png'}));
  const buffer=Buffer.from(await book.xlsx.writeBuffer());
  assert.equal((await send('preview',buffer,undefined,{})).status,401);
  assert.equal((await send('preview',buffer,undefined,{Cookie:headers.Cookie,Origin:'https://invalid.example'})).status,403);
  assert.equal((await send('preview',Buffer.from('not Excel'))).status,400);
  const unsupported=await JSZip.loadAsync(source);unsupported.file('xl/richData/test.xml','<root/>');
  assert.equal((await send('preview',await unsupported.generateAsync({type:'nodebuffer'}))).status,400);
  assert.equal((await send('commit',buffer,'invalid')).status,400);
  const invalid=await readWorkbook(buffer);field(invalid.getWorksheet(sheetNames[1]),'Harga aset').value=-1;
  const invalidBuffer=Buffer.from(await invalid.xlsx.writeBuffer());
  const invalidPreview=await (await send('preview',invalidBuffer)).json();assert.equal(invalidPreview.valid,false);assert.ok(invalidPreview.issues.some(i=>i.row===2&&i.sheet===sheetNames[1]));
  assert.equal((await send('commit',invalidBuffer,checksum(invalidBuffer))).status,400);
  const formulas=await readWorkbook(buffer);field(formulas.getWorksheet(sheetNames[0]),'Harga aset').value={formula:'1000000+1',result:1000001};
  const formulaPreview=await (await send('preview',Buffer.from(await formulas.xlsx.writeBuffer()))).json();assert.equal(formulaPreview.valid,false);assert.match(JSON.stringify(formulaPreview.issues),/rumus/);
  const missing=await readWorkbook(buffer);missing.getWorksheet(sheetNames[0]).getImages()[0].range.tl.nativeCol=0;
  const missingPreview=await (await send('preview',Buffer.from(await missing.xlsx.writeBuffer()))).json();assert.equal(missingPreview.valid,false);
  assert.ok(missingPreview.issues.some(i=>i.sheet===sheetNames[0]&&i.row===2));
  const invalidNumber=await readWorkbook(buffer);invalidNumber.getWorksheet(sheetNames[0]).getCell('A2').value=-1;
  assert.equal((await (await send('preview',Buffer.from(await invalidNumber.xlsx.writeBuffer()))).json()).valid,false);
  const tooMany=await readWorkbook(buffer),crowded=tooMany.getWorksheet(sheetNames[0]),picture=crowded.getImages()[0];
  for(let i=0;i<11;i++)crowded.addImage(Number(picture.imageId),{tl:{col:crowded.columnCount-1+0.02*i,row:1.2},ext:{width:10,height:10}});
  const crowdedPreview=await (await send('preview',Buffer.from(await tooMany.xlsx.writeBuffer()))).json();assert.equal(crowdedPreview.valid,false);assert.match(JSON.stringify(crowdedPreview.issues),/12 foto/);
  const invalidChoice=await readWorkbook(buffer);field(invalidChoice.getWorksheet('Kendaraan'),'Transmisi').value='Tidak ada';
  assert.equal((await (await send('preview',Buffer.from(await invalidChoice.xlsx.writeBuffer()))).json()).valid,false);
  const duplicate=await readWorkbook(buffer);field(duplicate.getWorksheet(sheetNames[1]),'Kode aset').value=codes[0];
  assert.equal((await (await send('preview',Buffer.from(await duplicate.xlsx.writeBuffer()))).json()).valid,false);
  const [before]=await db.execute('SELECT id FROM assets WHERE code IN (?,?,?,?,?)',codes);assert.equal(before.length,0);
  const validCheck=await (await send('preview',buffer)).json();assert.equal(validCheck.valid,true,JSON.stringify(validCheck.issues));
  // Force a failure after the first asset and its photos were written.
  const beforeFiles=await readdir(resolve('uploads/assets')).catch(()=>[]);
  let inserts=0;
  const adapter={query:async(sql,values=[])=>{const [rows]=await db.execute(sql,values);return rows;},pool:{getConnection:async()=>({beginTransaction:()=>db.beginTransaction(),commit:()=>db.commit(),rollback:()=>db.rollback(),release:()=>{},execute:async(sql,values)=>{if(sql.startsWith('INSERT INTO assets')&&++inserts===2)throw Error('Injected failure');return db.execute(sql,values);}})}};
  const controller=new AssetImportController(adapter);
  await assert.rejects(controller.commit({originalname:'aset.xlsx',size:buffer.length,buffer},checksum(buffer)),/Impor gagal/);
  assert.deepEqual((await readdir(resolve('uploads/assets'))).sort(),beforeFiles.sort(),'Rollback removes written photos');
  const [rolledBack]=await db.execute('SELECT id FROM assets WHERE code IN (?,?,?,?,?)',codes);assert.equal(rolledBack.length,0);
  const previewResponse=await send('preview',buffer);assert.equal(previewResponse.status,201,await previewResponse.clone().text());
  const preview=await previewResponse.json();assert.equal(preview.valid,true,JSON.stringify(preview.issues));assert.equal(preview.rows.length,5);assert.equal(preview.totalPhotos,10);
  assert.ok(preview.rows.every(row=>row.cover.startsWith('data:image/webp;base64,')&&row.photoCount===2));
  const imported=await send('commit',buffer,preview.checksum);assert.equal(imported.status,201,await imported.clone().text());
  const result=await imported.json();assert.equal(result.imported,5);assert.equal(result.photos,10);
  const [saved]=await db.execute('SELECT a.id,a.code,a.category,a.image,a.details,p.name AS product FROM assets a LEFT JOIN credit_products p ON p.id=a.creditProductId WHERE a.code IN (?,?,?,?,?)',codes);assert.equal(saved.length,5);
  for(const asset of saved){
   assert.equal(asset.product,asset.category==='Kendaraan'?'BKK Migunani':'BKK Joglo');
   const [gallery]=await db.execute('SELECT url,position FROM asset_photos WHERE asset_id=? ORDER BY position',[asset.id]);assert.equal(gallery.length,2);assert.equal(asset.image,gallery[0].url);
   for(const photo of gallery){createdFiles.push(resolve('uploads/assets',basename(photo.url)));const response=await fetch('http://127.0.0.1:3001'+photo.url);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/image\/webp/);}
   const detail=await (await fetch(api+'/assets/aset-'+asset.code.toLowerCase())).json();assert.equal(detail.photos.length,2);assert.equal(detail.creditProduct.name,asset.product);
   if(asset.category==='Kendaraan'){assert.equal(detail.details.attributes.brand,'Toyota');assert.ok(detail.details.facilities.includes('AC'));}
   if(asset.category==='Rumah'){const [date]=await db.execute("SELECT DATE_FORMAT(auctionDate,'%Y-%m-%d %H:%i') AS date FROM assets WHERE id=?",[asset.id]);assert.equal(date[0].date,'2026-12-15 10:00');const color=await sharp(await readFile(resolve('uploads/assets',basename(gallery[0].url)))).resize(1,1).raw().toBuffer();assert.ok(color[0]>200&&color[2]<30,'Leftmost red photo becomes cover');}
  }
  assert.equal((await send('commit',buffer,preview.checksum)).status,400,'Same file cannot create duplicates');
  // Next.js proxy also serves the workbook and accepts the multipart preview.
  const proxied=await fetch('http://127.0.0.1:3000/api/admin/asset-import/template',{headers});assert.equal(proxied.status,200);
  const proxyForm=new FormData();proxyForm.append('file',new Blob([source]),'template.xlsx');
  const proxyPreview=await fetch('http://127.0.0.1:3000/api/admin/asset-import/preview',{method:'POST',headers,body:proxyForm});assert.equal(proxyPreview.status,201,await proxyPreview.clone().text());assert.equal((await proxyPreview.json()).valid,true);
  // A newly created category appears immediately, including custom dropdown and facilities.
  newCategory='Excel '+suffix;
  const settings=defaultCategorySettings(newCategory,'general');settings.fields=[{key:'material',label:'Bahan utama',type:'select',unit:'',enabled:true,required:true,showDetail:true,summary:false,options:Array.from({length:30},(_,i)=>'Pilihan bahan '+i)}];settings.facilities=['Dokumen lengkap'];
  await db.execute('INSERT INTO asset_categories(name,label,icon,showHome,sortOrder,settings) VALUES(?,?,?,?,?,?)',[newCategory,'Foto','tools',false,998,JSON.stringify(settings)]);
  const expanded=await readWorkbook(Buffer.from(await (await fetch(api+'/admin/asset-import/template',{headers})).arrayBuffer()));
  const added=expanded.getWorksheet('Foto 2');assert.ok(added,'Reserved sheet name is resolved');assert.equal(field(added,'Bahan utama').dataValidation.type,'list');assert.equal(field(added,'Dokumen lengkap').dataValidation.type,'list');
  const dynamic=await (await send('preview',Buffer.from(await expanded.xlsx.writeBuffer()))).json();assert.equal(dynamic.valid,true,JSON.stringify(dynamic.issues));assert.equal(dynamic.rows.length,6);
  // Old single-sheet uploads remain readable.
  const legacy=await send('preview',await readFile('apps/api/templates/template-aset-semua-kategori.xlsx'));assert.equal((await legacy.json()).valid,true);
 }finally{
  if(codes.length){const [assets]=await db.execute('SELECT id FROM assets WHERE code IN (?,?,?,?,?)',codes);for(const asset of assets){const [photos]=await db.execute('SELECT url FROM asset_photos WHERE asset_id=?',[asset.id]);for(const photo of photos)createdFiles.push(resolve('uploads/assets',basename(photo.url)));await db.execute('DELETE FROM asset_photos WHERE asset_id=?',[asset.id]);await db.execute('DELETE FROM assets WHERE id=?',[asset.id]);}}
  await Promise.all([...new Set(createdFiles)].map(file=>unlink(file).catch(()=>{})));
  if(adminId)await db.execute('DELETE FROM admin_users WHERE id=?',[adminId]);
  if(newCategory)await db.execute('DELETE FROM asset_categories WHERE name=?',[newCategory]);
  await db.end();
 }
});

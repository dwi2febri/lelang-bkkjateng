import test from 'node:test';
import {defaultCategorySettings} from '../apps/api/src/category-settings.ts';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({quiet:true});
const base='http://127.0.0.1:3000';
const headers={'Content-Type':'application/json','X-Requested-With':'BKKAdmin',Origin:base};
test('master kategori: auth, tambah, ikon, visibilitas, konflik versi dan filter dinamis',async()=>{
 assert.equal((await fetch(base+'/api/admin/categories',{method:'POST',headers,body:'{}'})).status,401);
 assert.equal((await fetch(base+'/master-kategori',{redirect:'manual'})).status,307);
 for(const path of ['/master-kategori/baru','/master-kategori/Kendaraan/edit'])assert.equal((await fetch(base+path,{redirect:'manual'})).status,307);
 const login=await fetch(base+'/api/auth/login',{method:'POST',headers,body:JSON.stringify({email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD})});
 assert.equal(login.status,200);
 const Cookie=login.headers.get('set-cookie').split(';')[0];const auth={...headers,Cookie};
 const db=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'lelang_bkkjateng'});
 const name='Test'+Date.now();let assetId;
 const create=body=>fetch(base+'/api/admin/categories',{method:'POST',headers:auth,body:JSON.stringify(body)});
 const settings=defaultCategorySettings('Kendaraan');settings.fields[0].required=true;settings.fields[0].icon='mdi:car-sports';settings.facilityIcons={AC:'tabler:air-conditioning'};
 const draft={settings,name,label:'Apartemen uji',icon:'auction',showHome:true,sortOrder:99,version:0};
 try {
  assert.equal((await create({...draft,icon:'invalid'})).status,400);
  assert.equal((await create({...draft,label:'   '})).status,400);
  assert.equal((await create({...draft,name:'Semua'})).status,400);
  assert.equal((await create({...draft,settings:{...settings,fields:[...settings.fields,settings.fields[0]]}})).status,400);
  assert.equal((await create(draft)).status,201);
  assert.equal((await create(draft)).status,409);
  let rows=await (await fetch(base+'/api/categories')).json();
  let row=rows.find(c=>c.name===name);assert.equal(row.icon,'auction');assert.equal(row.showHome,true);assert.equal(row.settings.template,'vehicle');assert.equal(row.settings.fields[0].required,true);assert.equal(row.settings.fields[0].icon,'mdi:car-sports');assert.equal(row.settings.facilityIcons.AC,'tabler:air-conditioning');
  const {name:_,...fields}=row;
  const update=body=>fetch(base+'/api/admin/categories/'+name,{method:'PUT',headers:auth,body:JSON.stringify(body)});
  assert.equal((await update({...fields,label:'Nama baru',showHome:false,icon:'key'})).status,200);
  assert.equal((await update(fields)).status,409);
  rows=await (await fetch(base+'/api/categories')).json();row=rows.find(c=>c.name===name);assert.equal(row.showHome,false);assert.equal(row.label,'Nama baru');assert.equal(row.icon,'key');
  const body={slug:name.toLowerCase(),code:name.toUpperCase(),title:'Aset kategori baru',category:name,saleMethod:'Lelang',province:'Jawa Tengah',city:'Semarang',address:'Alamat untuk pengujian',price:100000000,oldPrice:null,land:100,building:80,bedrooms:2,image:'https://example.com/image.jpg',auctionDate:'2027-10-15T03:00:00Z',certificate:'SHM',description:'Aset pengujian kategori dinamis',featured:false};
  const invalid=await fetch(base+'/api/admin/assets',{method:'POST',headers:auth,body:JSON.stringify(body)});assert.equal(invalid.status,400);
  body.details={googleMapsUrl:'https://maps.app.goo.gl/TestLocation123',attributes:{brand:'Toyota',model:'Avanza',mileage:42000,transmission:'Otomatis'}};
  body.photos=[body.image,...Array.from({length:5},(_,index)=>`https://example.com/photo-${index+2}.jpg`)];
  const wrong=await fetch(base+'/api/admin/assets',{method:'POST',headers:auth,body:JSON.stringify({...body,details:{attributes:{brand:'Toyota',transmission:'Invalid'}}})});assert.equal(wrong.status,400);
  const badMap=await fetch(base+'/api/admin/assets',{method:'POST',headers:auth,body:JSON.stringify({...body,details:{...body.details,googleMapsUrl:'https://example.com/maps'}})});assert.equal(badMap.status,400);
  const saved=await fetch(base+'/api/admin/assets',{method:'POST',headers:auth,body:JSON.stringify(body)});assert.equal(saved.status,201);const savedAsset=await saved.json();assetId=savedAsset.id;assert.equal(savedAsset.province,'Jawa Tengah');assert.equal(savedAsset.details.attributes.mileage,42000);
  const publicDetail=await (await fetch(base+'/api/assets/'+body.slug)).json();assert.equal(publicDetail.details.attributes.brand,'Toyota');assert.equal(publicDetail.details.googleMapsUrl,body.details.googleMapsUrl);assert.equal(publicDetail.categorySettings.template,'vehicle');assert.equal(publicDetail.categorySettings.fields[0].icon,'mdi:car-sports');assert.equal(publicDetail.categorySettings.facilityIcons.AC,'tabler:air-conditioning');assert.equal(publicDetail.categorySettings.sections.calculator,false);
  const detailHtml=await (await fetch(base+'/katalog-aset/'+body.slug)).text();assert.match(detailHtml,/data-icon="mdi:car-sports"/);assert.match(detailHtml,/href="https:\/\/maps\.app\.goo\.gl\/TestLocation123"/);assert.match(detailHtml,/data-icon="tabler:air-conditioning"/);
  const brochure=detailHtml.split('class="asset-brochure"')[1]?.split('</table>')[0];assert.ok(brochure);assert.equal((brochure.match(/<figure/g)||[]).length,6);assert.match(brochure,/bkk-lelang-v2\.png/);assert.match(brochure,/Dicetak:/);assert.match(brochure,/Toyota/);assert.doesNotMatch(brochure,/Luas tanah|Kamar tidur/);
  const edited=await fetch(base+'/api/admin/assets/'+assetId,{method:'PUT',headers:auth,body:JSON.stringify({...body,province:'Daerah Khusus Ibukota Jakarta',city:'Kota Jakarta Pusat'})});assert.equal(edited.status,200);assert.equal((await edited.json()).province,'Daerah Khusus Ibukota Jakarta');
  const editDetail=await (await fetch(base+'/api/admin/assets/'+assetId,{headers:auth})).json();assert.equal(editDetail.details.googleMapsUrl,body.details.googleMapsUrl);
  for(const point of [{latitude:-6.99},{longitude:110.42},{latitude:91,longitude:110.42},{latitude:-6.99,longitude:181}]){
   const invalidPoint=await fetch(base+'/api/admin/assets/'+assetId,{method:'PUT',headers:auth,body:JSON.stringify({...body,details:{...body.details,...point}})});assert.equal(invalidPoint.status,400);
  }
  const selectedPoint={latitude:-6.9901234,longitude:110.4205678};
  const withPoint=await fetch(base+'/api/admin/assets/'+assetId,{method:'PUT',headers:auth,body:JSON.stringify({...body,details:{...body.details,...selectedPoint}})});assert.equal(withPoint.status,200);
  for(const [path,requestHeaders] of [['/api/admin/assets/'+assetId,auth],['/api/assets/'+body.slug,{}]]){
   const located=await (await fetch(base+path,{headers:requestHeaders})).json();assert.equal(located.details.latitude,selectedPoint.latitude);assert.equal(located.details.longitude,selectedPoint.longitude);
  }
  const locatedHtml=await (await fetch(base+'/katalog-aset/'+body.slug)).text();assert.match(locatedHtml,/query=-6\.9901234%2C110\.4205678/);assert.match(locatedHtml,/asset-location-map-canvas/);
  const {googleMapsUrl,...detailsWithoutMap}=body.details;
  const cleared=await fetch(base+'/api/admin/assets/'+assetId,{method:'PUT',headers:auth,body:JSON.stringify({...body,details:detailsWithoutMap})});assert.equal(cleared.status,200);const clearedDetails=(await cleared.json()).details;assert.equal(clearedDetails.googleMapsUrl,undefined);assert.equal(clearedDetails.latitude,undefined);assert.equal(clearedDetails.longitude,undefined);
  const filtered=await fetch(base+'/api/assets?category='+name);assert.equal(filtered.status,200);const data=await filtered.json();assert.ok(data.data.some(a=>a.id===assetId));
  assert.equal((await fetch(base+'/master-kategori',{headers:{Cookie}})).status,200);
  const newAssetPage=await fetch(base+'/aset/baru',{headers:{Cookie}});assert.equal(newAssetPage.status,200);assert.match(await newAssetPage.text(),/google-map-canvas/);
  for(const path of ['/master-kategori/baru','/master-kategori/'+encodeURIComponent(name)+'/edit']){const page=await fetch(base+path,{headers:{Cookie}});assert.equal(page.status,200);const html=await page.text();assert.match(html,/Kembali ke Master Kategori/);assert.doesNotMatch(html,/role="dialog"/);}
 } finally {
  if(assetId)await db.execute('DELETE FROM assets WHERE id=?',[assetId]);
  await db.execute('DELETE FROM asset_categories WHERE name=?',[name]);await db.end();
  await fetch(base+'/api/auth/logout',{method:'POST',headers:auth});
 }
});

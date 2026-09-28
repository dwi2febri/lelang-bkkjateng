import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import {isMapPoint,pointGoogleMapsUrl} from '../apps/api/src/google-maps.ts';
dotenv.config({quiet:true});
const db=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'lelang_bkkjateng'});
const parse=value=>typeof value==='string'?JSON.parse(value):value;
const templates=[
 ['Rumah','Rumah Keluarga',480000000],['Ruko','Ruko Strategis',780000000],
 ['Tanah','Tanah Kavling',250000000],['Kendaraan','Kendaraan Operasional',185000000],
 ['Gudang','Gudang Usaha',1800000000],
];
try{
 await db.beginTransaction();
 const [existing]=await db.query('SELECT * FROM assets ORDER BY id FOR UPDATE');
 const [categories]=await db.query('SELECT name FROM asset_categories');
 const allowed=new Set(categories.map(row=>row.name));
 const counts=Object.fromEntries(['Jual Beli','Cessie','Lelang'].map(method=>[method,existing.filter(a=>a.saleMethod===method).length]));
 const used=new Set(existing.flatMap(asset=>[asset.code,asset.slug]));
 let added=0;
 for(let index=1;existing.length+added<30;index++){
  if(index>300)throw new Error('Tidak cukup kode demo yang tersedia.');
  const code=`DEMO-EXT-${String(index).padStart(3,'0')}`,slug=`demo-katalog-tambahan-${String(index).padStart(3,'0')}`;
  if(used.has(code)||used.has(slug))continue;
  const [category,label,basePrice]=templates[(index-1)%templates.length];
  const source=existing.find(asset=>asset.category===category);
  if(!source||!allowed.has(category))throw new Error(`Template kategori ${category} belum tersedia.`);
  const method=Object.keys(counts).sort((a,b)=>counts[a]-counts[b])[0];
  const details={...(parse(source.details)||{})};
  if(isMapPoint(details)){
   details.latitude=Number((details.latitude+index*0.0001).toFixed(7));
   details.longitude=Number((details.longitude+index*0.0001).toFixed(7));
   details.googleMapsUrl=pointGoogleMapsUrl(details);details.locationIsDemo=true;
  }
  if(category==='Kendaraan')details.attributes={...details.attributes,brand:'Toyota',model:'Avanza',productionYear:2020,mileage:45000+index*1000,transmission:'Manual',fuel:'Bensin',condition:'Data contoh'};
  const price=basePrice+index*15000000;
  const [sourcePhotos]=await db.execute('SELECT url FROM asset_photos WHERE asset_id=? ORDER BY position',[source.id]);
  const photos=[...new Set([source.image,...sourcePhotos.map(photo=>photo.url)].filter(Boolean))];
  const title=`${label} ${source.city} ${String(index).padStart(2,'0')} (Demo)`;
  const description=`DATA DUMMY untuk demonstrasi katalog ${method}. ${title}. Foto, spesifikasi, harga, jadwal, dan koordinat merupakan ilustrasi, bukan penawaran resmi. Konfirmasikan informasi aset kepada petugas sebelum transaksi.`;
  const [inserted]=await db.execute('INSERT INTO assets (slug,code,title,category,saleMethod,province,city,district,village,address,price,oldPrice,land,building,bedrooms,image,details,auctionDate,certificate,description,featured,archived) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[
   slug,code,title,category,method,source.province||'Jawa Tengah',source.city,source.district||null,source.village||null,source.address,price,index%3===0?price+75000000:null,source.land,source.building,source.bedrooms,source.image,JSON.stringify(details),`2026-12-${String(1+(index%27)).padStart(2,'0')} 10:00:00`,source.certificate,description,0,0,
  ]);
  for(const [position,url] of photos.entries())await db.execute('INSERT INTO asset_photos(asset_id,url,position) VALUES(?,?,?)',[inserted.insertId,url,position]);
  counts[method]++;added++;used.add(code);used.add(slug);
 }
 await db.commit();
 console.log(JSON.stringify({added,total:existing.length+added,methods:counts}));
}catch(error){await db.rollback();throw error;}finally{await db.end();}

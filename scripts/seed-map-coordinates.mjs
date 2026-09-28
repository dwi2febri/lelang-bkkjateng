import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import {isMapPoint,pointGoogleMapsUrl} from '../apps/api/src/google-maps.ts';
dotenv.config({quiet:true});
// Titik ilustrasi di sekitar wilayah aset; bukan hasil survei atau geocoding alamat.
const areas=[
 ['banyumanik',-7.055,110.415],['colomadu',-7.535,110.749],
 ['purwokerto timur',-7.424,109.247],['purwokerto selatan',-7.451,109.242],
 ['ungaran',-7.139,110.403],['banjarsari',-7.549,110.817],
 ['pekalongan barat',-6.895,109.658],['pekalongan timur',-6.894,109.688],
 ['kaliwungu',-6.953,110.256],['semarang tengah',-6.982,110.419],
 ['tembalang',-7.051,110.441],['laweyan',-7.568,110.795],
 ['semarang',-6.99,110.42],['surakarta',-7.566,110.816],
 ['banyumas',-7.445,109.245],['pekalongan',-6.889,109.675],
 ['kendal',-6.921,110.2],['karanganyar',-7.599,110.952],
];
const db=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'lelang_bkkjateng'});
try {
 await db.beginTransaction();
 const [rows]=await db.query('SELECT id,address,city,details FROM assets FOR UPDATE');
 let updated=0,existing=0;
 for(const row of rows){
  const details=typeof row.details==='string'?JSON.parse(row.details):row.details||{};
  if(isMapPoint(details)){existing++;continue;}
  const address=`${row.address} ${row.city}`.toLowerCase();
  const area=areas.find(([name])=>address.includes(name));
  if(!area)throw new Error(`Wilayah aset ${row.id} belum memiliki titik dummy. Tidak ada perubahan disimpan.`);
  const offset=(Number(row.id)%7)*0.0002;
  const point={latitude:Number((area[1]+offset).toFixed(7)),longitude:Number((area[2]+offset).toFixed(7))};
  await db.execute('UPDATE assets SET details=? WHERE id=?',[JSON.stringify({...details,...point,googleMapsUrl:pointGoogleMapsUrl(point),locationIsDemo:true}),row.id]);
  updated++;
 }
 await db.commit();
 console.log(`Koordinat dummy ditambahkan: ${updated}. Koordinat yang sudah ada dipertahankan: ${existing}. Total aset: ${rows.length}.`);
}catch(error){await db.rollback();throw error;}finally{await db.end();}

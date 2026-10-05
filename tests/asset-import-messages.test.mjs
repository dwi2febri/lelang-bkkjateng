import test from 'node:test';
import 'reflect-metadata';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {plainToInstance} from 'class-transformer';
import {validate} from 'class-validator';
const require=createRequire(import.meta.url);
const {AssetDto}=require('../apps/api/dist/admin/admin.dto.js');
const {defaultCategorySettings}=require('../apps/api/dist/category-settings.js');
const {assetValidationCorrections}=require('../apps/api/dist/excel-import/validation-messages.js');
const {buildCategoryTemplate}=require('../apps/api/dist/excel-import/build-template.js');
const {readWorkbook}=require('../apps/api/dist/excel-import/read-workbook.js');
const {parseAssets}=require('../apps/api/dist/excel-import/parse-assets.js');
const config=defaultCategorySettings('Kendaraan');
const baseline={code:'MOBIL-004',slug:'aset-mobil-004',title:'Mobil operasional',category:'Kendaraan',saleMethod:'Jual Beli',city:'Semarang',address:'Jalan Contoh 1',price:175000000,land:0,building:0,bedrooms:0,image:'https://example.test/car.jpg',certificate:'BPKB / STNK',description:'Mobil operasional dalam kondisi baik.',featured:false};
async function corrections(changes={}) {
 const input={...baseline,...changes};
 const errors=await validate(plainToInstance(AssetDto,input),{whitelist:true,forbidNonWhitelisted:true});
 const result=assetValidationCorrections(errors,input.code,config);
 assert.doesNotMatch(JSON.stringify(result),/regular expression|must |slug|isLength|isInt/);
 return result;
}

test('kode salah menjelaskan huruf kecil, spasi dan contoh; kesalahan slug tidak berulang',async()=>{
 const result=await corrections({code:'Mobil peb-004',slug:'aset-mobil peb-004'});
 assert.equal(result.length,1);
 assert.equal(result[0].field,'Kode aset');
 assert.match(result[0].message,/huruf kecil/);
 assert.match(result[0].message,/HURUF BESAR/);
 assert.match(result[0].message,/spasi/);
 assert.match(result[0].message,/MOBIL-PEB-004/);
 assert.deepEqual(await corrections(),[]);
 for(const code of ['MOBIL_004','MOBIL--004','MOBIL-','-MOBIL','A','A'.repeat(31),'']) {
  const issues=await corrections({code,slug:'aset-'+code.toLowerCase()});
  assert.equal(issues.length,1,code);assert.equal(issues[0].field,'Kode aset');
  assert.match(issues[0].message,/simbol|hubung|karakter|belum diisi/);
 }
});

test('kolom wajib, batas angka, pilihan, tanggal dan tautan dijelaskan dalam bahasa Indonesia',async()=>{
 const result=await corrections({title:'',price:-1,certificate:'A',description:'pendek',saleMethod:'lelang',details:{latitude:95,longitude:181,auctionDeposit:1.5,googleMapsUrl:'https://example.test/map'}});
 const byField=Object.fromEntries(result.map(issue=>[issue.field,issue.message]));
 assert.match(byField['Nama aset'],/belum diisi/);
 assert.match(byField['Harga aset'],/antara 1 dan 1.000.000.000.000/);
 assert.match(byField['Dokumen kendaraan'],/2–30 karakter/);
 assert.match(byField['Deskripsi kendaraan'],/10–10.000 karakter/);
 assert.match(byField['Metode penjualan'],/Jual Beli, Lelang, atau Cessie/);
 assert.match(byField['Garis lintang'],/-90 dan 90/);
 assert.match(byField['Garis bujur'],/-180 dan 180/);
 assert.match(byField['Uang jaminan'],/angka bulat/);
 assert.match(byField['Tautan Google Maps'],/Bagikan/);
 const missing=await corrections({saleMethod:'Lelang'});
 assert.match(missing.find(issue=>issue.field==='Jadwal lelang WIB').message,/belum diisi.*2026-12-15 10:00/);
});

test('pemeriksaan workbook mengembalikan kolom yang tepat pada Kendaraan baris 2',async()=>{
 const categories=[{name:'Kendaraan',label:'Kendaraan',settings:config}];
 const db={query:async sql=>{
  if(sql.includes('FROM asset_categories'))return categories;
  if(sql.includes('FROM credit_products'))return [{id:1,code:'MIGUNANI',name:'BKK Migunani',active:1}];
  if(sql.includes('FROM assets'))return [];
  throw new Error('Unexpected query: '+sql);
 }};
 const book=await readWorkbook(await buildCategoryTemplate(db));
 const sheet=book.getWorksheet('Kendaraan');
 sheet.getCell('B2').value='Mobil peb-004';
 const invalid=await parseAssets(Buffer.from(await book.xlsx.writeBuffer()),db);
 assert.equal(invalid.rows.length,0);
 assert.equal(invalid.issues.length,1);
 assert.equal(invalid.issues[0].sheet,'Kendaraan');
 assert.equal(invalid.issues[0].row,2);
 assert.equal(invalid.issues[0].field,'Kode aset');
 assert.match(invalid.issues[0].message,/MOBIL-PEB-004/);
 assert.doesNotMatch(invalid.issues[0].message,/slug|regular expression/);
 sheet.getCell('B2').value='MOBIL-PEB-004';
 const valid=await parseAssets(Buffer.from(await book.xlsx.writeBuffer()),db);
 assert.deepEqual(valid.issues,[]);
 assert.equal(valid.rows.length,1);
 assert.equal(valid.rows[0].asset.code,'MOBIL-PEB-004');
});

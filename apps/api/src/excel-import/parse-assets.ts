import type ExcelJS from 'exceljs';
import {randomUUID} from 'node:crypto';
import {plainToInstance} from 'class-transformer';
import {validate} from 'class-validator';
import {AssetDto} from '../admin/admin.dto';
import {AdminController} from '../admin/admin.controller';
import type {Database} from '../database/database.service';
import {getCategorySettings,legacySpecKeys} from '../category-settings';
import {assetColumns,maxAssets,photoHeaders,type ImportIssue} from './schema';
import {cellValue,decodePhoto,readWorkbook} from './read-workbook';
import {flattenCategoryWorkbook} from './category-workbook';
import type {MasterCategory} from './category-template-schema';
import {assetValidationCorrections} from './validation-messages';

type Photo = {order:number; url:string; buffer:Buffer};
export type ParsedAsset = {row:number; sheet:string; asset:AssetDto; photos:Photo[]; values:(string|number|boolean|null)[]};
const normalize=(value:unknown)=>String(value??'').trim().toLocaleLowerCase('id-ID');
const message=(error:unknown)=>error instanceof Error?error.message:'Data tidak valid.';
function number(value:unknown,fallback?:number):number|undefined {
  if(value===null||value===undefined||value==='') return fallback;
  if(typeof value==='boolean'||value instanceof Date||!/^[-+]?\d+(\.\d+)?$/.test(String(value).trim())) throw new Error('Isi angka tanpa Rp atau pemisah ribuan; gunakan titik untuk desimal.');
  const result=Number(value);
  if(!Number.isFinite(result)) throw new Error('Angka tidak valid.');
  return result;
}
function date(value:unknown) {
  if(value===null||value==='') return null;
  let wall:string;
  if(value instanceof Date) wall=value.toISOString().slice(0,19);
  else {
    wall=String(value).trim().replace(' ','T');
    if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(wall)) wall+=':00';
  }
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(wall)) throw new Error('Gunakan tanggal dan jam WIB: YYYY-MM-DD HH:mm.');
  const parsed=new Date(wall+'Z');
  if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,19)!==wall) throw new Error('Tanggal atau jam tidak valid.');
  return wall+'+07:00';
}
export async function parseAssets(buffer:Buffer,db:Database) {
  let book=await readWorkbook(buffer);const issues:ImportIssue[]=[], rows:ParsedAsset[]=[];
  const categories=await db.query('SELECT name,label,settings FROM asset_categories');
  const flattened=flattenCategoryWorkbook(book,categories as MasterCategory[]);
  if(flattened.issues.length)return {rows,issues:flattened.issues};
  book=flattened.book;
  const add=(sheet:string,row:number,field:string,text:string)=>{const origin=sheet==='Data Aset'?flattened.origins.get(row):sheet==='Foto'?flattened.photoOrigins.get(row):undefined;issues.push({sheet:origin?.sheet||sheet,row:origin?.row||row,field,message:text});};
  const products=await db.query('SELECT id,code,name FROM credit_products WHERE active=1');
  const configs=new Map(categories.map(category=>[category.name,getCategorySettings(category.name,typeof category.settings==='string'?JSON.parse(category.settings):category.settings)]));
  const data=book.getWorksheet('Data Aset'),photos=book.getWorksheet('Foto');
  if(!data||!photos) return {rows,issues:[{sheet:'Workbook',row:0,field:'Lembar',message:'Gunakan template dengan lembar Data Aset dan Foto.'}]};
  const headers=(sheet:ExcelJS.Worksheet)=>{
    const map=new Map<string,number>();
    sheet.getRow(1).eachCell((cell,col)=>{
      try {
        const name=normalize(cellValue(cell));
        if(map.has(name)) add(sheet.name,1,name,'Judul kolom ganda.');
        map.set(name,col);
      }catch(error){add(sheet.name,1,'Judul kolom',message(error));}
    });
    return map;
  };
  const dataHeaders=headers(data), fotoHeaders=headers(photos);
  for(const [,label] of assetColumns) if(!dataHeaders.has(normalize(label))) add('Data Aset',1,label,'Kolom template tidak ditemukan.');
  for(const label of photoHeaders) if(!fotoHeaders.has(normalize(label))) add('Foto',1,label,'Kolom template tidak ditemukan.');
  const specKeys=new Set<string>();
  for(const config of configs.values()) for(const field of config.fields.filter(f=>f.enabled)) specKeys.add(field.key);
  const expected=new Set([...assetColumns.map(([,label])=>normalize(label)),...Array.from(specKeys,key=>normalize('Spesifikasi: '+key))]);
  for(const name of dataHeaders.keys()) if(!expected.has(name)) add('Data Aset',1,name,'Kolom tidak dikenal. Untuk kolom spesifikasi gunakan nama dari template/master kategori.');
  if(issues.length) return {rows,issues};
  const get=(sheet:ExcelJS.Worksheet,row:number,map:Map<string,number>,label:string)=>{
    const col=map.get(normalize(label));
    return col?cellValue(sheet.getRow(row).getCell(col)):null;
  };
  const photoByRow=new Map<number,string[]>();
  for(const image of photos.getImages()) {
    const row=image.range.tl.nativeRow+1;
    if(image.range.tl.nativeCol+1!==fotoHeaders.get('foto')||row<2||row>2401) add('Foto',row,'Foto','Sudut kiri atas setiap gambar harus berada di kolom Foto pada baris data (maksimal 2400 foto).');
    else photoByRow.set(row,[...(photoByRow.get(row)||[]),image.imageId]);
  }
  for(const sheet of book.worksheets) if(sheet.name!=='Foto'&&sheet.getImages().length) add(sheet.name,0,'Foto','Letakkan seluruh gambar pada lembar Foto.');
  const byCode=new Map<string,Photo[]>(), seenOrders=new Map<string,Set<number>>();
  const lastPhotoRow=Math.max(photos.rowCount,...photoByRow.keys());
  if(lastPhotoRow>2401) add('Foto',0,'Baris','Maksimal 2400 baris foto.');
  for(let row=2;row<=Math.min(lastPhotoRow,2401);row++) {
    try {
      const code=String(get(photos,row,fotoHeaders,'Kode aset')??'').trim();
      const rawOrder=get(photos,row,fotoHeaders,'Urutan foto'),images=photoByRow.get(row)||[];
      if(!code&&rawOrder==null&&!images.length) continue;
      if(!code) throw new Error('Kode aset wajib diisi untuk setiap foto.');
      const order=number(rawOrder);
      if(order==null||!Number.isInteger(order)||order<1||order>12) throw new Error('Urutan foto harus angka 1–12.');
      if(images.length!==1) throw new Error('Sisipkan tepat satu gambar per baris dengan Insert > Pictures > Place over Cells, di kolom Foto.');
      if(seenOrders.get(code)?.has(order)) throw new Error('Urutan foto ganda untuk kode ini.');
      const orders=seenOrders.get(code)||new Set<number>();orders.add(order);seenOrders.set(code,orders);
      const bytes=await decodePhoto(book,images[0]);
      byCode.set(code,[...(byCode.get(code)||[]),{order,url:`/api/uploads/assets/${randomUUID()}.webp`,buffer:bytes}]);
    }catch(error){add('Foto',row,'Foto',message(error));}
  }
  const validator=new AdminController(db),seen=new Set<string>();let count=0;
  for(let row=2;row<=data.rowCount;row++) {
    if(!data.getRow(row).hasValues) continue;
    if(++count>maxAssets){add('Data Aset',row,'Baris',`Maksimal ${maxAssets} aset per unggahan.`);break;}
    let current='Data';
    try {
      const raw:Record<string,unknown>={};
      for(const [key,label] of assetColumns){current=label;raw[key]=get(data,row,dataHeaders,label);}
      const code=String(raw.code??'').trim(); current='Kode aset';
      if(seen.has(normalize(code))) throw new Error('Kode aset ganda di workbook.');
      seen.add(normalize(code));
      current='Kategori';
      const category=categories.find(c=>normalize(c.name)===normalize(raw.category)||normalize(c.label)===normalize(raw.category));
      if(!category) throw new Error('Kategori tidak ditemukan di Master Kategori.');
      const config=configs.get(category.name)!;
      const input:Record<string,unknown>={};
      for(const key of ['code','title','saleMethod','province','city','district','village','address','certificate','description']) input[key]=String(raw[key]??'').trim();
      if(!input.province) delete input.province;
      input.category=category.name;input.slug='aset-'+code.toLowerCase();
      current='Harga aset';input.price=number(raw.price);
      current='Harga sebelumnya';input.oldPrice=number(raw.oldPrice)??null;
      current='Unggulan';
      if(!['','ya','tidak'].includes(normalize(raw.featured))) throw new Error('Isi Ya atau Tidak.');
      input.featured=normalize(raw.featured)==='ya';
      current='Jadwal lelang WIB';input.auctionDate=date(raw.auctionDate);
      if(input.saleMethod!=='Lelang' && input.auctionDate) throw new Error('Kosongkan jadwal untuk metode selain Lelang.');
      current='Produk kredit';
      const product=products.find(p=>normalize(p.name)===normalize(raw.creditProduct)||normalize(p.code)===normalize(raw.creditProduct));
      if(raw.creditProduct&&!product) throw new Error('Produk kredit aktif tidak ditemukan.');
      input.creditProductId=product?.id??null;
      const details:Record<string,unknown>={attributes:{}};
      for(const key of ['auctionDeposit','latitude','longitude']){current=assetColumns.find(([k])=>k===key)![1];const value=number(raw[key]);if(value!==undefined)details[key]=value;}
      for(const key of ['auctionOrganizer','auctionUrl','googleMapsUrl']) if(raw[key]) details[key]=String(raw[key]).trim();
      if(raw.facilities) details.facilities=String(raw.facilities).split(';').map(v=>v.trim()).filter(Boolean);
      input.land=0;input.building=0;input.bedrooms=0;
      for(const key of specKeys) {
        current='Spesifikasi: '+key;
        const value=get(data,row,dataHeaders,current);
        if(value==null||value==='') continue;
        const field=config.fields.find(f=>f.key===key&&f.enabled);
        if(!field) throw new Error(`Kolom ini tidak berlaku untuk kategori ${category.label}. Kosongkan nilainya.`);
        const typed=field.type==='number'?number(value):String(value).trim();
        if(['land','building','bedrooms'].includes(key)) input[key]=typed;
        else if(legacySpecKeys.includes(key)) details[key]=typed;
        else (details.attributes as Record<string,unknown>)[key]=typed;
      }
      input.details=details;
      current='Foto';const images=(byCode.get(code)||[]).sort((a,b)=>a.order-b.order);
      if(!images.length||images.length>12||images.some((image,i)=>image.order!==i+1)) throw new Error('Sertakan 1–12 foto pada kolom Foto aset di baris ini. Untuk template lama, isi urutan 1–12 pada lembar Foto.');
      input.image=images[0].url;input.photos=images.map(photo=>photo.url);
      const asset=plainToInstance(AssetDto,input);
      current='Validasi aset';const errors=await validate(asset,{whitelist:true,forbidNonWhitelisted:true});
      if(errors.length) {
        for(const correction of assetValidationCorrections(errors,code,config))add('Data Aset',row,correction.field,correction.message);
        continue;
      }
      const values=await validator.validateAssetInput(asset);
      const exists=await db.query('SELECT id FROM assets WHERE code=? OR slug=? LIMIT 1',[code,asset.slug]);
      if(exists.length){current='Kode aset';throw new Error('Kode sudah ada di database. Impor hanya menambah aset baru.');}
      const origin=flattened.origins.get(row);
      rows.push({row:origin?.row||row,sheet:origin?.sheet||'Data Aset',asset,photos:images,values});
    }catch(error){add('Data Aset',row,current,message(error));}
  }
  for(const code of byCode.keys()) if(!seen.has(normalize(code))) add('Foto',0,code,'Kode foto tidak ditemukan pada lembar Data Aset.');
  if(!count) add('Data Aset',0,'Data','Isi minimal satu baris aset.');
  return {rows,issues};
}

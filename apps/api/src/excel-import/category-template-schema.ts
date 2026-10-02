import {getCategorySettings,type CategorySettings} from '../category-settings';
import {assetColumns} from './schema';
export type MasterCategory={name:string;label:string;settings:CategorySettings|string|null};
export type TemplateColumn={key:string;header:string;type:'teks'|'angka'|'pilihan'|'tanggal dan jam'|'tautan';required?:boolean;options?:string[];min?:number;max?:number};
export const typedPhotoHeaders=['Kode aset (teks)','Urutan foto (angka)','Foto (gambar)','Keterangan (teks)'];
export const numberHeader='Nomor (angka)';
export const inlinePhotoHeader='Foto aset (gambar)';
export function categoryConfig(category:MasterCategory) {return getCategorySettings(category.name,typeof category.settings==='string'?JSON.parse(category.settings):category.settings);}
export function categorySheets(categories:MasterCategory[]) {
 const used=new Set(['foto','panduan','pilihan','_kategori','data aset','history']);
 return categories.map(category=>{
  const stem=category.label.replace(/[\\/*?:\[\]\x00-\x1f]/g,' ').replace(/^'+|'+$/g,'').trim()||category.name;
  let name=stem.slice(0,31),index=1;
  while(used.has(name.toLowerCase())){const suffix=' '+(++index);name=stem.slice(0,31-suffix.length)+suffix;}
  used.add(name.toLowerCase());return {category,name};
 });
}
export function categoryColumns(category:MasterCategory,products:string[]=[]):TemplateColumn[] {
 const config=categoryConfig(category);
 const numeric=['price','oldPrice','auctionDeposit','latitude','longitude'];
 const required=['code','title','saleMethod','city','address','price','certificate','description'];
 const columns:TemplateColumn[]=assetColumns.filter(([key])=>!['category','facilities'].includes(key)).map(([key,original])=>{
  const type:TemplateColumn['type']=numeric.includes(key)?'angka':key==='auctionDate'?'tanggal dan jam':['saleMethod','creditProduct','featured'].includes(key)?'pilihan':key.endsWith('Url')?'tautan':'teks';
  const label=({latitude:'Garis lintang',longitude:'Garis bujur',city:'Kabupaten / kota',auctionUrl:'Tautan pengumuman lelang',googleMapsUrl:'Tautan Google Maps',certificate:config.certificateLabel,description:config.descriptionLabel} as Record<string,string>)[key]||original;
  return {key,header:`${label} (${type})`,type,required:required.includes(key),...(key==='saleMethod'?{options:['Jual Beli','Lelang','Cessie']}:key==='creditProduct'?{options:products}:key==='featured'?{options:['Ya','Tidak']}:{})};
 });
 for(const field of config.fields.filter(f=>f.enabled)){
  const type=field.type==='number'?'angka':field.type==='select'?'pilihan':'teks';
  columns.push({key:'spec:'+field.key,header:`${field.label}${field.unit?' ['+field.unit+']':''} (${type})`,type,required:field.required,options:field.type==='select'?field.options:undefined,min:field.min,max:field.max});
 }
 if(config.sections.facilities)for(const name of config.facilities)columns.push({key:'facility:'+name,header:`${name} (pilihan)`,type:'pilihan',options:['Ya','Tidak']});
 // Labels are editable in Master Kategori; keep identical labels distinguishable.
 const used=new Set<string>([numberHeader.toLowerCase(),inlinePhotoHeader.toLowerCase()]);
 for(const column of columns){const original=column.header;let n=1;while(used.has(column.header.toLowerCase()))column.header=original.replace(/ \(/,` ${++n} (`);used.add(column.header.toLowerCase());}
 return columns;
}

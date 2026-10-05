import type {ValidationError} from 'class-validator';
import type {CategorySettings} from '../category-settings';
import {assetColumns} from './schema';

type Correction = {field:string;message:string};
const lengths:Record<string,[number,number]> = {
  title:[3,200], category:[2,30], province:[2,60], city:[2,60], district:[0,100],
  village:[0,100], address:[5,250], certificate:[2,30], description:[10,10000],
  auctionOrganizer:[0,150], auctionUrl:[10,500], googleMapsUrl:[10,2048], facilities:[1,80],
};
const ranges:Record<string,[number,number]> = {
  price:[1,1000000000000], oldPrice:[1,1000000000000], auctionDeposit:[0,1000000000000],
  land:[0,10000000], building:[0,10000000], bedrooms:[0,1000], bathrooms:[0,1000],
  floors:[0,1000], electricity:[0,1000000], carport:[0,1000], yearBuilt:[1800,2200],
  latitude:[-90,90], longitude:[-180,180],
};
const amount = (value:number) => value.toLocaleString('id-ID');

function codeCorrection(value:unknown):string {
  const code=String(value??'');
  if(!code) return 'Kode aset belum diisi. Isi kode unik, misalnya MOBIL-PEB-004.';
  const reasons:string[]=[];
  if(/[a-z]/.test(code)) reasons.push('Ada huruf kecil. Ubah semua huruf menjadi HURUF BESAR (contoh: mobil menjadi MOBIL).');
  if(/\s/.test(code)) reasons.push('Ada spasi. Ganti spasi dengan tanda hubung (-).');
  if(/[^A-Za-z0-9\s-]/.test(code)) reasons.push('Ada simbol yang tidak diperbolehkan. Gunakan hanya huruf A–Z, angka 0–9, dan tanda hubung (-).');
  if(/^[-]|[-]$|--/.test(code)) reasons.push('Tanda hubung (-) harus di antara huruf atau angka, tidak di awal/akhir dan tidak berulang.');
  if(code.length<2||code.length>30) reasons.push(`Panjang kode harus 2–30 karakter; isian saat ini ${code.length} karakter.`);
  const suggestion=code.toUpperCase().replace(/[^A-Z0-9-]+/g,'-').replace(/-+/g,'-').replace(/^-+|-+$/g,'');
  const example=suggestion.length>=2&&suggestion.length<=30?suggestion:'MOBIL-PEB-004';
  return `${reasons.join(' ')||'Gunakan huruf besar, angka, dan tanda hubung (-) untuk kode aset.'} Contoh perbaikan: ${example}.`;
}

// Report the spreadsheet column, not internal/generated properties such as slug.
export function assetValidationCorrections(errors:ValidationError[],code:string,config:CategorySettings):Correction[] {
  const corrections=new Map<string,Set<string>>();
  const labels:Record<string,string>={
    ...Object.fromEntries(assetColumns),
    certificate:config.certificateLabel, description:config.descriptionLabel,
    city:'Kabupaten / kota', latitude:'Garis lintang', longitude:'Garis bujur',
    auctionUrl:'Tautan pengumuman lelang', googleMapsUrl:'Tautan Google Maps',
    image:'Foto aset', photos:'Foto aset', creditProductId:'Produk kredit',
    ...Object.fromEntries(config.fields.map(field=>[field.key,field.label])),
  };
  const add=(field:string,message:string)=>{
    const messages=corrections.get(field)||new Set<string>();messages.add(message);corrections.set(field,messages);
  };
  const visit=(error:ValidationError)=>{
    const key=error.property;
    if(key==='slug'||key==='code') {add('Kode aset',codeCorrection(code));return;}
    const field=labels[key]||'Isian aset';
    const constraints=Object.keys(error.constraints||{});
    if(constraints.length) {
      if(error.value===undefined||error.value===null||error.value==='') {
        add(field,`${field} belum diisi. ${key==='auctionDate'?'Untuk metode Lelang, isi tanggal dan jam, misalnya 2026-12-15 10:00 (WIB).':`Lengkapi kolom ${field} di Excel.`}`);
      } else if(key==='saleMethod') {
        add(field,'Metode penjualan tidak dikenali. Pilih Jual Beli, Lelang, atau Cessie dari pilihan di Excel; gunakan penulisan yang sama.');
      } else if(key==='auctionDate') {
        add(field,'Tanggal atau jam belum sesuai. Contoh penulisan: 2026-12-15 10:00 untuk 15 Desember 2026 pukul 10.00 WIB.');
      } else if(key==='image'||key==='photos') {
        add(field,'Sisipkan 1–12 foto JPG/PNG pada kolom Foto aset. Jangan mengisi nama file atau tautan sebagai pengganti gambar.');
      } else {
        for(const constraint of constraints) {
          const length=lengths[key],range=ranges[key];
          if(constraint==='isLength'&&length) add(field,`${field} harus ${length[0]===0?'maksimal '+amount(length[1]):amount(length[0])+'–'+amount(length[1])} karakter. Sesuaikan panjang teksnya.`);
          else if(constraint==='isInt') add(field,'Isi angka bulat tanpa pecahan. Contoh: 10, bukan 10.5.');
          else if(constraint==='isNumber') add(field,'Isi dengan angka. Untuk angka desimal gunakan titik, misalnya -7.05.');
          else if((constraint==='min'||constraint==='max')&&range) add(field,`${field} harus antara ${amount(range[0])} dan ${amount(range[1])}. Periksa kembali angkanya.`);
          else if(constraint==='isUrl'||constraint==='matches') add(field,key==='googleMapsUrl'?'Gunakan tautan lokasi dari Google Maps yang diawali https://. Salin melalui tombol Bagikan di Google Maps.':'Tautan belum sesuai. Salin alamat lengkap yang diawali https://.');
          else if(constraint==='isBoolean') add(field,'Pilih Ya atau Tidak dari pilihan di Excel.');
          else if(constraint==='isString') add(field,'Isi kolom ini dengan teks sesuai petunjuk pada template.');
          else if(key==='facilities') add(field,'Gunakan pilihan fasilitas yang tersedia pada template. Maksimal 50 fasilitas, masing-masing 1–80 karakter.');
          else add(field,'Isian belum sesuai. Periksa kolom ini dan ikuti contoh pada template Excel terbaru.');
        }
      }
    }
    for(const child of error.children||[])visit(child);
  };
  for(const error of errors)visit(error);
  return [...corrections].map(([field,messages])=>({field,message:[...messages].join(' ')}));
}

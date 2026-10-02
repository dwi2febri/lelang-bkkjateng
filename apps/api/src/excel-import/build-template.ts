import ExcelJS from 'exceljs';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import sharp from 'sharp';
import type {Database} from '../database/database.service';
import {categoryColumns,categoryConfig,categorySheets,numberHeader,inlinePhotoHeader,type MasterCategory} from './category-template-schema';
import {readWorkbook} from './read-workbook';

// Runtime generation is driven by the same category schema used by the import reader.
// The checked-in workbook supplies example images only, never the category/field list.
let samples:Promise<Map<string,Buffer>>|undefined;
async function samplePictures(){
 if(!samples)samples=(async()=>{
  const source=await readWorkbook(await readFile(resolve(__dirname,'../../templates/template-aset-semua-kategori.xlsx')));
  const sheet=source.getWorksheet('Foto')!,result=new Map<string,Buffer>();
  for(const image of sheet.getImages()){
   const key=String(sheet.getCell(image.range.tl.nativeRow+1,1).value).replace('CONTOH-','').toLowerCase();
   const bytes=source.getImage(Number(image.imageId))?.buffer;
   if(bytes&&!result.has(key))result.set(key,await sharp(Buffer.from(bytes)).resize(500,320,{fit:'cover'}).jpeg({quality:78}).toBuffer());
  }
  const placeholder=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="500" height="320"><rect width="500" height="320" fill="#eaf3f8"/><rect x="155" y="70" width="190" height="125" rx="12" fill="none" stroke="#185781" stroke-width="5"/><circle cx="210" cy="110" r="16" fill="#f6c85b"/><path d="M160 187l55-45 40 27 32-45 55 63" fill="#99c7d8"/><text x="250" y="246" text-anchor="middle" font-family="Arial" font-size="22" fill="#185781">Ganti dengan foto aset</text></svg>');
  result.set('default',await sharp(placeholder).jpeg().toBuffer());return result;
 })().catch(error=>{samples=undefined;throw error;});
 return samples;
}
const palette={teal:'FF2E98AE',ink:'FF486579',gray:'FFEDECE9',alternate:'FFF7F6F4',white:'FFFFFFFF'};
function style(sheet:ExcelJS.Worksheet,headerRow=1){
 sheet.properties.tabColor={argb:palette.teal};
 sheet.views=[{state:'frozen',xSplit:2,ySplit:headerRow,showGridLines:false}];
 sheet.getRow(headerRow).height=42;
 sheet.getRow(headerRow).eachCell(cell=>{
  cell.font={name:'Calibri',size:11,bold:true,color:{argb:palette.white}};
  cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:palette.teal}};
  cell.alignment={vertical:'middle',horizontal:'left',wrapText:true,indent:1};
  cell.border={right:{style:'thin',color:{argb:'FFBCE0E7'}},bottom:{style:'thin',color:{argb:palette.white}}};
 });
 for(let row=headerRow+1;row<=sheet.lastRow!.number;row++){
  // Validation-only rows remain empty so the template does not look like populated data.
  if(!sheet.getRow(row).hasValues)continue;
  sheet.getRow(row).height=48;
  for(let col=1;col<=sheet.columnCount;col++){
   const cell=sheet.getCell(row,col);
   cell.font={name:'Calibri',size:11,color:{argb:palette.ink}};
   cell.alignment={vertical:'middle',horizontal:col===1?'center':typeof cell.value==='number'?'right':'left',wrapText:true,indent:col===1?0:1};
   cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:(row-headerRow)%2===1?palette.gray:palette.alternate}};
   cell.border={right:{style:'thin',color:{argb:palette.white}},bottom:{style:'thin',color:{argb:palette.white}}};
  }
 }
}
const values:Record<string,string|number>={land:180,building:120,bedrooms:3,bathrooms:2,floors:2,electricity:2200,carport:1,yearBuilt:2020,businessUse:'Toko dan kantor',landUse:'Hunian',landContour:'Datar',roadWidth:8,frontWidth:12,brand:'Toyota',model:'Avanza',manufactureYear:2021,mileage:45000,transmission:'Manual',fuel:'Bensin',engineCapacity:1500,color:'Putih',condition:'Baik, contoh ilustrasi',taxUntil:'2027-06-30',ceilingHeight:8,floorCapacity:1000,industrialUse:'Penyimpanan barang'};
export async function buildCategoryTemplate(db:Database) {
 const categories=await db.query('SELECT name,label,settings FROM asset_categories ORDER BY sortOrder,name') as MasterCategory[];
 const products=await db.query('SELECT code,name FROM credit_products WHERE active=1 ORDER BY id');
 const book=new ExcelJS.Workbook();book.creator='BKK Jateng';book.created=new Date();
 const layouts=categorySheets(categories);
 if(layouts.length>200)throw new Error('Template mendukung maksimal 200 kategori.');
 // Open on the guide; input tabs still use row 1 headers for the import contract.
 book.views=[{x:0,y:0,width:16000,height:10000,visibility:'visible',activeTab:0,firstSheet:0}];
 const guide=book.addWorksheet('Panduan');
 const inputs=layouts.map(({name,category})=>({sheet:book.addWorksheet(name),category}));
 const choices=book.addWorksheet('Pilihan'),manifest=book.addWorksheet('_Kategori');
 choices.state='veryHidden';manifest.state='veryHidden';
 manifest.addRow(['Lembar (teks)','Kategori (teks)','Format (teks)']);
 const pictures=await samplePictures();let choiceColumn=0;
 const lists=new Map<string,string>();
 function dropdown(options:string[]){
  const key=JSON.stringify(options);if(lists.has(key))return lists.get(key)!;
  const column=++choiceColumn,name='Pilihan_'+column;
  choices.getCell(1,column).value=`Pilihan ${column} (teks)`;
  options.forEach((option,i)=>{choices.getCell(i+2,column).value=option;});
  const letter=choices.getColumn(column).letter;
  book.definedNames.add(`'Pilihan'!$${letter}$2:$${letter}$${options.length+1}`,name);lists.set(key,name);return name;
 }
 const instructions:[string,string][]=[
  ['Petunjuk (teks)','Keterangan (teks)'],
  ['Template per kategori','Isi aset pada sheet kategori yang sesuai. Satu baris untuk satu aset. Hapus baris contoh pada kategori yang tidak digunakan; sheet kategori boleh tetap kosong atau dihapus.'],
  ['Kategori terbaru','Setiap unduhan mengikuti Master Kategori, kolom spesifikasi, fasilitas dan produk kredit saat itu. Unduh ulang jika master berubah. Jangan mengubah judul kolom atau nama sheet.'],
  ['Kolom pilihan','Gunakan dropdown pada metode penjualan, produk kredit, unggulan, spesifikasi pilihan, dan fasilitas Ya/Tidak. Kolom pilihan opsional boleh dikosongkan. Angka/teks bebas tetap diisi sesuai datanya.'],
  ['Nomor','Kolom paling kiri untuk nomor urut. Isi angka bulat positif (1, 2, 3, dst.). Nomor hanya membantu pengisian dan tidak disimpan sebagai kode aset.'],
  ['Foto tertanam','Sisipkan 1–12 gambar di kolom terakhir Foto aset pada baris aset yang sama. Insert > Pictures > Place over Cells. Pojok kiri atas setiap gambar harus berada di dalam sel Foto aset milik baris tersebut.'],
  ['Gambar melewati dua baris','Sistem menentukan pemilik foto dari posisi pojok kiri atas gambar, bukan titik tengah atau bagian gambar yang paling banyak menutupi baris. Jika gambar melintang di antara baris data aset 1 dan 2, foto tetap milik aset 1 selama pojok kiri atas berada di sel Foto aset pada baris aset 1. Jika pojok kiri atas bergeser ke baris aset 2, foto menjadi milik aset 2; jika baris tersebut kosong, pemeriksaan menampilkan kesalahan.'],
  ['Menggeser gambar','Gambar boleh digeser dan melewati batas sel, tetapi pojok kiri atas harus tetap jelas di dalam kolom Foto aset pada baris aset yang benar. Perbesar tinggi baris agar foto mudah ditata. Setelah menggeser gambar, simpan file dan gunakan Periksa file untuk memastikan jumlah foto serta sampul setiap aset sebelum impor.'],
  ['Urutan foto','Susun foto dari atas ke bawah; jika sejajar, urutannya dari kiri ke kanan. Foto pertama menjadi sampul, sisanya galeri. Jangan menumpuk gambar pada posisi yang sama.'],
  ['Menambah foto','Perbesar tinggi baris dan lebar kolom Foto aset, lalu kecilkan gambar agar seluruh gambar berada di sel tersebut. Gunakan beberapa baris susunan gambar di dalam satu sel untuk banyak foto. Jangan memakai Place in Cell, IMAGE(), atau tautan gambar. Gunakan JPG/PNG/WebP.'],
  ['Contoh','Kode CONTOH- dan foto adalah ilustrasi; ganti sebelum impor. Dua foto pada setiap contoh menunjukkan galeri. Hapus juga gambar ketika menghapus contoh baris aset.'],
  ['Angka dan tanggal','Harga berupa angka, bukan teks Rp. Format pemisah ribuan Excel diperbolehkan. Jadwal Lelang wajib tanggal dan jam WIB; contoh 2026-12-15 10:00. Kosongkan jadwal untuk metode lain.'],
  ['Batas','Maksimal 200 aset per file (gabungan seluruh sheet), 20 MB workbook, 1–12 foto/aset, 5 MB/40 megapiksel per foto. Tanpa rumus dan macro.'],
  ['Penyimpanan','Periksa file sebelum impor. Kesalahan satu baris menolak seluruh file. Kode aset harus unik di semua sheet dan database. Aset baru langsung tampil di katalog publik.'],
  ['Kolom wajib umum','Kode aset (2–30 karakter huruf besar/angka/tanda -), nama aset, metode penjualan, kabupaten/kota, alamat, harga, dokumen kepemilikan, deskripsi, dan minimal satu foto.'],
  ['Lokasi','Isi nama provinsi/kabupaten/kecamatan/desa sebagai teks. Garis lintang dan bujur harus diisi berpasangan, atau keduanya kosong.'],
  ['Sumber contoh foto','Foto ilustrasi berasal dari data demo aplikasi (Unsplash). Kategori baru menggunakan gambar penanda yang harus diganti dengan foto aset.'],
 ];
 for(const [index,{sheet,category}] of inputs.entries()){
  manifest.addRow([sheet.name,category.name,'foto-baris-v1']);
  const config=categoryConfig(category),columns=categoryColumns(category,products.map(p=>p.name));
  const code='CONTOH-'+String(index+1).padStart(3,'0');
  const product=products.find(p=>p.code===(config.template==='vehicle'?'migunani':'joglo'));
  const example:Record<string,string|number|Date|null>={code,title:`Contoh ${category.label}`.slice(0,200),saleMethod:'Jual Beli',creditProduct:product?.name??null,province:'Jawa Tengah',city:'Semarang',district:'Banyumanik',village:'Srondol Wetan',address:'Jl. Contoh No. 1, Semarang (ilustrasi)',price:config.template==='vehicle'?175000000:685000000,oldPrice:null,certificate:config.template==='vehicle'?'BPKB / STNK':'SHM',description:'CONTOH DATA. Ganti dengan deskripsi aset sebenarnya sebelum impor. Foto hanya ilustrasi.',featured:'Tidak',auctionDate:null,auctionDeposit:null,auctionOrganizer:null,auctionUrl:null,latitude:-7.05,longitude:110.42,googleMapsUrl:'https://www.google.com/maps?q=-7.05,110.42'};
  for(const field of config.fields.filter(f=>f.enabled))example['spec:'+field.key]=field.type==='select'?field.options[0]:field.type==='number'?Math.min(field.max??1e7,Math.max(field.min??0,Number(values[field.key])||1)):String(values[field.key]??'Contoh');
  for(const facility of config.facilities)example['facility:'+facility]='Tidak';
  sheet.addRow([numberHeader,...columns.map(c=>c.header),inlinePhotoHeader]);sheet.addRow([1,...columns.map(c=>example[c.key]??null),null]);
  sheet.getColumn(1).width=10;sheet.getColumn(1).numFmt='0';
  for(let row=2;row<=201;row++)sheet.getCell(row,1).dataValidation={type:'whole',operator:'greaterThan',formulae:[0],allowBlank:true,showErrorMessage:true,error:'Isi nomor berupa angka bulat positif.'};
  columns.forEach((column,i)=>{
   const col=sheet.getColumn(i+2);col.width=['description','address'].includes(column.key)?48:Math.min(36,Math.max(24,column.header.length*0.8));
   col.numFmt=column.type==='angka'?['latitude','longitude'].includes(column.key)?'0.000000':'#,##0.##':column.type==='tanggal dan jam'?'yyyy-mm-dd hh:mm':'@';
   const options=column.options;
   for(let row=2;row<=201;row++)if(options?.length)sheet.getCell(row,i+2).dataValidation={type:'list',allowBlank:!column.required,formulae:[dropdown(options)],showErrorMessage:true,errorTitle:'Pilih dari daftar',error:'Gunakan pilihan yang tersedia pada dropdown.',errorStyle:'stop'};
   if(column.required)instructions.push([sheet.name+' — '+column.header,'Wajib diisi.']);
  });
  style(sheet);
  sheet.autoFilter={from:{row:1,column:1},to:{row:2,column:sheet.columnCount}};
  sheet.views=[{state:'frozen',xSplit:3,ySplit:1,showGridLines:false}];
  const photoColumn=columns.length+2;sheet.getColumn(photoColumn).width=80;sheet.getRow(2).height=140;
  const picture=pictures.get(category.name.toLowerCase())||pictures.get('default')!;
  const image=book.addImage({buffer:picture as unknown as ExcelJS.Buffer,extension:'jpeg'});
  for(let order=0;order<2;order++){
   // Native offsets are EMUs (9,525 per pixel), independent of Excel column units.
   const anchor={col:photoColumn-1,row:1,nativeCol:photoColumn-1,nativeRow:1,nativeColOff:(8+order*270)*9525,nativeRowOff:8*9525};
   sheet.addImage(image,{tl:anchor,ext:{width:250,height:160},editAs:'oneCell'});
  }
 }
 guide.columns=[{width:10},{width:48},{width:105}];
 guide.mergeCells('A1:C1');guide.getCell('A1').value='PANDUAN UPLOAD ASET | BKK JATENG';
 guide.mergeCells('A2:C2');guide.getCell('A2').value='Pilih sheet kategori  >  Isi data dan foto  >  Periksa file  >  Impor aset';
 guide.getRow(3).height=12;
 instructions.forEach((row,index)=>guide.getRow(index+4).values=index===0?[numberHeader,...row]:[index,...row]);
 style(guide,4);
 for(const row of [1,2]){
  const cell=guide.getCell(row,1);
  cell.font={name:'Calibri',size:row===1?20:11,bold:row===1,color:{argb:row===1?palette.white:palette.ink}};
  cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:row===1?palette.teal:'FFE3F1F4'}};
  cell.alignment={vertical:'middle',horizontal:'left',indent:1,wrapText:true};
  guide.getRow(row).height=row===1?46:32;
 }
 for(let row=5;row<=guide.rowCount;row++){
  const description=String(guide.getCell(row,3).value??'');
  guide.getRow(row).height=description==='Wajib diisi.'?36:Math.max(48,Math.ceil(description.length/105)*16+16);
  guide.getCell(row,2).font={name:'Calibri',size:11,bold:true,color:{argb:palette.ink}};
 }
 guide.views=[{state:'frozen',ySplit:4,showGridLines:false}];
 return Buffer.from(await book.xlsx.writeBuffer());
}

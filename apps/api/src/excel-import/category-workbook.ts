import ExcelJS from 'exceljs';
import {assetColumns,photoHeaders,maxAssets,type ImportIssue} from './schema';
import {categoryColumns,categoryConfig,typedPhotoHeaders,numberHeader,inlinePhotoHeader,type MasterCategory} from './category-template-schema';
import {cellValue} from './read-workbook';

// Adapt category sheets to the same validation/persistence pipeline as older templates.
export function flattenCategoryWorkbook(book:ExcelJS.Workbook,categories:MasterCategory[]) {
 const issues:ImportIssue[]=[],origins=new Map<number,{sheet:string;row:number}>(),photoOrigins=new Map<number,{sheet:string;row:number}>();
 const manifest=book.getWorksheet('_Kategori');
 if(!manifest) return {book,issues,origins,photoOrigins};
 const add=(sheet:string,row:number,field:string,message:string)=>issues.push({sheet,row,field,message});
 const output=new ExcelJS.Workbook(),data=output.addWorksheet('Data Aset'),targetPhotos=output.addWorksheet('Foto');
 targetPhotos.addRow(photoHeaders);
 const specs=[...new Set(categories.flatMap(category=>categoryConfig(category).fields.filter(f=>f.enabled).map(f=>f.key)))];
 const headers=[...assetColumns.map(([,label])=>label),...specs.map(key=>'Spesifikasi: '+key)];
 data.addRow(headers);
 const seen=new Set<string>(),inlineSheets=new Set<string>();
 const read=(sheet:ExcelJS.Worksheet,row:number,col:number)=>{try{return cellValue(sheet.getCell(row,col));}catch(e){add(sheet.name,row,`Kolom ${col}`,e instanceof Error?e.message:'Nilai tidak valid.');return null;}};
 for(let row=2;row<=manifest.rowCount;row++) {
  const name=String(read(manifest,row,1)||''),categoryName=String(read(manifest,row,2)||'');
  if(!name&&!categoryName)continue;
  if(seen.has(name)||['Data Aset','Foto','Panduan','Pilihan','_Kategori'].includes(name)){add('_Kategori',row,'Lembar','Pemetaan kategori ganda atau tidak valid. Unduh template baru.');continue;}
  seen.add(name);
  const sheet=book.getWorksheet(name);
  if(!sheet)continue; // An unused category sheet may be removed by the operator.
  const category=categories.find(c=>c.name===categoryName);
  if(!category){if(sheet.actualRowCount>1)add(name,1,'Kategori','Kategori sudah tidak tersedia. Unduh template terbaru.');continue;}
  const columns=categoryColumns(category),headerMap=new Map<string,number>();
  sheet.getRow(1).eachCell((cell,col)=>{
   try{const label=String(cellValue(cell)||'').trim().toLowerCase();if(headerMap.has(label))add(name,1,label,'Judul kolom ganda.');headerMap.set(label,col);}catch(e){add(name,1,'Header','Judul kolom tidak valid.');}
  });
  const mode=String(read(manifest,row,3)||'');
  const inline=mode==='foto-baris-v1'||headerMap.has(inlinePhotoHeader.toLowerCase());
  if(mode&&mode!=='foto-baris-v1')add(name,1,'Format','Format tidak dikenali. Unduh template baru.');
  if(inline)inlineSheets.add(name);
  const numberColumn=headerMap.get(numberHeader.toLowerCase()),photoColumn=headerMap.get(inlinePhotoHeader.toLowerCase());
  if(inline&&(numberColumn!==1||photoColumn!==sheet.columnCount))add(name,1,'Header','Kolom Nomor harus paling kiri dan Foto aset harus menjadi kolom terakhir.');
  for(const column of columns)if(!headerMap.has(column.header.toLowerCase()))add(name,1,column.header,'Kolom template tidak ditemukan atau master kategori berubah. Unduh template terbaru.');
  for(const label of headerMap.keys())if(!columns.some(c=>c.header.toLowerCase()===label)&&!(inline&&[numberHeader,inlinePhotoHeader].some(h=>h.toLowerCase()===label)))add(name,1,label,'Kolom tidak dikenal. Gunakan header dari template terbaru.');
  const pictures=new Map<number,ReturnType<ExcelJS.Worksheet['getImages']>>();
  for(const picture of sheet.getImages()){
   const imageRow=picture.range.tl.nativeRow+1;
   if(!inline||picture.range.tl.nativeCol+1!==photoColumn||imageRow<2||imageRow>10000){add(name,imageRow,inlinePhotoHeader,'Letakkan pojok kiri atas gambar di kolom Foto aset pada baris aset yang sesuai.');continue;}
   pictures.set(imageRow,[...(pictures.get(imageRow)||[]),picture]);
  }
  for(let sourceRow=2;sourceRow<=Math.max(sheet.rowCount,...pictures.keys());sourceRow++){
   const images=pictures.get(sourceRow)||[];
   let hasAsset=false;sheet.getRow(sourceRow).eachCell((cell,col)=>{if(col!==numberColumn&&cell.value!==null&&cell.value!=='')hasAsset=true;});
   if(!hasAsset&&!images.length)continue;
   if(data.rowCount>maxAssets){add(name,sourceRow,'Baris',`Maksimal ${maxAssets} aset untuk seluruh kategori dalam satu file.`);break;}
   if(inline&&numberColumn){const value=read(sheet,sourceRow,numberColumn);if(value!=null&&value!==''&&(!/^\d+$/.test(String(value))||!Number.isSafeInteger(Number(value))||Number(value)<1))add(name,sourceRow,numberHeader,'Isi nomor dengan angka bulat positif, misalnya 1, 2, 3.');}
   const values=new Map<string,unknown>(),facilities:string[]=[];
   for(const column of columns){const col=headerMap.get(column.header.toLowerCase());const value=col?read(sheet,sourceRow,col):null;
    if(column.key.startsWith('facility:')){
     const choice=String(value??'').trim().toLowerCase();if(choice==='ya')facilities.push(column.key.slice(9));else if(choice!==''&&choice!=='tidak')add(name,sourceRow,column.header,'Pilih Ya atau Tidak.');
    }else values.set(column.key,value);
   }
   values.set('category',category.name);values.set('facilities',facilities.join(';'));
   const target=data.addRow([...assetColumns.map(([key])=>values.get(key)??null),...specs.map(key=>values.get('spec:'+key)??null)]);
   origins.set(target.number,{sheet:name,row:sourceRow});
   if(inline){
    if(photoColumn&&read(sheet,sourceRow,photoColumn)!=null)add(name,sourceRow,inlinePhotoHeader,'Sisipkan gambar tertanam, bukan teks, nama file, tautan, atau rumus.');
    if(images.length>12){add(name,sourceRow,inlinePhotoHeader,'Maksimal 12 foto per aset.');continue;}
    images.sort((a,b)=>a.range.tl.nativeRowOff-b.range.tl.nativeRowOff||a.range.tl.nativeColOff-b.range.tl.nativeColOff);
    for(const [index,picture] of images.entries()){
     const previous=images[index-1];
     if(previous&&previous.range.tl.nativeRowOff===picture.range.tl.nativeRowOff&&previous.range.tl.nativeColOff===picture.range.tl.nativeColOff)add(name,sourceRow,inlinePhotoHeader,'Gambar bertumpuk di posisi yang sama. Susun gambar terpisah untuk menentukan urutan sampul dan galeri.');
     const original=book.getImage(Number(picture.imageId));
     if(!original?.buffer){add(name,sourceRow,inlinePhotoHeader,'Gambar harus tertanam di workbook.');continue;}
     const photo=targetPhotos.addRow([values.get('code')??null,index+1,null]);
     const id=output.addImage({buffer:original.buffer,extension:original.extension});
     targetPhotos.addImage(id,{tl:{col:2,row:photo.number-1},ext:{width:200,height:120}});
     photoOrigins.set(photo.number,{sheet:name,row:sourceRow});
    }
   }
  }
 }
 for(const sheet of book.worksheets){
  if(!seen.has(sheet.name)&&!['Foto','Panduan','Pilihan','_Kategori'].includes(sheet.name))add(sheet.name,0,'Lembar','Lembar tidak dikenali. Jangan mengganti nama sheet kategori.');
  if(sheet.name!=='Foto'&&!inlineSheets.has(sheet.name)&&sheet.getImages().length)add(sheet.name,0,'Foto','Letakkan gambar di kolom Foto aset pada sheet kategori.');
 }
 const sourcePhotos=book.getWorksheet('Foto');
 if(sourcePhotos){
  const target=targetPhotos;
  const offset=target.rowCount-1;
  sourcePhotos.eachRow((row,n)=>{if(n===1)return;row.eachCell((cell,c)=>{target.getCell(n+offset,c).value=cell.value;});photoOrigins.set(n+offset,{sheet:'Foto',row:n});});
  for(let c=1;c<=3;c++)if(![typedPhotoHeaders[c-1],photoHeaders[c-1]].includes(String(sourcePhotos.getCell(1,c).value)))add('Foto',1,photoHeaders[c-1],'Header foto tidak sesuai template.');
  for(const picture of sourcePhotos.getImages()){
   const original=book.getImage(Number(picture.imageId));if(!original?.buffer){add('Foto',picture.range.tl.nativeRow+1,'Foto','Gambar harus tertanam di workbook.');continue;}
   const id=output.addImage({buffer:original.buffer,extension:original.extension});
   target.addImage(id,{tl:{col:picture.range.tl.nativeCol,row:picture.range.tl.nativeRow+offset},ext:{width:200,height:120}});
  }
 }
 return {book:output,issues,origins,photoOrigins};
}

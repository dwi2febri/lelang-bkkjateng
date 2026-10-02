import ExcelJS from 'exceljs';
import yauzl from 'yauzl';
import sharp from 'sharp';
import JSZip from 'jszip';
import {posix} from 'node:path';
import {BadRequestException} from '@nestjs/common';
import {maxFileBytes} from './schema';

// Read every compressed entry with a running bound before ExcelJS allocates its model.
export async function inspectArchive(buffer:Buffer) {
  if(buffer.length>maxFileBytes) throw new Error('Ukuran Excel maksimal 20 MB.');
  await new Promise<void>((resolve,reject)=>{
    yauzl.fromBuffer(buffer,{lazyEntries:true,validateEntrySizes:true},(error,zip)=>{
      if(error||!zip) return reject(new Error('File bukan workbook .xlsx yang valid.'));
      let size=0,count=0; const names=new Set<string>();
      const fail=(reason:Error)=>{zip.close();reject(reason);};
      zip.on('error',fail);
      zip.on('end',()=>names.has('xl/workbook.xml')?resolve():reject(new Error('Workbook Excel tidak ditemukan.')));
      zip.on('entry',entry=>{
        if(++count>6000 || names.has(entry.fileName) || (entry.generalPurposeBitFlag&1) || entry.uncompressedSize>25*1024*1024)
          return fail(new Error('Isi Excel terlalu besar atau tidak didukung.'));
        names.add(entry.fileName);
        if(/vbaProject|embeddings\/|externalLinks\//i.test(entry.fileName)) return fail(new Error('Gunakan .xlsx tanpa macro, objek tersemat, atau tautan workbook eksternal.'));
        if(/richData\/|cellimages\.xml/i.test(entry.fileName)) return fail(new Error('Foto dalam sel belum didukung. Gunakan Insert > Pictures > Place over Cells pada lembar Foto.'));
        zip.openReadStream(entry,(err,stream)=>{
          if(err||!stream) return fail(new Error('Isi Excel rusak.'));
          stream.on('error',fail);
          stream.on('data',chunk=>{size+=chunk.length;if(size>80*1024*1024){stream.destroy();fail(new Error('Isi Excel setelah dibuka melebihi 80 MB.'));}});
          stream.on('end',()=>zip.readEntry());
        });
      });
      zip.readEntry();
    });
  });
}
export async function readWorkbook(buffer:Buffer) {
  try {
    await inspectArchive(buffer);
    // Excel/OpenXML writers may use a namespace prefix on spreadsheet elements.
    // ExcelJS expects unprefixed names; normalize only that standard namespace.
    const zip=await JSZip.loadAsync(buffer);
    let changed=false;
    for(const entry of Object.values(zip.files)) {
      if(!entry.dir&&entry.name.endsWith('.rels')) {
        const xml=await entry.async('string');
        const normalized=xml.replace(/<Relationship\b[^>]*>/g,relationship=>relationship.includes('TargetMode="External"')?relationship:relationship.replace(/Target="\/([^"<>]+)"/g,(_,target:string)=>`Target="${posix.relative(posix.dirname(posix.dirname(entry.name)),target)}"`));
        if(normalized!==xml){zip.file(entry.name,normalized);changed=true;}
        continue;
      }
      if(entry.dir||!/^xl\/.*\.xml$/.test(entry.name)) continue;
      const xml=await entry.async('string');
      const declaration=xml.match(/xmlns:([A-Za-z_][\w.-]*)="http:\/\/schemas.openxmlformats.org\/spreadsheetml\/2006\/main"/);
      if(!declaration) continue;
      const prefix=declaration[1].replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      zip.file(entry.name,xml.replace(declaration[0],'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"').replace(new RegExp(`(<\\/?)(?:${prefix}):`,'g'),'$1'));
      changed=true;
    }
    const compatible=changed?await zip.generateAsync({type:'nodebuffer'}):buffer;
    const book=new ExcelJS.Workbook();
    await book.xlsx.load(compatible as unknown as ExcelJS.Buffer);
    if(book.worksheets.length>204) throw new Error('Maksimal 200 lembar kategori dan 4 lembar pendukung.');
    for(const sheet of book.worksheets) if(sheet.rowCount>10000 || sheet.columnCount>(sheet.name==='Pilihan'?10000:150)) throw new Error('Isi lembar terlalu besar. Gunakan template dan maksimal 200 aset.');
    return book;
  } catch(error) {
    throw new BadRequestException(error instanceof Error?error.message:'Excel tidak dapat dibaca.');
  }
}
export function cellValue(cell:ExcelJS.Cell): string|number|boolean|Date|null {
  const value=cell.value;
  if(value==null) return null;
  if(typeof value==='string'||typeof value==='number'||typeof value==='boolean'||value instanceof Date) return value;
  if('richText' in value) return value.richText.map(part=>part.text).join('');
  if('hyperlink' in value) return value.text;
  throw new Error('Gunakan nilai biasa, bukan rumus atau nilai error Excel. Salin lalu Paste Values.');
}
export async function decodePhoto(book:ExcelJS.Workbook,imageId:string) {
  const media=book.getImage(Number(imageId));
  if(!media?.buffer) throw new Error('Foto harus tertanam di workbook, bukan tautan.');
  const data=Buffer.from(media.buffer);
  if(data.length>5*1024*1024) throw new Error('Setiap foto maksimal 5 MB.');
  try {
    const image=sharp(data,{limitInputPixels:40000000,failOn:'error'});
    const metadata=await image.metadata();
    if(!['jpeg','png','webp'].includes(metadata.format||'') || (metadata.pages||1)>1) throw new Error();
    return await image.rotate().webp({quality:88}).toBuffer();
  } catch {throw new Error('Foto harus berupa JPG/PNG/WebP yang valid, maksimal 40 megapiksel.');}
}

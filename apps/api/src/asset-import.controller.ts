import {BadRequestException,Body,ConflictException,Controller,Get,Post,StreamableFile,UploadedFile,UseGuards,UseInterceptors,HttpException,Logger} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import {createHash} from 'node:crypto';
import {mkdir,unlink,writeFile} from 'node:fs/promises';
import {basename,resolve} from 'node:path';
import type {ResultSetHeader} from 'mysql2/promise';
import sharp from 'sharp';
import {AdminGuard} from './auth/auth.guard';
import {Database} from './database/database.service';
import {fields} from './admin/admin.controller';
import {parseAssets} from './excel-import/parse-assets';
import {maxFileBytes} from './excel-import/schema';
import {buildCategoryTemplate} from './excel-import/build-template';

type ExcelFile={originalname:string;buffer:Buffer;size:number};
const upload=FileInterceptor('file',{limits:{fileSize:maxFileBytes,files:1,fields:1,parts:2}});
const directory=resolve(__dirname,'../../../uploads/assets');
@Controller('api/admin/asset-import')
@UseGuards(AdminGuard)
export class AssetImportController {
  private processing=false;
  private readonly logger=new Logger(AssetImportController.name);
  constructor(private readonly db:Database) {}
  @Get('template') async template() {
    return new StreamableFile(await buildCategoryTemplate(this.db),{
      type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition:'attachment; filename="template-aset-per-kategori.xlsx"',
    });
  }
  private async run<T>(file:ExcelFile,action:()=>Promise<T>) {
    if(!file||!file.originalname.toLowerCase().endsWith('.xlsx')||file.size>maxFileBytes) throw new BadRequestException('Pilih file .xlsx maksimal 20 MB.');
    if(this.processing) throw new HttpException('Impor sedang diproses. Tunggu sebentar lalu coba lagi.',429);
    this.processing=true;
    try{return await action();}finally{this.processing=false;}
  }
  @Post('preview') @UseInterceptors(upload)
  async preview(@UploadedFile() file:ExcelFile) {
    return this.run(file,async()=>{
      const result=await parseAssets(file.buffer,this.db);
      const rows=[];
      for(const item of result.rows) rows.push({row:item.row,sheet:item.sheet,code:item.asset.code,title:item.asset.title,category:item.asset.category,saleMethod:item.asset.saleMethod,price:item.asset.price,photoCount:item.photos.length,cover:'data:image/webp;base64,'+(await sharp(item.photos[0].buffer).resize(120,80,{fit:'inside'}).webp({quality:70}).toBuffer()).toString('base64')});
      return {valid:result.issues.length===0,checksum:createHash('sha256').update(file.buffer).digest('hex'),rows,issues:result.issues,totalPhotos:result.rows.reduce((sum,row)=>sum+row.photos.length,0)};
    });
  }
  @Post('commit') @UseInterceptors(upload)
  async commit(@UploadedFile() file:ExcelFile,@Body('checksum') checksum:string) {
    return this.run(file,async()=>{
      if(checksum!==createHash('sha256').update(file.buffer).digest('hex')) throw new BadRequestException('Periksa file terlebih dahulu sebelum impor.');
      const result=await parseAssets(file.buffer,this.db);
      if(result.issues.length) throw new BadRequestException({message:'Data berubah atau masih bermasalah. Periksa kembali file.',issues:result.issues});
      const connection=await this.db.pool.getConnection(),written:string[]=[],ids:number[]=[];
      try {
        await connection.beginTransaction();
        await mkdir(directory,{recursive:true});
        for(const row of result.rows) {
          // A transaction keeps all asset rows and their gallery records together.
          const [saved]=await connection.execute<ResultSetHeader>(`INSERT INTO assets (${fields.join(',')}) VALUES (${fields.map(()=>'?').join(',')})`,row.values);
          ids.push(saved.insertId);
          for(const [position,photo] of row.photos.entries()) {
            const path=resolve(directory,basename(photo.url));
            await writeFile(path,photo.buffer,{flag:'wx'});written.push(path);
            await connection.execute('INSERT INTO asset_photos(asset_id,url,position) VALUES(?,?,?)',[saved.insertId,photo.url,position]);
          }
        }
        await connection.commit();
        return {imported:ids.length,photos:written.length,ids};
      } catch(error) {
        await connection.rollback().catch(()=>this.logger.error('Rollback connection failed during asset import.'));
        await Promise.all(written.map(path=>unlink(path).catch(()=>undefined)));
        if((error as {code?:string}).code==='ER_DUP_ENTRY') throw new ConflictException('Kode aset sudah digunakan. Tidak ada aset dari file ini yang disimpan.');
        this.logger.error('Asset import failed.',error instanceof Error?error.stack:undefined);
        throw new HttpException('Impor gagal. Seluruh perubahan dibatalkan; periksa log server atau coba kembali.',503);
      } finally {connection.release();}
    });
  }
}

import {BadRequestException,Body,ConflictException,Controller,Delete,Get,NotFoundException,Param,ParseIntPipe,Post,Put,UseGuards} from '@nestjs/common';
import {ArrayMaxSize,ArrayMinSize,IsArray,IsBoolean,IsIn,IsInt,IsNumber,IsOptional,IsString,Length,Matches,Max,Min,ValidateNested} from 'class-validator';
import {Type} from 'class-transformer';
import {Database} from './database/database.service';
import {AdminGuard} from './auth/auth.guard';
class CreditRuleDto {
 @IsIn(['all','internal','external']) audience!: string;
 @IsInt() @Min(1) @Max(1200) minMonths!: number;
 @IsOptional() @IsInt() @Min(1) @Max(1200) maxMonths: number|null = null;
 @IsOptional() @IsNumber() @Min(0) @Max(100) flatRate: number|null = null;
 @IsOptional() @IsNumber() @Min(0) @Max(100) annuityRate: number|null = null;
}
class CreditProductDto {
 @IsString() @Length(2,40) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) code!: string;
 @IsString() @Length(2,100) name!: string;
 @IsString() @Length(0,1000) description: string = '';
 @IsBoolean() requiresEmployee!: boolean;
 @IsBoolean() active!: boolean;
 @IsInt() @Min(0) version: number = 0;
 @IsArray() @ArrayMinSize(1) @ArrayMaxSize(40) @ValidateNested({each:true}) @Type(()=>CreditRuleDto) rules!: CreditRuleDto[];
}
export function creditProduct(row: Record<string,any>) {
 return {...row,requiresEmployee:!!row.requiresEmployee,active:!!row.active,rules:typeof row.rules==='string'?JSON.parse(row.rules):row.rules};
}
function validate(product: CreditProductDto) {
 if(!product.name.trim()) throw new BadRequestException('Nama produk wajib diisi.');
 const audiences=product.requiresEmployee?['internal','external']:['all'];
 if(product.rules.some(rule=>!audiences.includes(rule.audience))) throw new BadRequestException('Kelompok aturan tidak sesuai status pegawai.');
 for(const audience of audiences) {
   const rules=product.rules.filter(rule=>rule.audience===audience).sort((a,b)=>a.minMonths-b.minMonths);
   let next=1;
   if(!rules.length) throw new BadRequestException('Lengkapi aturan untuk setiap kelompok pegawai.');
   for(const [i,rule] of rules.entries()) {
     if(rule.minMonths!==next || (rule.maxMonths!==null && rule.maxMonths<rule.minMonths) || (rule.flatRate===null && rule.annuityRate===null)) throw new BadRequestException('Rentang tenor harus berurutan mulai bulan 1, tanpa tumpang tindih, dengan minimal satu metode bunga.');
     if(rule.maxMonths===null && i!==rules.length-1) throw new BadRequestException('Tenor tanpa batas hanya boleh pada aturan terakhir.');
     next=(rule.maxMonths??1200)+1;
   }
 }
}
@Controller('api')
export class CreditProductsController {
 constructor(private readonly db:Database) {}
 @Delete('admin/credit-products/:id') @UseGuards(AdminGuard)
 async remove(@Param('id',ParseIntPipe) id:number) {
   try {
     const [result]=await this.db.pool.execute<import('mysql2').ResultSetHeader>('DELETE FROM credit_products WHERE id=? AND used_at IS NULL',[id]);
     if (!result.affectedRows) {
       const [row]=await this.db.query('SELECT id FROM credit_products WHERE id=?',[id]);
       if (!row) throw new NotFoundException('Produk kredit tidak ditemukan.');
       throw new ConflictException('Produk kredit sudah pernah digunakan pada aset sehingga tidak dapat dihapus. Anda dapat menonaktifkannya melalui Edit produk.');
     }
     return {message:'Produk kredit berhasil dihapus.'};
   } catch(error) {
     if ((error as {code?:string}).code==='ER_ROW_IS_REFERENCED_2') throw new ConflictException('Produk kredit masih digunakan pada aset sehingga tidak dapat dihapus.');
     throw error;
   }
 }
 @Get('admin/credit-products') @UseGuards(AdminGuard)
 async list() {return (await this.db.query('SELECT * FROM credit_products ORDER BY id')).map(creditProduct);}
 @Post('admin/credit-products') @UseGuards(AdminGuard)
 async create(@Body() body:CreditProductDto) {
   validate(body);
   if((await this.db.query('SELECT id FROM credit_products WHERE code=?',[body.code])).length) throw new ConflictException('Kode produk sudah digunakan.');
   const result=await this.db.execute('INSERT INTO credit_products(code,name,description,requiresEmployee,active,rules) VALUES(?,?,?,?,?,?)',[body.code,body.name.trim(),body.description,body.requiresEmployee,body.active,JSON.stringify(body.rules)]);
   return {id:result.insertId};
 }
 @Put('admin/credit-products/:id') @UseGuards(AdminGuard)
 async update(@Param('id',ParseIntPipe) id:number,@Body() body:CreditProductDto) {
   validate(body);
   const [existing]=await this.db.query('SELECT id FROM credit_products WHERE id=?',[id]);
   if(!existing) throw new NotFoundException('Produk tidak ditemukan.');
   if((await this.db.query('SELECT id FROM credit_products WHERE code=? AND id<>?',[body.code,id])).length) throw new ConflictException('Kode produk sudah digunakan.');
   const result=await this.db.execute('UPDATE credit_products SET code=?,name=?,description=?,requiresEmployee=?,active=?,rules=?,version=version+1 WHERE id=? AND version=?',[body.code,body.name.trim(),body.description,body.requiresEmployee,body.active,JSON.stringify(body.rules),id,body.version]);
   if(!result.affectedRows) throw new ConflictException('Produk sudah diubah pengguna lain. Muat ulang sebelum menyimpan.');
   return {id};
 }
}

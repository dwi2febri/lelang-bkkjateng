import {ConflictException, Controller, Delete, Get, NotFoundException, Param, ParseIntPipe, Patch, UseGuards} from '@nestjs/common';
import {AdminGuard} from '../auth/auth.guard';
import {Database} from '../database/database.service';

@Controller('api/admin')
@UseGuards(AdminGuard)
export class RecycleBinController {
  constructor(private readonly db: Database) {}

  @Get('recycle-bin') async list() {
    const assets = await this.db.query('SELECT id,title,code,archived,deleted_at FROM assets WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC,id DESC');
    const interests = await this.db.query('SELECT i.id,i.name,i.email,i.status,i.deleted_at,a.title asset_title,a.code asset_code,a.deleted_at asset_deleted_at FROM interests i JOIN assets a ON a.id=i.asset_id WHERE i.deleted_at IS NOT NULL ORDER BY i.deleted_at DESC,i.id DESC');
    return {assets, interests};
  }

  @Delete('assets/:id') async deleteAsset(@Param('id',ParseIntPipe) id:number) {
    const result=await this.db.execute('UPDATE assets SET deleted_at=NOW() WHERE id=? AND deleted_at IS NULL',[id]);
    if (!result.affectedRows) throw new NotFoundException('Aset tidak ditemukan atau sudah berada di Recycle Bin.');
    return {message:'Aset dipindahkan ke Recycle Bin.'};
  }

  @Delete('pengajuan/:id') async deleteInterest(@Param('id',ParseIntPipe) id:number) {
    const result=await this.db.execute('UPDATE interests SET deleted_at=NOW(),version=version+1 WHERE id=? AND deleted_at IS NULL',[id]);
    if (!result.affectedRows) throw new NotFoundException('Pengajuan tidak ditemukan atau sudah berada di Recycle Bin.');
    return {message:'Pengajuan dipindahkan ke Recycle Bin.'};
  }

  @Patch('recycle-bin/assets/:id/restore') async restoreAsset(@Param('id',ParseIntPipe) id:number) {
    const result=await this.db.execute('UPDATE assets SET deleted_at=NULL WHERE id=? AND deleted_at IS NOT NULL',[id]);
    if (!result.affectedRows) throw new NotFoundException('Aset tidak ditemukan di Recycle Bin.');
    return {message:'Aset berhasil dipulihkan dengan status sebelumnya.'};
  }

  @Patch('recycle-bin/pengajuan/:id/restore') async restoreInterest(@Param('id',ParseIntPipe) id:number) {
    const result=await this.db.execute('UPDATE interests i JOIN assets a ON a.id=i.asset_id SET i.deleted_at=NULL,i.version=i.version+1 WHERE i.id=? AND i.deleted_at IS NOT NULL AND a.deleted_at IS NULL',[id]);
    if (!result.affectedRows) {
      const [row]=await this.db.query('SELECT id FROM interests WHERE id=? AND deleted_at IS NOT NULL',[id]);
      if (row) throw new ConflictException('Aset terkait masih di Recycle Bin. Pulihkan asetnya terlebih dahulu.');
      throw new NotFoundException('Pengajuan tidak ditemukan di Recycle Bin.');
    }
    return {message:'Pengajuan berhasil dipulihkan.'};
  }
}

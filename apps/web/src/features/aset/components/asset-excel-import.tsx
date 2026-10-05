"use client";
import {useCallback,useState} from 'react';
import axios from 'axios';
import {Download,FileSpreadsheet,Upload} from 'lucide-react';
import {Modal} from '@/components/ui/modal';
import {Button} from '@/components/ui/button';
import {api,errorMessage} from '@/services/api';
import {currency} from '@/lib/utils';

type Issue={sheet:string;row:number;field:string;message:string};
type Preview={valid:boolean;checksum:string;totalPhotos:number;issues:Issue[];rows:{row:number;sheet:string;code:string;title:string;category:string;saleMethod:string;price:number;photoCount:number;cover:string}[]};
export function AssetExcelImport({onClose,onImported}:{onClose:()=>void;onImported:()=>void}) {
  const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState<Preview|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
  const close=useCallback(()=>{if(!busy)onClose();},[busy,onClose]);
  function choose(value:File|null) {
    setPreview(null);setError('');setSuccess('');setFile(null);
    if(value&&(!value.name.toLowerCase().endsWith('.xlsx')||value.size>20*1024*1024)) {setError('Gunakan file .xlsx maksimal 20 MB.');return;}
    setFile(value);
  }
  async function submit(commit=false) {
    if(!file||busy) return;
    setBusy(true);setError('');
    const form=new FormData();form.append('file',file);
    if(commit&&preview)form.append('checksum',preview.checksum);
    try {
      if(commit) {
        const {data}=await api.post<{imported:number;photos:number}>('/admin/asset-import/commit',form,{timeout:180000});
        setSuccess(`${data.imported} aset dan ${data.photos} foto berhasil diimpor.`);setFile(null);setPreview(null);onImported();
      } else {
        setPreview((await api.post<Preview>('/admin/asset-import/preview',form,{timeout:180000})).data);
      }
    } catch(err) {
      setError(errorMessage(err));
      if(commit) {
        const issues=axios.isAxiosError(err)?err.response?.data?.issues:undefined;
        setPreview(old=>old?{...old,valid:false,issues:Array.isArray(issues)?issues:old.issues}:null);
      }
    } finally {setBusy(false);}
  }
  return <div className="asset-excel-dialog"><Modal title="Upload Excel aset" onClose={close}>
    <div className="asset-excel-body">
      <div className="asset-excel-intro"><FileSpreadsheet size={32}/><div><strong>Satu file, satu sheet untuk setiap kategori</strong><p>Sheet dan kolom otomatis mengikuti Master Kategori terbaru. Header berbahasa Indonesia dilengkapi tipe data, dropdown pilihan, contoh aset, dan foto.</p></div></div>
      <a className="admin-button admin-button-secondary" href="/api/admin/asset-import/template" download><Download size={17}/>Download template Excel</a>
      <ol className="asset-excel-steps">
        <li>Isi sheet kategori yang sesuai. Kolom Nomor berada paling kiri. Hapus contoh aset dan fotonya pada kategori yang tidak dipakai. Maksimal 200 aset untuk seluruh sheet dalam satu file. Unduh ulang template setelah menambah atau mengubah kategori.</li>
        <li>Sisipkan 1–12 gambar di kolom terakhir <strong>Foto aset</strong>, pada baris aset yang sama. Gunakan <strong>Insert → Pictures → Place over Cells</strong>; pojok kiri atas setiap gambar harus berada di dalam sel foto milik aset tersebut.</li>
        <li>Foto diurutkan dari atas ke bawah, lalu kiri ke kanan jika sejajar. Foto pertama menjadi sampul. Gunakan JPG/PNG, maksimal 5 MB per foto. Gambar dalam sel atau rumus IMAGE belum didukung.</li>
      </ol>
      <label className="asset-excel-upload" data-disabled={busy}>
        <span className="asset-excel-upload-icon" aria-hidden="true"><Upload size={26}/></span>
        <strong>{file?'Ganti file Excel':'Pilih file Excel'}</strong>
        <span>Klik area ini untuk memilih file .xlsx</span>
        <small>Maksimal 20 MB · Foto tertanam dalam file</small>
        {file&&<span className="asset-excel-selected" role="status"><FileSpreadsheet size={20} aria-hidden="true"/><span className="asset-excel-filename">{file.name}<small>{(file.size/1024/1024).toFixed(2)} MB</small></span></span>}
        <input aria-label={file?`Ganti file Excel, saat ini ${file.name}`:'Pilih file Excel aset'} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={busy} onChange={event=>{const selected=event.target.files?.[0];if(selected)choose(selected);event.target.value='';}}/>
      </label>
      <p className="admin-helper">Impor menambah aset baru. Kode yang sudah ada ditolak. Jika ada kesalahan, seluruh impor dibatalkan. Aset yang berhasil diimpor langsung tampil pada katalog publik.</p>
      {error&&<p className="admin-alert error" role="alert">{error}</p>}
      {success&&<p className="asset-excel-success" role="status">{success}</p>}
      {busy&&<p role="status">{preview?.valid?'Memproses impor...':'Membaca Excel dan memeriksa foto...'}</p>}
      {preview&&<section aria-label="Hasil pemeriksaan Excel">
        <h3>{preview.valid?'Siap diimpor':'Perbaiki file sebelum impor'}</h3>
        <p>{preview.rows.length} aset valid · {preview.totalPhotos} foto · {preview.issues.length} kesalahan</p>
        {preview.rows.some(row=>row.code.startsWith('CONTOH-'))&&<p className="asset-excel-sample">File masih memuat kode CONTOH-. Ganti/hapus data dan foto contoh jika tidak ingin mempublikasikannya.</p>}
        {!!preview.issues.length&&<div className="admin-table-scroll asset-excel-table"><table className="admin-table"><thead><tr><th>Lembar / baris</th><th>Kolom</th><th>Perbaikan</th></tr></thead><tbody>{preview.issues.map((issue,i)=><tr key={i}><td>{issue.sheet}{issue.row?` · ${issue.row}`:''}</td><td>{issue.field}</td><td>{issue.message}</td></tr>)}</tbody></table></div>}
        {!!preview.rows.length&&<div className="admin-table-scroll asset-excel-table"><table className="admin-table"><thead><tr><th>Sampul</th><th>Kode / nama aset</th><th>Kategori / metode</th><th>Harga</th><th>Foto</th></tr></thead><tbody>{preview.rows.map(row=><tr key={row.code}><td><img src={row.cover} alt={`Sampul ${row.title}`} width={72} height={48}/></td><td><strong>{row.code}</strong><br/>{row.title}<br/><small>{row.sheet} · Baris {row.row}</small></td><td>{row.category}<br/>{row.saleMethod}</td><td>{currency(row.price)}</td><td>{row.photoCount}</td></tr>)}</tbody></table></div>}
      </section>}
    </div>
    <div className="asset-excel-actions"><Button variant="secondary" onClick={close} disabled={busy}>{success?'Tutup':'Batal'}</Button><Button variant="secondary" disabled={!file||busy} onClick={()=>submit()}>Periksa file</Button>{preview?.valid&&<Button disabled={busy} onClick={()=>submit(true)}>Impor {preview.rows.length} aset</Button>}</div>
  </Modal></div>;
}

"use client";
import {useEffect,useState} from 'react';
import {Building2,Files,RotateCcw,Search,Trash2} from 'lucide-react';
import {api,errorMessage} from '@/services/api';
import {Button} from '@/components/ui/button';
import {formatDate} from '@/lib/utils';
import {notify} from '@/store/notification-store';
import {StatusBadge} from '@/features/approval/components/status-badge';
import type {InterestStatus} from '@/features/pengajuan/types';

type DeletedAsset={id:number;title:string;code:string;archived:boolean;deleted_at:string};
type DeletedInterest={id:number;name:string;email:string;status:InterestStatus;asset_title:string;asset_code:string;deleted_at:string;asset_deleted_at:string|null};
type Bin={assets:DeletedAsset[];interests:DeletedInterest[]};
export function RecycleBin(){
  const [data,setData]=useState<Bin>({assets:[],interests:[]}),[tab,setTab]=useState<'assets'|'interests'>('assets');
  const [q,setQ]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState<string|null>(null),[retry,setRetry]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');
    api.get<Bin>('/admin/recycle-bin',{signal:controller.signal}).then(({data})=>setData(data)).catch(e=>{if(!controller.signal.aborted)setError(errorMessage(e));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[retry]);
  async function restore(kind:'assets'|'interests',id:number){
    if(busy)return;setBusy(`${kind}-${id}`);setError('');
    try {
      const {data:result}=await api.patch<{message:string}>(`/admin/recycle-bin/${kind==='assets'?'assets':'pengajuan'}/${id}/restore`);
      notify(result.message);setRetry(v=>v+1);
    }catch(e){setError(errorMessage(e));}finally{setBusy(null);}
  }
  const term=q.trim().toLowerCase();
  const assets=data.assets.filter(a=>`${a.title} ${a.code}`.toLowerCase().includes(term));
  const interests=data.interests.filter(i=>`${i.name} ${i.email} ${i.asset_title} ${i.asset_code}`.toLowerCase().includes(term));
  return <>
    <section className="admin-panel padded recycle-heading"><div className="admin-page-heading"><div><span className="admin-eyebrow">DATA YANG DIHAPUS</span><h1>Recycle Bin</h1><p>Aset dan pengajuan yang dihapus tersimpan di sini. Pulihkan untuk mengembalikannya ke daftar.</p></div><Trash2 size={30}/></div>
      <div className="recycle-tabs" role="group" aria-label="Jenis data"><Button variant={tab==='assets'?'primary':'secondary'} aria-pressed={tab==='assets'} onClick={()=>{setTab('assets');setQ('');}}><Building2 size={17}/>Aset ({data.assets.length})</Button><Button variant={tab==='interests'?'primary':'secondary'} aria-pressed={tab==='interests'} onClick={()=>{setTab('interests');setQ('');}}><Files size={17}/>Pengajuan minat ({data.interests.length})</Button></div>
      <label className="admin-search recycle-search"><Search size={18}/><input aria-label="Cari di Recycle Bin" placeholder={tab==='assets'?'Cari nama atau kode aset...':'Cari pemohon, email, atau aset...'} value={q} onChange={e=>setQ(e.target.value)}/></label>
    </section>
    {error&&<div className="admin-alert error" role="alert">{error} <button type="button" onClick={()=>setRetry(v=>v+1)}>Muat ulang</button></div>}
    <section className="admin-panel recycle-table">{loading?<div className="admin-loading" role="status">Memuat Recycle Bin...</div>:(tab==='assets'?assets:interests).length===0?<div className="admin-empty"><Trash2 size={34}/><h3>{q?'Data tidak ditemukan':'Recycle Bin kosong'}</h3><p>{q?'Coba kata pencarian lain.':'Data yang dihapus akan muncul di sini.'}</p></div>:<div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>{tab==='assets'?'Aset':'Pemohon / aset'}</th><th>Status sebelumnya</th><th>Dihapus pada</th><th>Aksi</th></tr></thead><tbody>
      {tab==='assets'?assets.map(a=><tr key={a.id}><td><strong>{a.title}</strong><small>{a.code}</small></td><td>{a.archived?'Diarsipkan':'Aktif'}</td><td>{formatDate(a.deleted_at)}</td><td><Button variant="secondary" disabled={!!busy} onClick={()=>restore('assets',a.id)}><RotateCcw size={16}/>{busy===`assets-${a.id}`?'Memulihkan...':'Pulihkan'}</Button></td></tr>):interests.map(i=><tr key={i.id}><td><strong>{i.name}</strong><small>{i.email}</small><small>{i.asset_title} · {i.asset_code}</small></td><td><StatusBadge status={i.status}/></td><td>{formatDate(i.deleted_at)}</td><td><Button variant="secondary" disabled={!!busy||!!i.asset_deleted_at} onClick={()=>restore('interests',i.id)}><RotateCcw size={16}/>{busy===`interests-${i.id}`?'Memulihkan...':'Pulihkan'}</Button>{i.asset_deleted_at&&<small className="delete-reason">Pulihkan aset terkait terlebih dahulu di tab Aset.</small>}</td></tr>)}
    </tbody></table></div>}</section>
    <p className="admin-helper">Aset dipulihkan dengan status aktif atau arsip sebelumnya. Pengajuan dan percakapan terkait tetap tersimpan; pengajuan yang dihapus terpisah perlu dipulihkan melalui tab Pengajuan minat.</p>
  </>;
}

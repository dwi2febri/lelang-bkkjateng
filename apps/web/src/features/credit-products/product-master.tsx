"use client";
import {useEffect,useRef,useState} from 'react';
import {Plus,Save,Pencil,Landmark,X} from 'lucide-react';
import {api,errorMessage} from '@/services/api';
import {Button} from '@/components/ui/button';
import type {CreditProduct,CreditRule} from './calculator';
const empty:CreditProduct={id:0,code:'',name:'',description:'',active:true,requiresEmployee:false,version:0,rules:[{audience:'all',minMonths:1,maxMonths:null,flatRate:0,annuityRate:null}]};
const audienceName={all:'Semua pemohon',internal:'Pegawai Internal',external:'Pegawai Eksternal'};
export function ProductMaster(){
 const [products,setProducts]=useState<CreditProduct[]>([]),[draft,setDraft]=useState<CreditProduct|null>(null);
 const [error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[retry,setRetry]=useState(0);
 const editor=useRef<HTMLFormElement>(null);
 useEffect(()=>{const controller=new AbortController();setLoading(true);api.get<CreditProduct[]>('/admin/credit-products',{signal:controller.signal}).then(({data})=>{if(!controller.signal.aborted){setProducts(data);setError('');}}).catch(err=>{if(!controller.signal.aborted)setError(errorMessage(err));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[retry]);
 useEffect(()=>{if(draft)editor.current?.scrollIntoView({behavior:'smooth',block:'start'});},[draft?.id]);
 function patch(value:Partial<CreditProduct>){setDraft(current=>current?{...current,...value}:current);}
 function rule(index:number,value:Partial<CreditRule>){if(draft)patch({rules:draft.rules.map((r,i)=>i===index?{...r,...value}:r)});}
 function addRule(audience:CreditRule['audience']){
  if(!draft)return;
  const rules=draft.rules.map(r=>({...r}));const last=rules.filter(r=>r.audience===audience).sort((a,b)=>a.minMonths-b.minMonths).at(-1);
  if(last&&last.maxMonths===null)last.maxMonths=Math.min(1199,last.minMonths+35);
  rules.push({audience,minMonths:last?(last.maxMonths||0)+1:1,maxMonths:null,flatRate:0,annuityRate:null});patch({rules});
 }
 async function save(event:React.FormEvent){event.preventDefault();if(!draft||busy)return;setBusy(true);setError('');try{
  const {id,...payload}=draft;
  if(id)await api.put(`/admin/credit-products/${id}`,payload);else await api.post('/admin/credit-products',payload);
  setDraft(null);setNotice('Produk kredit berhasil disimpan.');setRetry(value=>value+1);
 }catch(err){setError(errorMessage(err));}finally{setBusy(false);}}
 return <section className="credit-master">
  <div className="admin-page-heading"><div><span className="admin-eyebrow">PENGATURAN PEMBIAYAAN</span><h1>Master Produk Kredit</h1><p>Atur produk, metode bunga, dan rentang tenor untuk simulasi aset.</p></div><Button disabled={busy} onClick={()=>{setDraft(structuredClone(empty));setError('');setNotice('');}}><Plus size={17}/>Tambah produk</Button></div>
  {notice&&<div className="admin-alert" role="status">{notice}</div>}
  {error&&<div className="admin-alert error" role="alert">{error} <button type="button" onClick={()=>setRetry(value=>value+1)}>Muat ulang daftar</button></div>}
  {loading?<p>Memuat produk kredit…</p>:<div className="credit-product-list">{products.map(product=><article className="admin-panel padded" key={product.id}><div className="credit-product-title"><Landmark size={22}/><h2>{product.name}</h2><span>{product.active?'Aktif':'Nonaktif'}</span></div><p>{product.description||'Bunga per tahun mengikuti tenor dan metode.'}</p><ul>{product.rules.map((r,i)=><li key={i}>{product.requiresEmployee?`${audienceName[r.audience]} · `:''}{r.minMonths}–{r.maxMonths??'seterusnya'} bulan: {r.flatRate!==null?`Flat ${r.flatRate}%`:''}{r.flatRate!==null&&r.annuityRate!==null?' / ':''}{r.annuityRate!==null?`Anuitas ${r.annuityRate}%`:''}</li>)}</ul><Button variant="secondary" disabled={busy} onClick={()=>{setDraft(structuredClone(product));setError('');setNotice('');}}><Pencil size={15}/>Edit produk</Button></article>)}</div>}
  {draft&&<form ref={editor} onSubmit={save} className="admin-panel padded credit-product-editor">
   <div className="credit-product-title"><h2>{draft.id?'Edit produk kredit':'Tambah produk kredit'}</h2><Button aria-label="Tutup editor produk" variant="secondary" disabled={busy} onClick={()=>setDraft(null)}><X size={17}/></Button></div>
   <fieldset disabled={busy} className="credit-editor-fields">
    <div className="credit-product-fields"><label>Kode produk<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={2} maxLength={40} value={draft.code} onChange={event=>patch({code:event.target.value})} placeholder="contoh: kredit-usaha"/></label><label>Nama produk<input required minLength={2} maxLength={100} value={draft.name} onChange={event=>patch({name:event.target.value})}/></label><label className="credit-field-wide">Keterangan<textarea maxLength={1000} value={draft.description} onChange={event=>patch({description:event.target.value})}/></label></div>
    <label className="admin-checkbox"><input type="checkbox" checked={draft.active} onChange={event=>patch({active:event.target.checked})}/>Tersedia untuk dipilih pada aset baru</label>
    <label className="admin-checkbox"><input type="checkbox" checked={draft.requiresEmployee} onChange={event=>{const enabled=event.target.checked;patch({requiresEmployee:enabled,rules:enabled?draft.rules.flatMap(r=>(['internal','external'] as const).map(audience=>({...r,audience}))):draft.rules.filter(r=>r.audience==='external').map(r=>({...r,audience:'all'}))});}}/>Bedakan bunga pegawai internal dan eksternal</label>
    <h3>Aturan bunga per tahun</h3><p className="admin-helper">Tenor dalam bulan. Kosongkan batas akhir untuk tanpa batas. Kosongkan bunga metode yang tidak tersedia; angka 0 berarti bunga 0%. Rentang harus berurutan tanpa celah atau tumpang tindih.</p>
    {(draft.requiresEmployee?['internal','external'] as const:['all'] as const).map(audience=><section key={audience} className="credit-rule-group"><h4>{audienceName[audience]}</h4>{draft.rules.map((r,index)=>r.audience!==audience?null:<div className="credit-rule" key={index}><label>Dari bulan<input required type="number" min={1} max={1200} step={1} value={r.minMonths} onChange={event=>rule(index,{minMonths:Number(event.target.value)})}/></label><label>Sampai bulan<input type="number" min={r.minMonths} max={1200} step={1} value={r.maxMonths??''} placeholder="Tanpa batas" onChange={event=>rule(index,{maxMonths:event.target.value===''?null:Number(event.target.value)})}/></label><label>Flat (% / tahun)<input type="number" min={0} max={100} step="0.01" value={r.flatRate??''} placeholder="Tidak tersedia" onChange={event=>rule(index,{flatRate:event.target.value===''?null:Number(event.target.value)})}/></label><label>Anuitas (% / tahun)<input type="number" min={0} max={100} step="0.01" value={r.annuityRate??''} placeholder="Tidak tersedia" onChange={event=>rule(index,{annuityRate:event.target.value===''?null:Number(event.target.value)})}/></label><Button variant="secondary" aria-label={`Hapus aturan ${audienceName[audience]} mulai bulan ${r.minMonths}`} onClick={()=>patch({rules:draft.rules.filter((_,i)=>i!==index)})}><X size={16}/></Button></div>)}<Button variant="secondary" onClick={()=>addRule(audience)} disabled={draft.rules.length>=40}><Plus size={16}/>Tambah rentang tenor</Button></section>)}
    <p className="admin-helper">Perubahan bunga berlaku pada simulasi semua aset yang menggunakan produk ini. Produk nonaktif tetap berlaku pada aset yang sudah terhubung.</p>
    <Button type="submit" disabled={busy}><Save size={17}/>{busy?'Menyimpan…':'Simpan produk'}</Button>
   </fieldset>
  </form>}
 </section>;
}

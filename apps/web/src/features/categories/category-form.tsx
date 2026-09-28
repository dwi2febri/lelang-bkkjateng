"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ArrowLeft,Save,Check} from "lucide-react";
import {api,errorMessage} from "@/services/api";
import {notify} from "@/store/notification-store";
import {CategoryIcon,type Category} from "./categories";
import {CategoryIconPicker} from "./category-icon-picker";
import {CategorySettingsEditor} from "./category-settings-editor";
import {getCategorySettings,validateCategorySettings} from "./settings";
const empty:Category={name:"",label:"",icon:"house",showHome:true,sortOrder:0,version:0};
export function CategoryForm({name}:{name?:string}) {
 const router=useRouter();
 const editing=!!name;
 const [draft,setDraft]=useState<Category>(empty);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [ready,setReady]=useState(false),[reload,setReload]=useState(0);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setReady(false);setError("");
  api.get<Category[]>("/categories",{signal:controller.signal}).then(({data})=>{
   if(controller.signal.aborted)return;
   if(name){const category=data.find(c=>c.name===name);if(!category){setError("Kategori tidak ditemukan.");return;}setDraft(category);}
   else setDraft({...empty,sortOrder:data.length?Math.min(999,Math.max(...data.map(c=>c.sortOrder))+1):0});
   setReady(true);
  }).catch(e=>{if(!controller.signal.aborted)setError(errorMessage(e));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[name,reload]);
 function close(){if(!busy)router.push("/master-kategori");}
 function patch<K extends keyof Category>(key:K,value:Category[K]){setDraft(d=>({...d,[key]:value}));}
 async function save(e:React.FormEvent){e.preventDefault();if(!ready||busy)return;setBusy(true);setError("");try{
  const settings=getCategorySettings(draft.name,draft.settings);
  const normalized={...settings,facilities:settings.facilities.map(s=>s.trim()).filter(Boolean),facilityIcons:Object.fromEntries(settings.facilities.filter(s=>s.trim()&&settings.facilityIcons?.[s]).map(s=>[s.trim(),settings.facilityIcons![s]])),fields:settings.fields.map(f=>({...f,options:f.options.map(s=>s.trim()).filter(Boolean)}))};
  try{validateCategorySettings(normalized);}catch(e){setError((e as Error).message);window.scrollTo({top:0,behavior:"smooth"});return;}
  const payload={...draft,settings:normalized};const {name:code,...fields}=payload;
  if(editing)await api.put(`/admin/categories/${encodeURIComponent(code)}`,fields);else await api.post("/admin/categories",payload);
  notify("Kategori berhasil disimpan.");router.push("/master-kategori");
 }catch(e){setError(errorMessage(e));window.scrollTo({top:0,behavior:"smooth"});}finally{setBusy(false);}}
 return <section className="category-master category-editor-page">
 <Link href="/master-kategori" className="admin-back"><ArrowLeft size={16}/>Kembali ke Master Kategori</Link>
 <div className="category-list-card category-page-heading"><span className="overline">PENGATURAN KATALOG</span><h1>{editing?"Edit kategori":"Tambah kategori"}</h1><p>{editing?`Atur ${name}: identitas, spesifikasi, kelengkapan, dan tampilan detail aset.`:"Lengkapi kategori dan atur konten form serta detail asetnya."}</p></div>
 {error&&<div role="alert" className="category-feedback">{error}{!ready&&<button type="button" className="outline-button" onClick={()=>setReload(v=>v+1)}>Coba lagi</button>}</div>}
 {loading?<div className="admin-loading">Memuat kategori...</div>:ready&&(
 <form className="category-form-card" onSubmit={save} onInvalidCapture={e=>{let node=(e.target as HTMLElement).parentElement;while(node){if(node.tagName==="DETAILS")(node as HTMLDetailsElement).open=true;node=node.parentElement;}}}><fieldset disabled={busy||loading}><label className="admin-field">Kode kategori<input required minLength={2} maxLength={30} readOnly={editing} value={draft.name} onChange={e=>patch("name",e.target.value)} placeholder="Contoh: Apartemen"/><small>Kode tetap digunakan untuk menghubungkan aset dengan kategorinya.</small></label><label className="admin-field">Nama kategori<input required maxLength={80} value={draft.label} onChange={e=>patch("label",e.target.value)} placeholder="Nama yang tampil kepada pengunjung"/></label><label className="admin-field">Urutan tampilan<input type="number" required min={0} max={999} value={draft.sortOrder} onChange={e=>patch("sortOrder",Number(e.target.value))}/></label>
 <CategoryIconPicker value={draft.icon} onChange={icon=>patch("icon",icon)} disabled={busy||loading}/>
 <label className="category-home-toggle"><input type="checkbox" checked={draft.showHome} onChange={e=>patch("showHome",e.target.checked)}/><span><strong>Tampilkan di beranda</strong><small>Kategori tetap tersedia di filter katalog dan formulir aset saat opsi dimatikan.</small></span></label><div className="category-preview"><CategoryIcon name={draft.icon}/><strong>{draft.label||"Nama kategori"}</strong>{draft.showHome&&<span><Check size={14}/>Beranda</span>}</div><CategorySettingsEditor value={getCategorySettings(draft.name,draft.settings)} onChange={value=>patch("settings",value)}/><div className="category-page-actions"><button className="outline-button" type="button" onClick={close}>Batal</button><button className="admin-button" type="submit"><Save size={17}/>{busy?"Menyimpan...":"Simpan kategori"}</button></div></fieldset></form>
 )}</section>;
}

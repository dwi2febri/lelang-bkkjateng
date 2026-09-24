"use client";
import {useCallback,useEffect,useState} from "react";
import {Modal} from "@/components/ui/modal";
import {Plus,Save,Pencil,Check} from "lucide-react";
import {api,errorMessage} from "@/services/api";
import {CategoryIcon,categoryIcons,iconLabels,type Category} from "./categories";
const empty:Category={name:"",label:"",icon:"house",showHome:true,sortOrder:0,version:0};
export function CategoryEditor(){
 const [open,setOpen]=useState(false);
 const [rows,setRows]=useState<Category[]>([]),[draft,setDraft]=useState<Category>(empty),[editing,setEditing]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const close=useCallback(()=>{if(!busy){setOpen(false);setError("");}},[busy]);
 function show(category?:Category){setDraft(category||{...empty,sortOrder:rows.length?Math.min(999,Math.max(...rows.map(c=>c.sortOrder))+1):0});setEditing(!!category);setMessage("");setError("");setOpen(true);}
 async function load(){setLoading(true);setError("");try{setRows((await api.get<Category[]>("/categories")).data);}catch(e){setError(errorMessage(e));}finally{setLoading(false);}}
 useEffect(()=>{void load();},[]);
 function patch<K extends keyof Category>(key:K,value:Category[K]){setDraft(d=>({...d,[key]:value}));setMessage("");}
 async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");setMessage("");try{const {name,...fields}=draft;const response=editing?await api.put<Category[]>(`/admin/categories/${encodeURIComponent(name)}`,fields):await api.post<Category[]>("/admin/categories",draft);setRows(response.data);setOpen(false);setDraft(empty);setEditing(false);setMessage("Kategori berhasil disimpan.");}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
 return <section className="category-master"><div className="category-master-heading"><div><span className="overline">PENGATURAN KATALOG</span><h1>Master Kategori</h1><p>Atur kategori, ikon, dan kategori yang tampil di beranda.</p></div><button type="button" className="outline-button" disabled={busy} onClick={()=>show()}><Plus size={17}/>Tambah kategori</button></div>
 {error&&!open&&<div role="alert" className="category-feedback">{error} <button type="button" onClick={load}>Muat ulang</button></div>}{message&&<p role="status" className="category-feedback success">{message}</p>}
 <div className="category-overview">
 <section className="category-list-card"><div className="category-section-heading"><div><h2>Daftar kategori <small>{rows.length}</small></h2><p>Kelola nama, ikon, urutan, dan tampilan kategori.</p></div></div>
 <div className="category-table-scroll"><table className="category-table"><thead><tr><th scope="col">Kategori</th><th scope="col">Kode</th><th scope="col">Urutan</th><th scope="col">Tampilan beranda</th><th scope="col">Aksi</th></tr></thead><tbody>
 {loading?<tr><td colSpan={5}>Memuat kategori...</td></tr>:!rows.length?<tr><td colSpan={5}>Belum ada kategori. Tambahkan kategori pertama Anda.</td></tr>:rows.map(c=><tr key={c.name}><td><div className="category-table-name"><span className="category-row-icon"><CategoryIcon name={c.icon} size={23}/></span><strong>{c.label}</strong></div></td><td>{c.name}</td><td>{c.sortOrder}</td><td><span className={c.showHome?"category-status visible":"category-status"}>{c.showHome?"Ditampilkan":"Tidak ditampilkan"}</span></td><td><button type="button" className="outline-button" onClick={()=>show(c)} aria-label={`Edit kategori ${c.label}`}><Pencil size={15}/>Edit</button></td></tr>)}
 </tbody></table></div></section>
 <section className="category-list-card"><div className="category-section-heading"><div><h2>Kategori di beranda <small>{rows.filter(c=>c.showHome).length}</small></h2><p>Kategori yang aktif tampil di beranda, sesuai urutan yang diatur.</p></div></div>
 {loading?<p>Memuat kategori...</p>:<div className="category-home-list">{rows.filter(c=>c.showHome).map(c=><button type="button" className="category-home-item" key={c.name} onClick={()=>show(c)} aria-label={`Edit kategori ${c.label}`}><CategoryIcon name={c.icon} size={28}/><strong>{c.label}</strong><small>Urutan {c.sortOrder}</small></button>)}</div>}
 {!loading&&!rows.some(c=>c.showHome)&&<p className="category-empty">Belum ada kategori yang ditampilkan. Aktifkan opsi Tampilkan di beranda melalui Edit.</p>}
 </section></div>
 {open&&<Modal title={editing?"Edit kategori":"Kategori baru"} onClose={close}>
 <div className="category-modal-body">
 {error&&<div role="alert" className="category-feedback">{error}</div>}
 <form className="category-form-card" onSubmit={save}><fieldset disabled={busy||loading}><label className="admin-field">Kode kategori<input required minLength={2} maxLength={30} readOnly={editing} value={draft.name} onChange={e=>patch("name",e.target.value)} placeholder="Contoh: Apartemen"/><small>Kode tetap digunakan untuk menghubungkan aset dengan kategorinya.</small></label><label className="admin-field">Nama kategori<input required maxLength={80} value={draft.label} onChange={e=>patch("label",e.target.value)} placeholder="Nama yang tampil kepada pengunjung"/></label><label className="admin-field">Urutan tampilan<input type="number" required min={0} max={999} value={draft.sortOrder} onChange={e=>patch("sortOrder",Number(e.target.value))}/></label>
 <div className="admin-field"><span>Pilih ikon</span><div className="category-icon-picker">{Object.keys(categoryIcons).map(key=><button type="button" key={key} aria-pressed={draft.icon===key} className={draft.icon===key?"selected":""} onClick={()=>patch("icon",key)}><CategoryIcon name={key}/><span>{iconLabels[key]}</span></button>)}</div></div>
 <label className="category-home-toggle"><input type="checkbox" checked={draft.showHome} onChange={e=>patch("showHome",e.target.checked)}/><span><strong>Tampilkan di beranda</strong><small>Kategori tetap tersedia di filter katalog dan formulir aset saat opsi dimatikan.</small></span></label><div className="category-preview"><CategoryIcon name={draft.icon}/><strong>{draft.label||"Nama kategori"}</strong>{draft.showHome&&<span><Check size={14}/>Beranda</span>}</div><div className="category-modal-actions"><button className="outline-button" type="button" onClick={close}>Batal</button><button className="admin-button" type="submit"><Save size={17}/>{busy?"Menyimpan...":"Simpan kategori"}</button></div></fieldset></form></div></Modal>}</section>;
}

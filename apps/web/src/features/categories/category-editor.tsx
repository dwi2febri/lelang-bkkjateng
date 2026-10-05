"use client";
import {DeleteAction} from "@/components/ui/delete-action";

import {useEffect,useState} from "react";
import Link from "next/link";
import {Plus,Pencil} from "lucide-react";
import {api,errorMessage} from "@/services/api";
import {CategoryIcon,type Category} from "./categories";
export function CategoryEditor(){
 const [rows,setRows]=useState<Category[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 async function load(){setLoading(true);setError("");try{setRows((await api.get<Category[]>("/admin/categories")).data);}catch(e){setError(errorMessage(e));}finally{setLoading(false);}}
 useEffect(()=>{void load();},[]);
 return <section className="category-master"><section className="category-list-card category-directory-card" aria-labelledby="category-directory-title">
 <div className="admin-filter-card-header"><div><span className="admin-eyebrow">PENGATURAN KATALOG</span><h1 id="category-directory-title">Master Kategori</h1><p>Atur kategori, kolom form, spesifikasi, kelengkapan, dan tampilan detail aset.</p></div><div className="admin-filter-card-actions"><span className="admin-filter-total" aria-live="polite">{loading?"Memuat...":error?"Jumlah belum tersedia":<>Total: <strong>{rows.length}</strong> kategori</>}</span><Link className="admin-button admin-button-primary" href="/master-kategori/baru"><Plus size={17}/>Tambah kategori</Link></div></div>
 {error&&<div role="alert" className="category-feedback">{error} <button type="button" onClick={load}>Muat ulang</button></div>}
 <div className="category-table-scroll"><table className="category-table"><thead><tr><th scope="col">Kategori</th><th scope="col">Kode</th><th scope="col">Urutan</th><th scope="col">Tampilan beranda</th><th scope="col">Aksi</th></tr></thead><tbody>
 {loading?<tr><td colSpan={5}>Memuat kategori...</td></tr>:!rows.length?<tr><td colSpan={5}>Belum ada kategori. Tambahkan kategori pertama Anda.</td></tr>:rows.map(c=><tr key={c.name}><td><div className="category-table-name"><span className="category-row-icon"><CategoryIcon name={c.icon} size={23}/></span><strong>{c.label}</strong></div></td><td>{c.name}</td><td>{c.sortOrder}</td><td><span className={c.showHome?"category-status visible":"category-status"}>{c.showHome?"Ditampilkan":"Tidak ditampilkan"}</span></td><td><div className="record-actions"><Link className="outline-button" href={`/master-kategori/${encodeURIComponent(c.name)}/edit`} aria-label={`Edit kategori ${c.label}`}><Pencil size={15}/>Edit</Link><DeleteAction name={c.label} endpoint={`/admin/categories/${encodeURIComponent(c.name)}`} disabledReason={c.assetCount?`Digunakan oleh ${c.assetCount} aset, termasuk arsip dan Recycle Bin.`:undefined} onDeleted={load}/></div>{!!c.assetCount&&<small className="delete-reason">Digunakan oleh {c.assetCount} aset; tidak dapat dihapus.</small>}</td></tr>)}
 </tbody></table></div></section>
</section>;
}

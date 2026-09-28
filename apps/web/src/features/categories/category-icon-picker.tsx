"use client";
import {useCallback,useState} from "react";
import {createPortal} from "react-dom";
import {ChevronDown,Search} from "lucide-react";
import {Modal} from "@/components/ui/modal";
import {CategoryIcon,categoryIcons,iconLabels} from "./categories";

export function CategoryIconPicker({value,onChange,disabled=false}:{value:string;onChange:(icon:string)=>void;disabled?:boolean}) {
 const [open,setOpen]=useState(false);
 const [query,setQuery]=useState("");
 const close=useCallback(()=>setOpen(false),[]);
 const search=query.trim().toLowerCase();
 const choices=Object.keys(categoryIcons).filter(key=>`${iconLabels[key]} ${key}`.toLowerCase().includes(search));
 return <div className="admin-field">
  <span>Ikon kategori</span>
  <button type="button" className="outline-button category-icon-trigger" disabled={disabled} aria-haspopup="dialog" aria-expanded={open} aria-label={`Pilih ikon kategori, saat ini ${iconLabels[value]||value}`} onClick={()=>{setQuery("");setOpen(true);}}>
   <CategoryIcon name={value}/><span><strong>{iconLabels[value]||value}</strong><small>Klik untuk mengganti ikon</small></span><ChevronDown size={18}/>
  </button>
  {open&&createPortal(<div className="admin-app icon-picker-layer category-icon-dialog"><Modal title="Pilih ikon kategori" onClose={close} initialFocus="input[aria-label='Cari ikon kategori']">
   <div className="icon-picker-toolbar">
    <label className="icon-search"><Search size={18}/><input aria-label="Cari ikon kategori" placeholder="Cari ikon: mobil, rumah, pabrik..." value={query} onChange={event=>setQuery(event.target.value)}/></label>
    <p>{choices.length} ikon tersedia. Klik ikon untuk memilih.</p>
   </div>
   <div className="icon-picker-results">
    {choices.length?<div className="icon-browser-grid">{choices.map(key=><button key={key} type="button" aria-label={`Pilih ${iconLabels[key]}`} aria-pressed={value===key} onClick={()=>{onChange(key);close();}}><CategoryIcon name={key} size={30}/><span>{iconLabels[key]}</span></button>)}</div>:<p role="status">Ikon tidak ditemukan. Coba kata pencarian lain.</p>}
   </div>
   <div className="icon-picker-footer"><CategoryIcon name={value} size={20}/><span>Ikon terpilih: <strong>{iconLabels[value]||value}</strong></span></div>
  </Modal></div>,document.body)}
 </div>;
}

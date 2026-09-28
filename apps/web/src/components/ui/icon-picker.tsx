"use client";
import {useCallback,useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {Search} from "lucide-react";
import {Modal} from "./modal";
import {Select} from "./select";
import {CatalogIcon} from "./catalog-icon";
import {fetchIconResource} from "./icon-loader";
import {isIconName} from "@/features/categories/settings";
type Collection={name:string;total:number;samples?:string[];author?:{name:string};license?:{title:string;url?:string}};
const cache=new Map<string,unknown>();
async function getIcons<T>(path:string,signal:AbortSignal):Promise<T> {
 if(cache.has(path))return cache.get(path) as T;
 const response=await fetchIconResource(path,signal);
 if(!response.ok)throw new Error("API ikon belum tersedia. Silakan coba lagi.");
 const data=await response.json();
 if(cache.size>100)cache.clear();
 cache.set(path,data);return data as T;
}
const words:Record<string,string>={rumah:"home",mobil:"car",kendaraan:"vehicle",tanah:"land",gedung:"building",pabrik:"factory",gudang:"warehouse",listrik:"electricity",air:"water",kunci:"key",kamera:"camera",parkir:"parking",bensin:"fuel",mesin:"engine",tahun:"calendar",jarak:"gauge",warna:"palette",sekolah:"school",taman:"garden",kolam:"pool",kamar:"bed",mandi:"shower",luas:"ruler",jalan:"road",ban:"tire",telepon:"phone",pesawat:"plane",kereta:"train",kapal:"ship"};
export function IconPicker({value,onChange,label="Pilih ikon",disabled=false}:{value:string;onChange:(name:string)=>void;label?:string;disabled?:boolean}) {
 const [open,setOpen]=useState(false);
 const close=useCallback(()=>setOpen(false),[]);
 return <div className="icon-picker-control"><button type="button" disabled={disabled} className="outline-button icon-picker-trigger" aria-label={label} title={disabled?"Isi nama pilihan terlebih dahulu":value} onClick={()=>setOpen(true)}><CatalogIcon name={value} size={24}/><span>{label}<small>{value}</small></span></button>
 {open&&createPortal(<div className="admin-app icon-picker-layer"><Modal title={label} onClose={close} initialFocus="input[aria-label='Cari ikon']"><IconBrowser value={value} onSelect={name=>{onChange(name);close();}}/></Modal></div>,document.body)}</div>;
}
function IconBrowser({value,onSelect}:{value:string;onSelect:(name:string)=>void}) {
 const [collections,setCollections]=useState<Record<string,Collection>>({});
 const [query,setQuery]=useState("");const [prefix,setPrefix]=useState("");
 const [icons,setIcons]=useState<string[]>([]),[limit,setLimit]=useState(96),[hasMore,setHasMore]=useState(false);
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[retry,setRetry]=useState(0),[highlighted,setHighlighted]=useState(value);
 const [imageRetry,setImageRetry]=useState(0),[imageErrors,setImageErrors]=useState<string[]>([]);
 const reportImageStatus=useCallback((name:string,failed:boolean)=>setImageErrors(previous=>failed?(previous.includes(name)?previous:[...previous,name]):(previous.includes(name)?previous.filter(item=>item!==name):previous)),[]);
 useEffect(()=>{const controller=new AbortController();
  getIcons<Record<string,Collection>>("collections",controller.signal).then(data=>{if(!controller.signal.aborted)setCollections(data);}).catch(()=>{if(!controller.signal.aborted){setError("Daftar koleksi gagal dimuat. Periksa koneksi internet dan coba lagi.");setLoading(false);}});
  return()=>controller.abort();
 },[retry]);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError("");setIcons([]);
  const timer=setTimeout(async()=>{try{
   let names:string[]=[];let more=false;
   const q=query.trim().toLowerCase();
   if(q){const translated=q.split(/\s+/).map(word=>words[word]||word).join(" ");
    for(let start=0;start<limit;start+=96){
      const params=new URLSearchParams({query:translated,limit:"97",start:String(start)});if(prefix)params.set("prefix",prefix);
      const data=await getIcons<{icons:string[]}>(`search?${params}`,controller.signal);
      names.push(...data.icons.slice(0,96));more=data.icons.length>96;
      if(!more)break;
    }
   } else if(prefix){
    const data=await getIcons<{uncategorized?:string[];categories?:Record<string,string[]>}>(`collection?prefix=${encodeURIComponent(prefix)}`,controller.signal);
    names=[...new Set([...(data.uncategorized||[]),...Object.values(data.categories||{}).flat()])].sort().map(name=>`${prefix}:${name}`);more=names.length>limit;
   } else {names=[...new Set([value,...Object.entries(collections).flatMap(([key,c])=>(c.samples||[]).map(name=>`${key}:${name}`))])];more=names.length>limit;}
   if(!controller.signal.aborted){setIcons(names.filter(isIconName).slice(0,limit));setHasMore(more);setLoading(false);}
  }catch{if(!controller.signal.aborted){setError("Ikon gagal dimuat. Periksa koneksi internet atau coba lagi.");setLoading(false);}}},300);
  return()=>{clearTimeout(timer);controller.abort();};
 },[query,prefix,limit,collections,retry,value]);
 const collection=collections[highlighted.split(":")[0]];
 const failedCount=imageErrors.filter(name=>icons.includes(name)).length;
 return <>
  <div className="icon-picker-toolbar"><label className="icon-search"><Search size={18}/><input aria-label="Cari ikon" autoFocus placeholder="Cari ikon: mobil, AC, kamera, home..." value={query} onChange={e=>{setQuery(e.target.value);setLimit(96);}}/></label>
   <Select label="Koleksi ikon" name="iconCollection" value={prefix} onChange={v=>{setPrefix(v);setLimit(96);}} options={[{value:"",label:"Semua koleksi"},...Object.entries(collections).sort((a,b)=>a[1].name.localeCompare(b[1].name)).map(([value,c])=>({value,label:`${c.name} (${c.total.toLocaleString("id-ID")})`}))]}/>
   <p>{Object.keys(collections).length.toLocaleString("id-ID")} koleksi · {Object.values(collections).reduce((sum,c)=>sum+c.total,0).toLocaleString("id-ID")} ikon. {query.trim()?"Hasil pencarian":"Pilih koleksi untuk melihat seluruh ikonnya."}</p>
  </div>
  <div className="icon-picker-results" aria-busy={loading}>
   {failedCount>0&&<div role="status" className="icon-picker-error">{failedCount} gambar ikon belum termuat.<button type="button" className="outline-button" onClick={()=>{setImageErrors([]);setImageRetry(v=>v+1);}}>Muat ulang ikon</button></div>}
   {error&&<div role="alert" className="icon-picker-error">{error}<button type="button" className="outline-button" onClick={()=>setRetry(v=>v+1)}>Coba lagi</button></div>}
   {loading?<p role="status">Memuat ikon...</p>:!error&&icons.length===0?<p>Tidak ada ikon yang cocok. Coba kata lain atau nama dalam bahasa Inggris.</p>:<div className="icon-browser-grid">{icons.map(name=><button key={name} type="button" title={name} aria-label={`Pilih ${name}`} aria-pressed={name===value} onFocus={()=>setHighlighted(name)} onMouseEnter={()=>setHighlighted(name)} onClick={()=>onSelect(name)}><CatalogIcon name={name} size={30} retryKey={imageRetry} onLoadStatus={reportImageStatus}/><span>{name.split(":")[1]}</span><small>{name.split(":")[0]}</small></button>)}</div>}
   {!loading&&!error&&hasMore&&<button type="button" className="outline-button icon-load-more" onClick={()=>setLimit(v=>v+96)}>Muat lebih banyak</button>}
  </div>
  <div className="icon-picker-footer"><strong>{highlighted}</strong><span>{collection?.name}{collection?.author?.name?` · ${collection.author.name}`:""}{collection?.license?.title?` · ${collection.license.title}`:""}</span><a href={`https://icon-sets.iconify.design/${highlighted.replace(":","/")}/`} target="_blank" rel="noopener noreferrer">Detail ikon & lisensi ↗</a></div>
 </>;
}

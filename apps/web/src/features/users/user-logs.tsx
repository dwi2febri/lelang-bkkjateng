"use client";
import { useEffect, useState } from "react";
import { Activity, ShieldCheck, Users, Search, RefreshCw } from "lucide-react";
import { ActivityHistory } from "./activity-history";
import { api, errorMessage } from "@/services/api";
type Entry = {id:string; name:string; userId:number|null; identity:"account"|"applicant"|"guest"; ip:string; path:string; firstSeen:string; lastSeen:string; online:number};
type Result = {data:Entry[]; total:number; online:number};
const time = (value:string) => new Date(value).toLocaleString("id-ID",{timeZone:"Asia/Jakarta",dateStyle:"medium",timeStyle:"medium"});
export function UserLogs() {
  const [browserPanel,setBrowserPanel]=useState(false);
  const [summary,setSummary]=useState({total:0,online:0});
  const [type,setType]=useState<"internal"|"external">("internal");
  const [status,setStatus]=useState("all"),[search,setSearch]=useState(""),[query,setQuery]=useState("");
  const [page,setPage]=useState(1),[retry,setRetry]=useState(0);
  const [result,setResult]=useState<Result>({data:[],total:0,online:0});
  const [error,setError]=useState(""),[loading,setLoading]=useState(true),[updated,setUpdated]=useState("");
  useEffect(()=>{
    const controller=new AbortController();let pending=false;
    setLoading(true);setError("");setResult({data:[],total:0,online:0});setUpdated("");
    async function load() {
      if(pending || document.visibilityState!=="visible")return;
      pending=true;
      try {
        const [response,counts]=await Promise.all([api.get<Result>("/admin/user-logs",{params:{type,status,q:query,page},signal:controller.signal}),api.get<Result>("/admin/user-logs",{params:{type},signal:controller.signal})]);
        if(!controller.signal.aborted) {setResult(response.data);setSummary({total:counts.data.total,online:counts.data.online});setError("");setUpdated(new Date().toLocaleTimeString("id-ID"));}
      } catch(err) {if(!controller.signal.aborted)setError(errorMessage(err));}
      finally {pending=false;if(!controller.signal.aborted)setLoading(false);}
    }
    void load();const timer=setInterval(load,15000);document.addEventListener("visibilitychange",load);
    return ()=>{controller.abort();clearInterval(timer);document.removeEventListener("visibilitychange",load);};
  },[type,status,query,page,retry]);
  return <section className="user-log-page">
    <div className="user-log-heading"><div><span className="user-log-eyebrow">MONITOR AKTIVITAS</span><h1>Log User</h1><p>Pantau pengguna internal dan pengunjung portal yang sedang aktif.</p></div><span className="user-log-live"><Activity size={16}/>{error?"Koneksi terputus":"Pembaruan otomatis Â· 15 detik"}</span></div>
    <div className="user-log-tabs" role="tablist" aria-label="Jenis pengguna">
      {(["internal","external"] as const).map((item,index)=><button key={item} id={`log-tab-${item}`} type="button" role="tab" aria-selected={type===item} aria-controls="user-log-panel" tabIndex={type===item?0:-1} onKeyDown={event=>{if(["ArrowLeft","ArrowRight","Home","End"].includes(event.key)){event.preventDefault();const next=event.key==="Home"?"internal":event.key==="End"?"external":item==="internal"?"external":"internal";setType(next);setPage(1);setBrowserPanel(false);document.getElementById(`log-tab-${next}`)?.focus();}}} onClick={()=>{setType(item);setPage(1);setBrowserPanel(false);}}>{index===0?<ShieldCheck size={19}/>:<Users size={19}/>}User {index===0?"Internal":"Eksternal"}</button>)}
    </div>
    <div role="tabpanel" id="user-log-panel" aria-labelledby={`log-tab-${type}`}>
      <div className="user-log-summary">
        <button type="button" aria-expanded={browserPanel && status==="online"} aria-controls="user-browser-details" onClick={()=>{setBrowserPanel(true);setStatus("online");setPage(1);setQuery("");setSearch("");}}><span>Aktif sekarang</span><strong>{error?"?":summary.online}</strong><small>Klik untuk melihat pengguna yang aktif ?</small></button>
        <button type="button" aria-expanded={browserPanel && status==="all"} aria-controls="user-browser-details" onClick={()=>{setBrowserPanel(true);setStatus("all");setPage(1);setQuery("");setSearch("");}}><span>Browser tercatat</span><strong>{error?"?":summary.total}</strong><small>Klik untuk melihat semua pengguna / browser ?</small></button>
        <div><span>Terakhir diperbarui</span><strong className="user-log-clock">{updated||"?"}</strong><small>Waktu aktivitas ditampilkan dalam WIB</small></div>
      </div>
      {browserPanel && <div className="user-log-card" id="user-browser-details">
        <div className="user-log-panel-heading"><h2>{status==="online"?"Pengguna aktif sekarang":"Browser tercatat"}</h2><button type="button" onClick={()=>setBrowserPanel(false)}>Tutup daftar</button></div>
        <form className="user-log-tools" onSubmit={event=>{event.preventDefault();setPage(1);setQuery(search.trim());}}><label><Search size={17}/><input aria-label="Cari nama, IP, atau halaman" placeholder="Cari nama, IP, atau halamanâ€¦" value={search} maxLength={100} onChange={event=>setSearch(event.target.value)}/></label><button type="submit">Cari</button><select aria-label="Status aktivitas" value={status} onChange={event=>{setStatus(event.target.value);setPage(1);}}><option value="all">Semua aktivitas</option><option value="online">Aktif sekarang</option></select><button type="button" onClick={()=>setRetry(value=>value+1)} aria-label="Muat ulang log"><RefreshCw size={17}/></button></form>
        {error && <p className="user-log-error" role="alert">{error} Data terakhir mungkin sudah berubah.</p>}
        <div className="user-log-table"><table><thead><tr><th>Pengguna</th><th>Status</th><th>Alamat IP</th><th>Halaman terakhir</th><th>Pertama terlihat</th><th>Aktivitas terakhir</th></tr></thead><tbody>
          {loading?<tr><td colSpan={6}>Memuat log penggunaâ€¦</td></tr>:result.data.length?result.data.map(row=><tr key={row.id}><td><strong>{row.name}</strong><small>{row.identity==="guest"?"Tamu":row.identity==="applicant"?"Nama dari pengajuan":"Akun terdaftar"}</small></td><td><span className={`user-log-status${row.online&&!error?" online":""}`}>{error?"Belum terverifikasi":row.online?"Aktif":"Tidak aktif"}</span></td><td>{row.ip}</td><td className="user-log-path">{row.path}</td><td>{time(row.firstSeen)}</td><td>{time(row.lastSeen)}</td></tr>):<tr><td colSpan={6}>Belum ada aktivitas yang sesuai.</td></tr>}
        </tbody></table></div>
        <div className="user-log-pagination"><span>{result.total} catatan Â· Halaman {page}</span><button type="button" disabled={page===1} onClick={()=>setPage(value=>value-1)}>Sebelumnya</button><button type="button" disabled={page*30>=result.total} onClick={()=>setPage(value=>value+1)}>Berikutnya</button></div>
      </div>
      }
      <ActivityHistory key={type} type={type} />
      <p className="user-log-note">Aktif berarti halaman sedang terbuka dan terlihat. {type==="external"?"Tamu ditampilkan dengan IP; nama pengajuan dikenali dari browser yang sama; pengguna login ditampilkan dengan nama akun.":"Sesi yang sudah logout atau kedaluwarsa tidak dihitung aktif."}</p>
    </div>
  </section>;
}

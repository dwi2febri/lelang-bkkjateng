"use client";
import { useEffect, useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { api, errorMessage } from "@/services/api";
const actions: Record<string,string> = {visit:"Membuka halaman",resume:"Kembali aktif",session:"Perubahan sesi akun",submission:"Mengirim pengajuan minat"};
type Event = {id:number; name:string; identity:string; ip:string; path:string; action:string; occurredAt:string};
export function ActivityHistory({type}:{type:"internal"|"external"}) {
  const [result,setResult]=useState<{data:Event[];total:number}>({data:[],total:0});
  const [search,setSearch]=useState(""),[query,setQuery]=useState(""),[action,setAction]=useState("all");
  const [page,setPage]=useState(1),[retry,setRetry]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState("");
  useEffect(()=>{
    const controller=new AbortController();let pending=false;
    setLoading(true);setError("");
    async function load(){
      if(pending||document.visibilityState!=="visible")return;pending=true;
      try {const response=await api.get("/admin/user-activity",{params:{type,q:query,action,page},signal:controller.signal});if(!controller.signal.aborted){setResult(response.data);setError("");}}
      catch(err){if(!controller.signal.aborted)setError(errorMessage(err));}
      finally{pending=false;if(!controller.signal.aborted)setLoading(false);}
    }
    void load();const timer=setInterval(load,15000);document.addEventListener("visibilitychange",load);
    return ()=>{controller.abort();clearInterval(timer);document.removeEventListener("visibilitychange",load);};
  },[type,query,action,page,retry]);
  return <section className="user-log-card user-activity-history" aria-label="Riwayat aktivitas">
    <div className="user-log-panel-heading"><div><h2>Riwayat aktivitas</h2><p>Aktivitas pengguna dari waktu ke waktu, dimulai sejak pencatatan riwayat diaktifkan.</p></div></div>
    <form className="user-log-tools" onSubmit={event=>{event.preventDefault();setPage(1);setQuery(search.trim());}}>
      <label><Search size={17}/><input aria-label="Cari riwayat aktivitas" placeholder="Cari nama, IP, atau halaman…" value={search} maxLength={100} onChange={event=>setSearch(event.target.value)}/></label><button type="submit">Cari</button>
      <select aria-label="Jenis aktivitas" value={action} onChange={event=>{setAction(event.target.value);setPage(1);}}><option value="all">Semua aktivitas</option>{Object.entries(actions).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>
      <button type="button" aria-label="Muat ulang riwayat" onClick={()=>setRetry(value=>value+1)}><RefreshCw size={17}/></button>
    </form>
    {error&&<p role="alert" className="user-log-error">{error}</p>}
    <div className="user-log-table"><table><thead><tr><th>Waktu (WIB)</th><th>Pengguna</th><th>Aktivitas</th><th>Halaman</th><th>Alamat IP</th></tr></thead><tbody>
      {loading?<tr><td colSpan={5}>Memuat riwayat…</td></tr>:result.data.length?result.data.map(row=><tr key={row.id}><td>{new Date(row.occurredAt).toLocaleString("id-ID",{timeZone:"Asia/Jakarta",dateStyle:"medium",timeStyle:"medium"})}</td><td><strong>{row.name}</strong><small>{row.identity==="guest"?"Tamu":row.identity==="applicant"?"Nama dari pengajuan":"Akun terdaftar"}</small></td><td>{actions[row.action]||row.action}</td><td className="user-log-path">{row.path}</td><td>{row.ip}</td></tr>):<tr><td colSpan={5}>Belum ada riwayat aktivitas yang sesuai.</td></tr>}
    </tbody></table></div>
    <div className="user-log-pagination"><span>{result.total} aktivitas · Halaman {page}</span><button type="button" disabled={page===1} onClick={()=>setPage(value=>value-1)}>Sebelumnya</button><button type="button" disabled={page*30>=result.total} onClick={()=>setPage(value=>value+1)}>Berikutnya</button></div>
  </section>;
}

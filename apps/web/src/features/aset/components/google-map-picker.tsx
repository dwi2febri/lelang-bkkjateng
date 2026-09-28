"use client";
import {useEffect,useRef,useState} from "react";
import {Crosshair,MapPin,Search,Trash2} from "lucide-react";
import {loadGoogleMaps,findMapAddress,onMapsAuthenticationError} from "../services/google-maps-loader";
import {isMapPoint,pointGoogleMapsUrl,type MapPoint} from "../google-maps";

const centralJava={lat:-7.15,lng:110.14};
export function GoogleMapPicker({value,onChange,address,disabled=false}:{value:MapPoint|null;onChange:(point:MapPoint|null)=>void;address:string;disabled?:boolean}) {
 const canvas=useRef<HTMLDivElement>(null);
 const map=useRef<google.maps.Map|null>(null);
 const marker=useRef<google.maps.marker.AdvancedMarkerElement|null>(null);
 const current=useRef({value,onChange,disabled});current.current={value,onChange,disabled};
 const mounted=useRef(false),searchVersion=useRef(0);
 const [ready,setReady]=useState(false),[error,setError]=useState(""),[retry,setRetry]=useState(0);
 const [query,setQuery]=useState(""),[searching,setSearching]=useState(false),[searchMessage,setSearchMessage]=useState("");
 useEffect(()=>{
  mounted.current=true;let disposed=false;
  const listeners:google.maps.MapsEventListener[]=[];
  setReady(false);setError("");setSearching(false);
  const unsubscribe=onMapsAuthenticationError(()=>{if(!disposed){setError("Google Maps menolak akses. API key perlu mengizinkan Maps JavaScript API dan domain aplikasi ini.");setReady(false);}});
  const timeout=setTimeout(()=>{if(!disposed&&!map.current)setError("Peta belum berhasil dimuat. Periksa koneksi lalu coba lagi.");},20000);
  let observer:ResizeObserver|undefined;
  loadGoogleMaps().then(({maps,markers})=>{
   if(disposed||!canvas.current)return;
   const point=current.current.value;
   const instance=new maps.Map(canvas.current,{center:point?{lat:point.latitude,lng:point.longitude}:centralJava,zoom:point?17:8,mapId:process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID||"DEMO_MAP_ID",streetViewControl:false,fullscreenControl:true,mapTypeControl:true,gestureHandling:"cooperative",clickableIcons:false});
   const pin=new markers.AdvancedMarkerElement({map:point?instance:null,position:point?{lat:point.latitude,lng:point.longitude}:undefined,gmpDraggable:!current.current.disabled,title:"Lokasi aset. Geser pin untuk mengubah titik."});
   map.current=instance;marker.current=pin;
   const select=(lat:number,lng:number)=>{
    if(current.current.disabled)return;
    const selected={latitude:Number(lat.toFixed(7)),longitude:Number(lng.toFixed(7))};
    if(isMapPoint(selected)){pin.position={lat:selected.latitude,lng:selected.longitude};pin.map=instance;current.current.onChange(selected);}
   };
   listeners.push(instance.addListener("click",(event:google.maps.MapMouseEvent)=>{if(event.latLng)select(event.latLng.lat(),event.latLng.lng());}));
   listeners.push(pin.addListener("dragend",()=>{const p=pin.position;if(p)select(typeof p.lat==="function"?p.lat():p.lat,typeof p.lng==="function"?p.lng():p.lng);}));
   observer=new ResizeObserver(()=>{if(canvas.current?.offsetWidth){const center=instance.getCenter();google.maps.event.trigger(instance,"resize");if(center)instance.setCenter(center);}});
   observer.observe(canvas.current);
   clearTimeout(timeout);setError("");setReady(true);
  }).catch(()=>{if(!disposed)setError("Google Maps gagal dimuat. Periksa koneksi atau konfigurasi API key, lalu coba lagi.");});
  return()=>{disposed=true;mounted.current=false;searchVersion.current++;clearTimeout(timeout);unsubscribe();observer?.disconnect();listeners.forEach(listener=>listener.remove());if(marker.current)marker.current.map=null;marker.current=null;map.current=null;};
 },[retry]);
 useEffect(()=>{
  const pin=marker.current,instance=map.current;if(!pin||!instance)return;
  pin.gmpDraggable=!disabled;
  if(value){pin.position={lat:value.latitude,lng:value.longitude};pin.map=instance;}else pin.map=null;
 },[value,disabled,ready]);
 async function search() {
  const text=query.trim()||address.trim();if(!text||!ready||disabled||searching)return;
  const version=++searchVersion.current;setSearching(true);setSearchMessage("");
  try{
   const result=await findMapAddress(text);
   if(!mounted.current||version!==searchVersion.current)return;
   if(!result?.location){setSearchMessage("Alamat tidak ditemukan. Coba nama wilayah atau geser peta secara manual.");return;}
   if(result.viewport)map.current?.fitBounds(result.viewport);else{map.current?.setCenter(result.location);map.current?.setZoom(17);}
   setSearchMessage("Alamat ditemukan. Klik lokasi yang tepat pada peta untuk memasang pin.");
  }catch{if(mounted.current&&version===searchVersion.current)setSearchMessage("Pencarian alamat belum tersedia untuk key ini. Anda tetap bisa menggeser peta dan memilih titik secara langsung.");}
  finally{if(mounted.current&&version===searchVersion.current)setSearching(false);}
 }
 return <div className="google-map-picker">
  <div className="google-map-search"><label className="admin-field"><span>Cari alamat / tempat</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder={address||"Contoh: Simpang Lima, Semarang"} disabled={disabled} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();void search();}}}/></label><button className="outline-button" type="button" disabled={!ready||disabled||searching||!(query.trim()||address.trim())} onClick={()=>void search()}><Search size={17}/>{searching?"Mencari...":"Cari di peta"}</button></div>
  {searchMessage&&<p className="google-map-message" role="status">{searchMessage}</p>}
  <div className="google-map-frame"><div className="google-map-canvas" ref={canvas} aria-label="Peta untuk memilih lokasi aset"/>{!ready&&!error&&<div className="google-map-overlay" role="status">Memuat Google Maps...</div>}{error&&<div className="google-map-overlay" role="alert"><p>{error}</p><button type="button" className="outline-button" onClick={()=>setRetry(v=>v+1)}>Coba lagi</button></div>}</div>
  <div className="google-map-selection"><div><MapPin size={18}/>{value?<span><strong>Titik lokasi dipilih</strong><small>{value.latitude.toFixed(7)}, {value.longitude.toFixed(7)}</small></span>:<span>Belum ada titik. Klik peta untuk memilih lokasi.</span>}</div><div className="google-map-actions"><button type="button" className="outline-button" disabled={!ready||disabled} onClick={()=>{const center=map.current?.getCenter();if(center)onChange({latitude:Number(center.lat().toFixed(7)),longitude:Number(center.lng().toFixed(7))});}}><Crosshair size={16}/>Pilih titik tengah</button>{value&&<button type="button" className="outline-button" disabled={disabled} onClick={()=>onChange(null)}><Trash2 size={16}/>Hapus titik</button>}</div></div>
  {value&&<a className="asset-map-link" href={pointGoogleMapsUrl(value)} target="_blank" rel="noopener noreferrer">Buka titik terpilih di Google Maps</a>}
 </div>;
}

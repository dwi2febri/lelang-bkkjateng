"use client";
import {useEffect,useRef,useState} from "react";
import {loadGoogleMaps,onMapsAuthenticationError} from "@/features/aset/services/google-maps-loader";
import type {MapPoint} from "@/features/aset/google-maps";

export function AssetLocationMap({latitude,longitude,title,forPrint=false}:{title:string;forPrint?:boolean}&MapPoint) {
 const canvas=useRef<HTMLDivElement>(null);
 const [visible,setVisible]=useState(forPrint),[ready,setReady]=useState(false),[error,setError]=useState(""),[retry,setRetry]=useState(0);
 useEffect(()=>{
  if(!canvas.current||forPrint)return;
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:"250px"});
  observer.observe(canvas.current);return()=>observer.disconnect();
 },[forPrint]);
 useEffect(()=>{
  if(!visible)return;
  let disposed=false;
  let marker:google.maps.marker.AdvancedMarkerElement|undefined;
  let resize:ResizeObserver|undefined;
  let tilesListener:google.maps.MapsEventListener|undefined;
  setReady(false);setError("");
  const unsubscribe=onMapsAuthenticationError(()=>{if(!disposed)setError("Peta belum tersedia. Gunakan tautan Google Maps di bawah.");});
  const timeout=setTimeout(()=>{if(!disposed)setError("Peta belum berhasil dimuat. Periksa koneksi lalu coba lagi.");},20000);
  loadGoogleMaps().then(({maps,markers})=>{
   if(disposed||!canvas.current)return;
   const position={lat:latitude,lng:longitude};
   const map=new maps.Map(canvas.current,{center:position,zoom:16,mapId:process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID||"DEMO_MAP_ID",gestureHandling:forPrint?"none":"cooperative",streetViewControl:false,mapTypeControl:!forPrint,fullscreenControl:!forPrint,disableDefaultUI:forPrint,...(forPrint?{renderingType:maps.RenderingType.RASTER}:{})});
   marker=new markers.AdvancedMarkerElement({map,position,title,gmpDraggable:false});
   resize=new ResizeObserver(()=>{if(canvas.current?.offsetWidth){google.maps.event.trigger(map,"resize");map.setCenter(position);}});
   resize.observe(canvas.current);
   if(forPrint){tilesListener=map.addListener("tilesloaded",()=>{if(!disposed){clearTimeout(timeout);setError("");setReady(true);}});}
   else {clearTimeout(timeout);setError("");setReady(true);}
  }).catch(()=>{if(!disposed){clearTimeout(timeout);setError("Peta gagal dimuat. Coba lagi atau buka tautan Google Maps di bawah.");}});
  return()=>{disposed=true;clearTimeout(timeout);unsubscribe();resize?.disconnect();tilesListener?.remove();if(marker)marker.map=null;};
 },[visible,latitude,longitude,title,retry,forPrint]);
 return <div className="asset-location-map" data-print-map-status={forPrint?(error?"error":ready?"ready":"loading"):undefined}><div ref={canvas} className="asset-location-map-canvas" aria-label={`Peta lokasi ${title}`}/>{(!ready||error)&&<div className="asset-location-map-status" role={error?"alert":"status"}>{error||"Memuat peta lokasi..."}{error&&<button type="button" className="text-button" onClick={()=>setRetry(value=>value+1)}>Coba lagi</button>}</div>}</div>;
}

"use client";
import {useEffect,useRef,useState} from "react";
import {ImageOff} from "lucide-react";
import {loadIconImage} from "./icon-loader";
import {FileText,Ruler,Building2,BedDouble,ShowerHead,Layers,Zap,SquareParking,CalendarDays,Badge,CarFront,Gauge,Cog,Fuel,Palette,ClipboardCheck,CalendarCheck,LandPlot,Mountain,Route,ArrowUpDown,Weight,Factory,Store,Snowflake,ShieldCheck,CircleParking,Camera,Radar,BookOpen,KeyRound,Circle,Plane,Landmark,Film,Pill,Sofa,Warehouse,Dumbbell,Bus,Waves,ShoppingCart,Utensils,Church,Hospital,Phone,School,TrainFront,Trees,Truck,Container,Flame,Droplets,CircleCheck,CircleHelp,type LucideIcon} from "lucide-react";
import {isIconName} from "@/features/categories/settings";
const local:Record<string,LucideIcon>={"file-text":FileText,ruler:Ruler,"building-2":Building2,"bed-double":BedDouble,"shower-head":ShowerHead,layers:Layers,zap:Zap,"square-parking":SquareParking,"calendar-days":CalendarDays,badge:Badge,"car-front":CarFront,gauge:Gauge,cog:Cog,fuel:Fuel,palette:Palette,"clipboard-check":ClipboardCheck,"calendar-check":CalendarCheck,"land-plot":LandPlot,mountain:Mountain,route:Route,"arrow-up-down":ArrowUpDown,weight:Weight,factory:Factory,store:Store,snowflake:Snowflake,"shield-check":ShieldCheck,"circle-parking":CircleParking,camera:Camera,radar:Radar,"book-open":BookOpen,"key-round":KeyRound,circle:Circle,plane:Plane,landmark:Landmark,film:Film,pill:Pill,sofa:Sofa,warehouse:Warehouse,dumbbell:Dumbbell,bus:Bus,waves:Waves,"shopping-cart":ShoppingCart,utensils:Utensils,church:Church,hospital:Hospital,phone:Phone,school:School,"train-front":TrainFront,trees:Trees,truck:Truck,container:Container,flame:Flame,droplets:Droplets,"circle-check":CircleCheck};
export function CatalogIcon({name,size=22,retryKey=0,onLoadStatus}:{name:string;size?:number;retryKey?:number;onLoadStatus?:(name:string,failed:boolean)=>void}) {
 const Icon=name.startsWith("lucide:")?local[name.slice(7)]:undefined;
 if(Icon)return <Icon size={size} aria-hidden="true" className="catalog-config-icon"/>;
 if(!isIconName(name))return <CircleHelp size={size} aria-hidden="true" className="catalog-config-icon"/>;
 return <RemoteIcon key={name} name={name} size={size} retryKey={retryKey} onLoadStatus={onLoadStatus}/>;
}
function RemoteIcon({name,size,retryKey,onLoadStatus}:{name:string;size:number;retryKey:number;onLoadStatus?:(name:string,failed:boolean)=>void}) {
 const ref=useRef<HTMLSpanElement>(null);
 const [visible,setVisible]=useState(false),[source,setSource]=useState(""),[failed,setFailed]=useState(false),[onlineRetry,setOnlineRetry]=useState(0);
 useEffect(()=>{
  if(!ref.current||typeof IntersectionObserver==="undefined"){setVisible(true);return;}
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:"150px"});
  observer.observe(ref.current);return()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  if(!visible)return;
  let mounted=true;setFailed(false);onLoadStatus?.(name,false);
  loadIconImage(name).then(src=>{if(mounted)setSource(src);}).catch(()=>{if(mounted){setFailed(true);onLoadStatus?.(name,true);}});
  return()=>{mounted=false;onLoadStatus?.(name,false);};
 },[name,visible,retryKey,onlineRetry,onLoadStatus]);
 useEffect(()=>{if(!failed)return;const retry=()=>setOnlineRetry(v=>v+1);window.addEventListener("online",retry);return()=>window.removeEventListener("online",retry);},[failed]);
 return <span ref={ref} data-icon={name} className="catalog-config-icon catalog-remote-icon" style={{width:size,height:size}} title={failed?"Ikon gagal dimuat. Coba muat ulang.":undefined} aria-hidden="true">
  {source&&!failed?<img src={source} width={size} height={size} alt="" onLoad={()=>onLoadStatus?.(name,false)} onError={()=>{setFailed(true);onLoadStatus?.(name,true);}}/>:failed?<ImageOff size={size}/>:<span className="catalog-icon-placeholder"/>}
 </span>;
}

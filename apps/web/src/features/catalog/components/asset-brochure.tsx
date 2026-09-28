"use client";
import {useEffect,useRef,type RefObject} from "react";
import type {CatalogAsset} from "../types";
import {formatSpec,specValue,specificationIcon,facilityIcon,type CategorySettings} from "@/features/categories/settings";
import {isMapPoint,pointGoogleMapsUrl,googleMapsSearchUrl} from "@/features/aset/google-maps";
import {CatalogIcon} from "@/components/ui/catalog-icon";
import {MapPin,Building2,FileText,ArrowUpRight} from "lucide-react";
import {AssetLocationMap} from "./asset-location-map";

const rupiah=(value:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(value);
const dateTime=(value:Date)=>new Intl.DateTimeFormat("id-ID",{dateStyle:"long",timeStyle:"medium",timeZone:"Asia/Jakarta"}).format(value)+" WIB";

export function AssetBrochure({asset,config,categoryLabel,rootRef,preparing=false}:{asset:CatalogAsset;config:CategorySettings;categoryLabel:string;rootRef:RefObject<HTMLDivElement|null>;preparing?:boolean}) {
 const timestamp=useRef<HTMLSpanElement>(null);
 useEffect(()=>{
  const update=()=>{if(timestamp.current)timestamp.current.textContent=dateTime(new Date());};
  update();window.addEventListener("beforeprint",update);
  return()=>window.removeEventListener("beforeprint",update);
 },[]);
 const photos=[...new Set([asset.image,...(asset.photos||[])].filter(Boolean))];
 const rows=Array.from({length:Math.ceil(Math.max(0,photos.length-4)/4)},(_,index)=>photos.slice(4+index*4,8+index*4));
 const details=asset.details||{};
 const fields=config.fields.filter(field=>field.enabled&&field.showDetail);
 return <div className="asset-brochure" ref={rootRef} data-preparing={preparing} aria-hidden="true" inert>
  <table className="brochure-document">
   <thead><tr><td><div className="brochure-header"><img src="/logo/bkk-lelang-v2.png" alt="BKK Jateng — Lelang & Katalog Aset" width="240" height="80" loading="eager"/><div><strong>BROSUR ASET</strong><span>{asset.code}</span></div></div></td></tr></thead>
   <tfoot><tr><td><div className="brochure-footer"><span>Lelang & Katalog Aset BKK Jateng · {asset.code}</span><span>Dicetak: <span ref={timestamp}/></span></div></td></tr></tfoot>
   <tbody><tr><td>
    <section className="brochure-identity"><div><span className="brochure-badge">{asset.saleMethod||"Lelang"}</span><span className="brochure-category">{categoryLabel}</span><h1>{asset.title}</h1><p>{asset.address}</p></div><div className="brochure-price">{asset.oldPrice&&asset.oldPrice>asset.price?<del>{rupiah(asset.oldPrice)}</del>:null}<strong>{rupiah(asset.price)}</strong><small>{asset.saleMethod==="Lelang"?"Harga limit":"Harga penawaran"}</small></div></section>
    <section className="brochure-photos">
     <div className={`brochure-gallery-layout${photos.length===1?" single-photo":""}`}>
      {photos[0]&&<figure className="brochure-cover"><img src={photos[0]} alt={`Foto utama — ${asset.title}`} loading="eager"/><figcaption>{photos.length} foto aset</figcaption></figure>}
      {photos.length>1&&<div className="brochure-gallery-side">{photos.slice(1,4).map((url,index)=><figure key={url}><img src={url} alt={`Foto ${index+2} — ${asset.title}`} loading="eager"/></figure>)}</div>}
     </div>
     {rows.map((row,rowIndex)=><div className="brochure-photo-row" key={rowIndex}>{row.map((url,index)=><figure key={url}><img src={url} alt={`Foto ${rowIndex*4+index+5} — ${asset.title}`} loading="eager" onError={event=>{if(!event.currentTarget.src.endsWith('/asset-placeholder.svg'))event.currentTarget.src='/asset-placeholder.svg';}}/><figcaption>Foto {rowIndex*4+index+5}</figcaption></figure>)}</div>)}<p className="brochure-note">{asset.image.startsWith("/api/uploads/")?"Foto dokumentasi aset.":"Foto ilustrasi · Data contoh."}</p></section>
    {config.sections.description&&<section className="brochure-section"><span className="brochure-eyebrow">KENALI ASET PILIHAN ANDA</span><h2>{config.descriptionLabel}</h2><p className="brochure-description">{asset.description}</p></section>}
    {config.sections.specs&&<section className="brochure-section"><h2>{config.specsLabel}</h2><dl className="brochure-specs"><div><Building2/><dt>Kategori</dt><dd>{categoryLabel}</dd></div>{fields.map(field=><div key={field.key}><CatalogIcon name={specificationIcon(field.key,field.icon)} size={18}/><dt>{field.label}</dt><dd>{formatSpec(specValue(asset,field.key),field.unit)}</dd></div>)}<div><FileText/><dt>{config.certificateLabel}</dt><dd>{asset.certificate||"Belum tersedia"}</dd></div></dl></section>}
    {config.sections.location&&<section className="brochure-section"><h2>Lokasi aset</h2><div className="brochure-location"><MapPin/><div><strong>{asset.city}, {asset.province||"Jawa Tengah"}</strong><p>{[asset.address,asset.village,asset.district].filter(Boolean).join(", ")}</p>{isMapPoint(details)&&<small>Koordinat: {details.latitude}, {details.longitude}</small>}</div></div>{preparing&&isMapPoint(details)&&<AssetLocationMap latitude={details.latitude} longitude={details.longitude} title={asset.title} forPrint/>}<a className="brochure-map-link" href={isMapPoint(details)?pointGoogleMapsUrl(details):googleMapsSearchUrl(asset.address)}>Lihat lokasi di Google Maps <ArrowUpRight size={13}/></a>{details.locationIsDemo&&<p className="brochure-note">Koordinat dummy untuk demonstrasi, bukan lokasi pasti aset.</p>}</section>}
    {config.sections.facilities&&config.facilities.length>0&&<section className="brochure-section"><h2>{config.facilitiesLabel}</h2><dl className="brochure-specs brochure-facilities">{config.facilities.map(name=><div key={name}><CatalogIcon name={facilityIcon(name,config.facilityIcons)} size={18}/><dt>{name}</dt><dd>{details.facilities?.includes(name)?"Tersedia":"Belum tersedia"}</dd></div>)}</dl></section>}
    {config.sections.scheme&&<section className="brochure-section"><h2>Informasi penjualan</h2><p>Metode: {asset.saleMethod||"Lelang"}</p>{(!asset.saleMethod||asset.saleMethod==="Lelang")&&<><p>Jadwal lelang: {asset.auctionDate?dateTime(new Date(asset.auctionDate)):"Belum ditetapkan"}</p><p>Uang jaminan: {details.auctionDeposit!=null?rupiah(details.auctionDeposit):"Belum ditetapkan"}</p><p>Penyelenggara: {details.auctionOrganizer||"Belum tersedia"}</p></>}<p className="brochure-note">Informasi, ketersediaan, dan persyaratan transaksi perlu dikonfirmasi kepada petugas.</p></section>}
   </td></tr></tbody>
  </table>
 </div>;
}

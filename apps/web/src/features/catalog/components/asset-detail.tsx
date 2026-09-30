"use client";
import { CreditSimulation } from "@/features/credit-products/credit-simulation";
import { AssetGallery } from "./asset-gallery";
import { AssetLocationMap } from "./asset-location-map";
import { AssetBrochure } from "./asset-brochure";
import {flushSync} from "react-dom";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Heart,
  Share2,
  Printer,
  MapPin,
  ArrowUpRight,
  FileText,
  Route,
  Bus,
  Landmark,
  GraduationCap,
  Hospital,
  Sofa,
  Plane,
  Pill,
  Film,
  Warehouse,
  Dumbbell,
  ShieldCheck,
  Waves,
  ArrowUpDown,
  ShoppingCart,
  CircleParking,
  Store,
  Utensils,
  Church,
  Phone,
  Fuel,
  TrainFront,
  Trees,
} from "lucide-react";
import type { CatalogAsset } from "../types";
import { getCatalog } from "../services/catalog-service";
import {useCategories,categoryIcons} from "@/features/categories/categories";
import {CatalogIcon} from "@/components/ui/catalog-icon";
import {getCategorySettings, specValue, formatSpec, specificationIcon, facilityIcon, type CategorySettings} from "@/features/categories/settings";
import {isGoogleMapsUrl,googleMapsSearchUrl,isMapPoint,pointGoogleMapsUrl} from "@/features/aset/google-maps";

const money = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
const date = (value: string | null) =>
  !value ? "Belum diisi" : new Date(value).toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }) + " WIB";

export function AssetDetail({
  asset,
  saved,
  onFavorite,
  children,
  submitted = false,
  preview = false,
  categorySettings,
}: {
  asset: CatalogAsset;
  saved: boolean;
  onFavorite: () => void;
  children: ReactNode;
  submitted?: boolean;
  preview?: boolean;
  categorySettings?: CategorySettings;
}) {
  const [shareMessage, setShareMessage] = useState("");
  const introRef=useRef<HTMLDivElement>(null);
  const summaryCardRef=useRef<HTMLDivElement>(null);
  const brochureRef=useRef<HTMLDivElement>(null);
  const [preparingPrint,setPreparingPrint]=useState(false);
  const [related, setRelated] = useState<CatalogAsset[]>([]);
  const categories=useCategories();
  const categoryInfo=categories.find(c=>c.name===asset.category);
  const config=getCategorySettings(asset.category,categorySettings||asset.categorySettings||categoryInfo?.settings);
  const SummaryIcon=categoryIcons[categoryInfo?.icon as keyof typeof categoryIcons]||FileText;
  const summaryFields=config.fields.filter(f=>f.enabled&&f.summary);
  const method = asset.saleMethod || "Lelang";
  const details = asset.details || {};
  const locationUrl=isMapPoint(details)?pointGoogleMapsUrl(details):details.googleMapsUrl&&isGoogleMapsUrl(details.googleMapsUrl)?details.googleMapsUrl:"";
  useEffect(()=>{
    const intro=introRef.current,card=summaryCardRef.current;
    if(!intro||!card)return;
    // Use layout pixels: getBoundingClientRect already includes the body's CSS
    // zoom, which would scale the assigned intro height a second time.
    const update=(height:number)=>{
      if(height>0)intro.style.setProperty("--asset-summary-height",`${height}px`);
    };
    update(card.offsetHeight);
    const observer=new ResizeObserver(entries=>{
      const entry=entries.find(item=>item.target===card);
      update(entry?.borderBoxSize[0]?.blockSize??card.offsetHeight);
    });
    observer.observe(card,{box:"border-box"});
    return()=>observer.disconnect();
  },[]);
  useEffect(() => {
    if (preview) return;
    const controller = new AbortController();
    getCatalog(
      new URLSearchParams({ category: asset.category, pageSize: "4" }),
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted)
          setRelated(
            result.data.filter((item) => item.id !== asset.id).slice(0, 3),
          );
      })
      .catch(() => {});
    return () => controller.abort();
  }, [asset.id, asset.category, preview]);
  async function printBrochure() {
    if(preparingPrint)return;
    // Give the transparent, inert print map viewport dimensions for tile loading.
    flushSync(()=>{setPreparingPrint(true);setShareMessage("");});
    let timeout:ReturnType<typeof setTimeout>|undefined;
    try {
      const deadline=Date.now()+20000;
      let mapStatus=brochureRef.current?.querySelector("[data-print-map-status]")?.getAttribute("data-print-map-status");
      while(mapStatus==="loading"&&Date.now()<deadline){
        await new Promise(resolve=>setTimeout(resolve,150));
        mapStatus=brochureRef.current?.querySelector("[data-print-map-status]")?.getAttribute("data-print-map-status");
      }
      if(mapStatus&&mapStatus!=="ready"){
        setShareMessage("Peta cetak belum berhasil dimuat. Periksa koneksi, lalu coba lagi setelah peta tersedia.");
        return;
      }
      const images=Array.from(brochureRef.current?.querySelectorAll("img")||[]);
      await Promise.race([
        Promise.allSettled(images.map(image=>image.decode())),
        new Promise(resolve=>{timeout=setTimeout(resolve,10000);}),
      ]);
      // Keep the loaded map mounted through printing without covering the page.
      await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
      window.print();
    } finally {clearTimeout(timeout);setPreparingPrint(false);}
  }
  async function share() {
    try {
      if (navigator.share)
        await navigator.share({ title: asset.title, url: location.href });
      else {
        await navigator.clipboard.writeText(location.href);
        setShareMessage("Tautan aset berhasil disalin.");
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError"))
        setShareMessage("Silakan salin tautan dari bilah alamat browser.");
    }
  }
  const [facilityTab, setFacilityTab] = useState("Semua");
  const [allFacilities, setAllFacilities] = useState(false);
  const facilityPresets = [
    { name: "Bandara", type: "Akses", icon: Plane },
    { name: "Bank/ATM", type: "Fasilitas", icon: Landmark },
    { name: "Bioskop", type: "Fasilitas", icon: Film },
    { name: "Farmasi", type: "Fasilitas", icon: Pill },
    { name: "Furnished", type: "Fasilitas", icon: Sofa },
    { name: "Garasi", type: "Fasilitas", icon: Warehouse },
    { name: "Gym", type: "Fasilitas", icon: Dumbbell },
    { name: "Halte", type: "Akses", icon: Bus },
    { name: "Jalan Tol", type: "Akses", icon: Route },
    { name: "Keamanan", type: "Fasilitas", icon: ShieldCheck },
    { name: "Kolam renang", type: "Fasilitas", icon: Waves },
    { name: "Lift", type: "Fasilitas", icon: ArrowUpDown },
    { name: "Mall", type: "Fasilitas", icon: ShoppingCart },
    { name: "Parkir/Carport", type: "Fasilitas", icon: CircleParking },
    { name: "Pasar", type: "Fasilitas", icon: Store },
    { name: "Restoran", type: "Fasilitas", icon: Utensils },
    { name: "Rumah Ibadah", type: "Fasilitas", icon: Church },
    { name: "Rumah Sakit", type: "Fasilitas", icon: Hospital },
    { name: "Sambungan telepon", type: "Fasilitas", icon: Phone },
    { name: "Sekolah", type: "Fasilitas", icon: GraduationCap },
    { name: "SPBU", type: "Fasilitas", icon: Fuel },
    { name: "Stasiun", type: "Akses", icon: TrainFront },
    { name: "Taman", type: "Fasilitas", icon: Trees },
  ];
  const facilities=config.facilities.map(name=>({name,type:facilityPresets.find(f=>f.name===name)?.type||"Fasilitas",icon:facilityIcon(name,config.facilityIcons)})).filter(item=>facilityTab==="Semua"||item.type===facilityTab);
  const specs = [
    ["Kategori", categoryInfo?.label||asset.category,"lucide:building-2"],
    ...config.fields.filter(f=>f.enabled&&f.showDetail).map(f=>[f.label,formatSpec(specValue(asset,f.key),f.unit),specificationIcon(f.key,f.icon)]),
    [config.certificateLabel,asset.certificate||"Belum tersedia","lucide:file-text"],
  ];
  return (
    <div className="container asset-detail-page">
      <AssetBrochure asset={asset} config={config} categoryLabel={categoryInfo?.label||asset.category} rootRef={brochureRef} preparing={preparingPrint}/>
      <div className="public-breadcrumb">
        <Link href="/">Beranda</Link>
        <span>/</span>
        <Link href="/katalog-aset">Katalog Aset</Link>
        <span>/</span>
        <span>{asset.code}</span>
      </div>
      <div className="asset-detail-grid">
        <div className="asset-detail-main">
          <div className="asset-detail-intro" ref={introRef}>
          <AssetGallery asset={asset} submitted={submitted} preview={preview} />
          <nav className="asset-detail-tabs" aria-label="Bagian detail aset">
            {[
              ["deskripsi", config.descriptionLabel, config.sections.description],
              ["spesifikasi", config.specsLabel, config.sections.specs],
              ["lokasi", "Lokasi", config.sections.location],
              ["fasilitas", config.facilitiesLabel, config.sections.facilities],
              ["skema", "Skema Pembelian", config.sections.scheme],
              ["kalkulator", "Kalkulator", config.sections.calculator],
            ].filter(([, , visible])=>visible).map(([id, text]) => (
              <a key={String(id)} href={`#${id}`}>
                {String(text)}
              </a>
            ))}
          </nav>
          </div>
          {config.sections.description && (<section className="asset-detail-panel" id="deskripsi">
            <span className="overline">KENALI ASET PILIHAN ANDA</span>
            <h2>{config.descriptionLabel}</h2>
            <p>{asset.description}</p>
          </section>)}
          {config.sections.specs && (<section className="asset-detail-panel" id="spesifikasi">
            <h2>{config.specsLabel}</h2>
            <dl className="asset-detail-specs asset-icon-specs">
              {specs.map(([key, value, icon]) => {
                return (
                  <div key={key}>
                    <dt>
                      <CatalogIcon name={icon} size={21}/>
                      {key}
                    </dt>
                    <dd>{value}</dd>
                  </div>
                );
              })}
            </dl>
          </section>)}
          {config.sections.location && (<section className="asset-detail-panel" id="lokasi">
            <h2>Lokasi aset</h2>
            <div className="asset-location">
              <MapPin size={30} />
              <div>
                <strong>{asset.city}, {asset.province || "Jawa Tengah"}</strong>
                <p>{asset.address}</p>
                {(asset.district || asset.village) && <p>{[asset.village && `Kelurahan/desa ${asset.village}`, asset.district && `Kecamatan ${asset.district}`].filter(Boolean).join(", ")}</p>}
              </div>
            </div>
            {isMapPoint(details)&&<AssetLocationMap latitude={details.latitude} longitude={details.longitude} title={asset.title}/>}
            <a
              className="text-button"
              href={locationUrl||googleMapsSearchUrl([asset.address,asset.village,asset.district,asset.city,asset.province].filter(Boolean).join(", "))}
              target="_blank"
              rel="noopener noreferrer"
            >
              {locationUrl?"Lihat lokasi di Google Maps":"Cari alamat di Google Maps"} <ArrowUpRight size={16} />
            </a>
            <p className="asset-detail-muted">
              {details.locationIsDemo?"Titik pada peta merupakan koordinat dummy untuk demonstrasi, bukan lokasi pasti aset.":locationUrl?"Buka tautan untuk melihat lokasi aset yang ditentukan petugas.":"Pencarian berdasarkan alamat. Titik lokasi tepat perlu dikonfirmasi dengan petugas."}
            </p>
          </section>)}
          {config.sections.facilities && (<section className="asset-detail-panel" id="fasilitas">
            <h2>{config.facilitiesLabel}</h2>
            <div className="facility-tabs" aria-label="Filter fasilitas">
              {["Semua", "Akses", "Fasilitas"].map((tab) => (
                <button
                  key={tab}
                  className={facilityTab === tab ? "active" : ""}
                  aria-pressed={facilityTab === tab}
                  onClick={() => {
                    setFacilityTab(tab);
                    setAllFacilities(false);
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
            <dl className="facility-list">
              {facilities
                .slice(0, allFacilities ? undefined : 6)
                .map(({ name, icon }) => (
                  <div key={name}>
                    <dt>
                      <CatalogIcon name={icon} size={21}/>
                      {name}
                    </dt>
                    <dd>{details.facilities?.includes(name) ? "Tersedia" : "Belum tersedia"}</dd>
                  </div>
                ))}
            </dl>
            {facilities.length > 6 && (
              <button
                className="text-button facility-expand"
                onClick={() => setAllFacilities(!allFacilities)}
              >
                {allFacilities
                  ? "Tampilkan lebih sedikit"
                  : "Lihat lebih banyak"}
              </button>
            )}
          </section>)}
          {config.sections.scheme && (<section className="asset-detail-panel" id="skema">
            <h2>Skema pembelian</h2>
            <span className="asset-method">{method}</span>
            <p>
              {method === "Lelang"
                ? "Pelajari informasi aset dan pengumuman resmi, konfirmasikan jadwal serta uang jaminan, lalu ikuti pendaftaran melalui penyelenggara lelang yang ditunjuk."
                : method === "Cessie"
                  ? "Metode cessie berkaitan dengan pengalihan hak tagih. Hubungi petugas untuk memahami objek pengalihan, dokumen, persyaratan, dan proses yang berlaku pada aset ini."
                  : "Sampaikan minat Anda kepada petugas untuk mendapatkan informasi penjualan, melakukan pemeriksaan aset, dan membahas proses jual beli."}
            </p>
            {method === "Lelang" && (
              <div className="asset-auction-info">
                <small>Jadwal lelang</small>
                <strong>{date(asset.auctionDate)}</strong>
                <small>Uang jaminan & batas penyetoran</small>
                <span>{details.auctionDeposit != null ? money(details.auctionDeposit) : "Belum ditetapkan"}</span>
                <small>Penyelenggara & tautan resmi</small>
                <span>{details.auctionUrl ? <a href={details.auctionUrl} target="_blank" rel="noopener noreferrer">{details.auctionOrganizer || "Lihat pengumuman resmi"} ↗</a> : details.auctionOrganizer || "Belum tersedia"}</span>
              </div>
            )}
            <div className="notice">
              Pengajuan minat bukan penawaran atau pendaftaran lelang.
              Persyaratan, biaya, dan ketersediaan pembiayaan perlu dikonfirmasi
              kepada petugas.
            </div>
          </section>)}
          {(config.sections.calculator || asset.creditProduct) && (
            asset.creditProduct ? <CreditSimulation key={asset.creditProduct.id} price={asset.price} product={asset.creditProduct}/> : <MortgageCalculator price={asset.price} />
          )}
          <section className="asset-detail-panel" id="minat">
            <h2>Hubungi pengelola aset</h2>
            <p>
              Sampaikan pertanyaan atau permintaan kunjungan melalui formulir
              minat.
            </p>
            {children}
          </section>
        </div>
        <aside className="asset-detail-summary">
          <div className="asset-summary-card" ref={summaryCardRef}>
            <div className="asset-summary-heading">
              <div className="asset-summary-houses" aria-hidden="true">
                <SummaryIcon className="summary-house-main" strokeWidth={1.2} />
                <SummaryIcon className="summary-house-small" strokeWidth={1.4} />
              </div>
              <span className="asset-method">{method}</span>
              <p className="asset-summary-city">{asset.city}, {asset.province || "Jawa Tengah"}</p>
              <h1>{asset.title}</h1>
              <p className="asset-summary-code">Kode Aset: {asset.code}</p>
            </div>
            <div className="asset-summary-content">
              <div
                className="asset-summary-price"
                aria-label={
                  method === "Lelang" ? "Harga limit lelang" : "Harga penawaran"
                }
              >
                {asset.oldPrice && asset.oldPrice > asset.price && (
                  <del>{money(asset.oldPrice)}</del>
                )}
                <strong>{money(asset.price)}</strong>
              </div>
              {summaryFields.length>0 && <dl className="asset-summary-area">
                {summaryFields.map(field=><div key={field.key}><dt><CatalogIcon name={specificationIcon(field.key,field.icon)} size={18}/>{field.label}</dt><dd>{formatSpec(specValue(asset,field.key),field.unit)}</dd></div>)}
              </dl>}
              {(config.sections.financing || asset.creditProduct) && (
                <a href="#minat" className="primary-button asset-kpr-button">
                  {asset.creditProduct ? `Ajukan ${asset.creditProduct.name}` : config.financingLabel}
                </a>
              )}
              <a href="#minat" className="outline-button asset-contact-button">
                {config.contactLabel} <ArrowUpRight size={17} />
              </a>
              <p className="asset-summary-hours">
                Hubungi petugas untuk informasi jam layanan.
              </p>
            </div>
          </div>
          <div className="asset-detail-actions">
            <button disabled={preview} onClick={onFavorite} aria-pressed={saved}>
              <Heart size={21} fill={saved ? "currentColor" : "none"} />
              {saved ? "Tersimpan" : "Simpan"}
            </button>
            <button disabled={preview} onClick={share}>
              <Share2 size={21} />
              Bagikan
            </button>
            <button disabled={preview||preparingPrint} aria-busy={preparingPrint} onClick={()=>void printBrochure()}>
              <Printer size={21} />
              {preparingPrint?"Menyiapkan...":"Brosur"}
            </button>
          </div>
          <p role="status" className="asset-detail-muted">
            {shareMessage}
          </p>
        </aside>
      </div>
      {related.length > 0 && (
        <section className="asset-related">
          <span className="overline">PILIHAN LAINNYA</span>
          <h2>Aset serupa untuk Anda</h2>
          <div className="asset-related-grid">
            {related.map((item) => (
              <Link
                key={item.id}
                href={`/katalog-aset/${encodeURIComponent(item.slug)}`}
              >
                <img
                  src={item.image}
                  alt={`Ilustrasi ${item.title}`}
                  loading="lazy"
                />
                <div>
                  <small>{item.city}</small>
                  <h3>{item.title}</h3>
                  <strong>{money(item.price)}</strong>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MortgageCalculator({ price }: { price: number }) {
  const [rate, setRate] = useState("");
  const [years, setYears] = useState("10");
  const principal = price;
  const monthlyRate = Number(rate) / 1200;
  const months = Number(years) * 12;
  const valid =
    principal > 0 &&
    Number.isFinite(principal) &&
    rate !== "" &&
    Number(rate) >= 0 &&
    Number(rate) <= 100 &&
    months >= 12 &&
    months <= 360;
  const payment = valid
    ? monthlyRate === 0
      ? principal / months
      : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months))
    : null;
  return (
    <section className="asset-detail-panel" id="kalkulator">
      <h2>Simulasi pembiayaan</h2>
      <p>
        Masukkan asumsi bunga dan tenor untuk menghitung estimasi angsuran
        bulanan.
      </p>
      <div className="asset-calculator">
        <label>
          Harga aset
          <input value={money(price)} readOnly />
        </label>
        <label>
          Bunga per tahun (%)
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={rate}
            placeholder="Masukkan asumsi bunga"
            onChange={(e) => setRate(e.target.value)}
          />
        </label>
        <label>
          Jangka waktu (tahun)
          <input
            type="number"
            min="1"
            max="30"
            step="1"
            value={years}
            onChange={(e) => setYears(e.target.value)}
          />
        </label>
      </div>
      <div className="asset-calculator-result" role="status">
        {payment !== null ? (
          <>
            <span>Estimasi angsuran per bulan</span>
            <strong>{money(payment)}</strong>
            <small>Pokok pembiayaan: {money(principal)}</small>
          </>
        ) : (
          <span>
            Isi bunga 0–100%, dan tenor 1–30
            tahun.
          </span>
        )}
      </div>
      <p className="asset-detail-muted">
        Simulasi anuitas dengan asumsi bunga tetap, belum termasuk biaya lain.
        Bukan penawaran pembiayaan atau persetujuan kredit dari BKK Jateng.
      </p>
    </section>
  );
}

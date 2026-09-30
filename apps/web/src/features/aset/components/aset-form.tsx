"use client";
import { useRegions } from "../use-regions";
import {isGoogleMapsUrl,googleMapsSearchUrl,isMapPoint,pointGoogleMapsUrl,type MapPoint} from "../google-maps";
import {GoogleMapPicker} from "./google-map-picker";
import { useCategories } from "@/features/categories/categories";
import { useEffect, useRef, useState } from "react";
import { AssetDetail } from "@/features/catalog/components/asset-detail";
import type { CatalogAsset } from "@/features/catalog/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CalendarDays, Clock3, Save, Images, UploadCloud, X, Star, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { asetService } from "../services/aset-service";
import type { Asset, AssetInput } from "../types";
import type { CreditProduct } from "@/features/credit-products/calculator";
import { api, errorMessage } from "@/services/api";
import { formatPriceInput, priceDigits } from "@/lib/price";
import { notify } from "@/store/notification-store";
import {CatalogIcon} from "@/components/ui/catalog-icon";
import {getCategorySettings, legacySpecKeys, specValue, specificationIcon, facilityIcon} from "@/features/categories/settings";
function generateSlug(title: string) {
  if (!title.trim()) return "";
  const value = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150)
    .replace(/-+$/g, "");
  return value.length >= 3 ? value : value ? `aset-${value}` : "aset";
}
function localDate(iso?: string | null) {
  if (!iso) return "";
  const time = new Date(iso);
  return new Date(time.getTime() + 7 * 3600000).toISOString().slice(0, 16);
}
export function AsetForm({ id }: { id?: string }) {
  const [creditProducts,setCreditProducts]=useState<CreditProduct[]>([]);
  const [creditProductId,setCreditProductId]=useState("");
  const [creditLoading,setCreditLoading]=useState(true),[creditError,setCreditError]=useState(""),[creditRetry,setCreditRetry]=useState(0);
  useEffect(()=>{const controller=new AbortController();setCreditLoading(true);setCreditError("");api.get<CreditProduct[]>("/admin/credit-products",{signal:controller.signal}).then(({data})=>{if(!controller.signal.aborted)setCreditProducts(data);}).catch(err=>{if(!controller.signal.aborted)setCreditError(errorMessage(err));}).finally(()=>{if(!controller.signal.aborted)setCreditLoading(false);});return()=>controller.abort();},[creditRetry]);
  const formRef = useRef<HTMLFormElement>(null);
  const [tab, setTab] = useState<"input" | "preview">("input");
  const [preview, setPreview] = useState<CatalogAsset | null>(null);
  const [basePrice, setBasePrice] = useState("");
  const [discount, setDiscount] = useState("0");
  const [auctionDeposit, setAuctionDeposit] = useState("");
  const [auctionDay, setAuctionDay] = useState("");
  const [auctionHour, setAuctionHour] = useState("");
  const [auctionMinute, setAuctionMinute] = useState("");
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountType, setDiscountType] = useState("nominal");
  const discountAmount = hasDiscount
    ? discountType === "percentage"
      ? Math.round(Number(basePrice) * Number(discount) / 100)
      : Number(discount)
    : 0;
  const finalPrice = Math.max(0, Number(basePrice) - discountAmount);
  const [code, setCode] = useState("");
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeError, setCodeError] = useState("");
  const categories = useCategories();
  const [category, setCategory] = useState("Rumah");
  const categoryConfig = getCategorySettings(category, categories.find(c=>c.name===category)?.settings);
  const [specValues,setSpecValues]=useState<Record<string,string|number>>({});
  const [saleMethod, setSaleMethod] = useState("Lelang");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [village, setVillage] = useState("");
  const [address,setAddress]=useState("");
  const [googleMapsUrl,setGoogleMapsUrl]=useState("");
  const [mapPoint,setMapPoint]=useState<MapPoint|null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [facilities, setFacilities] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const {provinces,regencies,districts,villages,provincesLoading,regenciesLoading,districtsLoading,villagesLoading,error:regionsError}=useRegions(province,city,district);
  const router = useRouter();
  const [asset, setAsset] = useState<Asset | null>(null),
    [loading, setLoading] = useState(!!id),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [slug, setSlug] = useState("");
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    asetService
      .detail(id, controller.signal)
      .then((data) => {
        setAsset(data);
        setCreditProductId(data.creditProductId?String(data.creditProductId):"");
        setSpecValues({...Object.fromEntries(legacySpecKeys.map(key=>[key,(specValue(data,key) as string|number)??""])),...data.details?.attributes});
        setBasePrice(String(data.oldPrice || data.price));
        setDiscount(String(data.oldPrice ? Math.max(0, data.oldPrice - data.price) : 0));
        setHasDiscount(!!data.oldPrice && data.oldPrice > data.price);
        setDiscountType("nominal");
        setAuctionDeposit(String(data.details?.auctionDeposit ?? ""));
        const auctionLocal = localDate(data.auctionDate);
        setAuctionDay(auctionLocal.slice(0, 10));
        setAuctionHour(auctionLocal.slice(11, 13));
        setAuctionMinute(auctionLocal.slice(14, 16));
        setCode(data.code);
        setSlug(data.slug);
        setPhotos([...new Set([data.image, ...(data.photos || [])])]);
        setFacilities(data.details?.facilities || []);
        setCategory(data.category);
        setSaleMethod(data.saleMethod);
        setProvince(data.province || "");
        setCity(data.city);
        setDistrict(data.district || "");
        setVillage(data.village || "");
        setAddress(data.address);
        setGoogleMapsUrl(data.details?.googleMapsUrl || "");
        setMapPoint(isMapPoint(data.details)?{latitude:data.details.latitude,longitude:data.details.longitude}:null);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id]);
  async function generateCode() {
    setGeneratingCode(true);
    setCodeError("");
    try {
      setCode(await asetService.generateCode());
    } catch (err) {
      setCodeError(errorMessage(err));
    } finally {
      setGeneratingCode(false);
    }
  }
  async function addPhotos(files: FileList | File[]) {
    const selected = Array.from(files);
    if (!selected.length) return;
    if (photos.length + selected.length > 12) {
      setPhotoError("Maksimal 12 foto per aset.");
      return;
    }
    if (selected.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setPhotoError("Foto harus JPG, PNG, atau WebP dengan ukuran maksimal 5 MB per file.");
      return;
    }
    setUploading(true);
    setPhotoError("");
    try {
      const urls = await asetService.uploadPhotos(selected);
      setPhotos((current) => [...current, ...urls]);
    } catch (err) {
      setPhotoError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }
  function toggleFacility(name: string) {
    setFacilities((current) => current.includes(name) ? current.filter((value) => value !== name) : [...current, name]);
  }
  function readInput(): AssetInput {
    const form = new FormData(formRef.current!);
    const text = (key: string) => String(form.get(key) || "").trim();
    const optionalNumber = (key: string) => legacySpecKeys.includes(key) ? specValues[key]!==undefined && specValues[key]!=="" ? Number(specValues[key]) : undefined : text(key) ? Number(form.get(key)) : undefined;
    const input: AssetInput = {
      creditProductId: creditProductId ? Number(creditProductId) : null,
      slug,
      code: text("code"),
      title: text("title"),
      category: text("category"),
      saleMethod: text("saleMethod"),
      province: text("province"),
      city: text("city"),
      district,
      village,
      address: text("address"),
      price: finalPrice,
      oldPrice: discountAmount > 0 ? Number(basePrice) : null,
      land: Number(specValues.land || 0),
      building: Number(specValues.building || 0),
      bedrooms: Number(specValues.bedrooms || 0),
      image: photos[0],
      photos,
      details: {
        googleMapsUrl: googleMapsUrl.trim() || undefined,
        latitude:mapPoint?.latitude,
        locationIsDemo:!!asset?.details?.locationIsDemo&&mapPoint?.latitude===asset.details.latitude&&mapPoint?.longitude===asset.details.longitude,
        longitude:mapPoint?.longitude,
        attributes: Object.fromEntries(Object.entries(specValues).filter(([key,value])=>!legacySpecKeys.includes(key)&&value!=="")),
        bathrooms: optionalNumber("bathrooms"),
        floors: optionalNumber("floors"),
        electricity: optionalNumber("electricity"),
        carport: optionalNumber("carport"),
        yearBuilt: optionalNumber("yearBuilt"),
        auctionDeposit: saleMethod === "Lelang" && auctionDeposit !== "" ? Number(auctionDeposit) : undefined,
        auctionOrganizer: saleMethod === "Lelang" ? text("auctionOrganizer") || undefined : undefined,
        auctionUrl: saleMethod === "Lelang" ? text("auctionUrl") || undefined : undefined,
        facilities,
      },
      auctionDate: saleMethod === "Lelang" && auctionDay && auctionHour && auctionMinute && Number(auctionHour) < 24 && Number(auctionMinute) < 60
        ? new Date(`${auctionDay}T${auctionHour.padStart(2, "0")}:${auctionMinute.padStart(2, "0")}:00+07:00`).toISOString()
        : null,
      certificate: text("certificate"),
      description: text("description"),
      featured: form.get("featured") === "on",
    };
    return input;
  }
  function showPreview() {
    const input = readInput();
    setPreview({ ...input, creditProduct:creditProducts.find(product=>product.id===Number(creditProductId))||null, id: asset?.id || 0, province: province || "", saleMethod: saleMethod as CatalogAsset["saleMethod"], title: input.title || "Nama aset", code: code || "Kode aset", image: photos[0] || "/asset-placeholder.svg", description: input.description || "Deskripsi aset belum diisi." });
    setTab("preview");
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (generatingCode) return;
    if(googleMapsUrl.trim()&&!isGoogleMapsUrl(googleMapsUrl.trim())){setError("Gunakan tautan Google Maps yang valid, misalnya https://maps.app.goo.gl/... atau https://www.google.com/maps/...");return;}
    if (!province || !city) {
      setError("Pilih provinsi dan kota/kabupaten terlebih dahulu.");
      return;
    }
    if (!photos.length) {
      setError("Unggah minimal satu foto aset.");
      return;
    }
    if (Number(basePrice) < 1 || Number(basePrice) > 1000000000000) {
      setError("Harga asli harus antara Rp1 dan Rp1.000.000.000.000.");
      return;
    }
    if (!Number.isFinite(finalPrice) || finalPrice < 1 || (hasDiscount && (Number(discount) <= 0 || discountAmount < 1 || (discountType === "percentage" && Number(discount) >= 100)))) {
      setError("Isi diskon lebih dari 0 dan lebih kecil dari harga asli (persentase di bawah 100%). Harga akhir minimal Rp1.");
      return;
    }
    if (saleMethod === "Lelang" && auctionDeposit !== "" && Number(auctionDeposit) > 1000000000000) {
      setError("Uang jaminan maksimal Rp1.000.000.000.000.");
      return;
    }
    if (saleMethod === "Lelang" && (!auctionDay || !/^\d{1,2}$/.test(auctionHour) || Number(auctionHour) > 23 || !/^\d{1,2}$/.test(auctionMinute) || Number(auctionMinute) > 59)) {
      setError("Pilih tanggal lelang dan isi jam serta menit yang valid dalam WIB.");
      return;
    }
    for (const field of categoryConfig.fields.filter(f=>f.enabled)) {
      const value=specValues[field.key];
      if(field.required && (value===undefined || value==="")) {setError(`${field.label} wajib diisi.`);return;}
      if(field.type==="select" && value!==undefined && value!=="" && !field.options.includes(String(value))) {setError(`Pilih ${field.label} yang tersedia.`);return;}
    }
    const input = readInput();
    if (input.oldPrice && input.oldPrice < input.price) {
      setError("Harga sebelumnya tidak boleh lebih rendah dari harga limit.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await asetService.save(input, id);
      notify(
        id
          ? "Informasi aset berhasil diperbarui."
          : "Aset baru berhasil ditambahkan.",
      );
      router.push("/aset");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return <div className="admin-loading">Memuat informasi aset…</div>;
  if (id && !asset)
    return (
      <div className="admin-empty">
        <p role="alert">{error}</p>
        <Link href="/aset">Kembali ke daftar aset</Link>
      </div>
    );
  return (
    <>
      <Link href="/aset" className="admin-back">
        <ArrowLeft size={16} />
        Kembali ke daftar aset
      </Link>
      <div className="admin-panel asset-editor-card">
      <section className="asset-editor-header" aria-labelledby="asset-editor-title">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">INFORMASI KATALOG</span>
          <h1 id="asset-editor-title">{id ? "Edit informasi aset" : "Tambah aset baru"}</h1>
          <p>Lengkapi informasi untuk ditampilkan pada portal publik.</p>
        </div>
      </div>
      <div className="asset-editor-tabs" role="tablist" aria-label="Tampilan editor aset">
        <button type="button" role="tab" id="asset-input-tab" aria-selected={tab === "input"} aria-controls="asset-input-panel" onClick={() => setTab("input")}>Input form</button>
        <button type="button" role="tab" id="asset-preview-tab" aria-selected={tab === "preview"} aria-controls="asset-preview-panel" onClick={showPreview}>Preview</button>
      </div>
      </section>
      <form ref={formRef} id="asset-input-panel" role="tabpanel" aria-labelledby="asset-input-tab" hidden={tab !== "input"} className="admin-form asset-editor" onSubmit={submit}>
        <div className="admin-detail-grid asset-editor-grid">
          <div>
            <section className="admin-panel padded asset-form-primary-panel">
              <h2>Informasi utama</h2>
              <div className="admin-form-grid">
                <Input
                  label="Nama aset *"
                  name="title"
                  defaultValue={asset?.title}
                  required
                  minLength={3}
                  maxLength={200}
                  onChange={(e) => {
                    if (!id) setSlug(generateSlug(e.target.value));
                  }}
                />
                <div className="asset-code-field">
                <Input
                  label="Kode aset *"
                  name="code"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.toUpperCase()); setCodeError(""); }}
                  readOnly={generatingCode}
                  required
                  pattern="[A-Z0-9-]+"
                  maxLength={30}
                  placeholder="BKK-0009"
                />
                <div className="asset-code-actions">
                  <small>Ketik kode manual atau buat otomatis.</small>
                  <button type="button" className="outline-button" disabled={generatingCode || busy} onClick={generateCode}>
                    {generatingCode ? "Membuat kode..." : "Generate otomatis"}
                  </button>
                </div>
                {codeError && <small role="alert" className="asset-filter-error">{codeError}</small>}
                </div>
                <Input
                  label="Slug URL (otomatis)"
                  value={slug}
                  readOnly
                  placeholder="Otomatis dari nama aset"
                  title={id ? "Slug dipertahankan agar alamat aset tidak berubah." : "Dibuat otomatis dari nama aset."}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  minLength={3}
                  maxLength={150}
                />
                <Select label="Kategori *" name="category" value={category} onChange={setCategory} options={[...(categories.some(c=>c.name===category)?[]:[{value:category,label:category}]),...categories.map(c=>({value:c.name,label:c.label}))]} />
                <Select label="Metode penjualan *" name="saleMethod" value={saleMethod} onChange={setSaleMethod} options={["Jual Beli","Lelang","Cessie"].map(method=>({value:method,label:method}))} />
                <Input
                  label={`${categoryConfig.certificateLabel} *`}
                  name="certificate"
                  required
                  defaultValue={asset?.certificate}
                  minLength={2}
                  maxLength={30}
                  placeholder={categoryConfig.certificateHint}
                />
              </div>
              <label className="admin-field">
                <span>{categoryConfig.descriptionLabel} *</span>
                <textarea
                  name="description"
                  placeholder={categoryConfig.descriptionHint}
                  defaultValue={asset?.description}
                  required
                  minLength={10}
                  maxLength={10000}
                  rows={6}
                />
              </label>
            </section>
            <section className="admin-panel padded asset-editor-section asset-location-editor">
              <h2>Wilayah & lokasi</h2>
              <p className="asset-section-hint">Pilih wilayah secara berurutan, lalu lengkapi alamat dan lokasi Google Maps.</p>
              <div className="admin-form-grid">
                <Select label="Provinsi *" name="province" value={province} onChange={value=>{setProvince(value);setCity("");setDistrict("");setVillage("");}} disabled={provincesLoading} options={[{value:"",label:provincesLoading?"Memuat provinsi...":"Pilih provinsi"},...(province&&!provinces.some(p=>p.name===province)?[{value:province,label:province}]:[]),...provinces.map(p=>({value:p.name,label:p.name}))]} />
                <Select label="Kota / kabupaten *" name="city" value={city} onChange={value=>{setCity(value);setDistrict("");setVillage("");}} disabled={!province||regenciesLoading} options={[{value:"",label:!province?"Pilih provinsi dahulu":regenciesLoading?"Memuat kota/kabupaten...":"Pilih kota / kabupaten"},...(city&&!regencies.some(c=>c.name===city)?[{value:city,label:city}]:[]),...regencies.map(c=>({value:c.name,label:c.name}))]} />
                <Select label="Kecamatan" name="district" value={district} onChange={value=>{setDistrict(value);setVillage("");}} disabled={!city||districtsLoading} options={[{value:"",label:!city?"Pilih kota/kabupaten dahulu":districtsLoading?"Memuat kecamatan...":"Pilih kecamatan"},...(district&&!districts.some(c=>c.name===district)?[{value:district,label:district}]:[]),...districts.map(c=>({value:c.name,label:c.name}))]} />
                <Select label="Kelurahan / desa" name="village" value={village} onChange={setVillage} disabled={!district||villagesLoading} options={[{value:"",label:!district?"Pilih kecamatan dahulu":villagesLoading?"Memuat kelurahan/desa...":"Pilih kelurahan / desa"},...(village&&!villages.some(c=>c.name===village)?[{value:village,label:village}]:[]),...villages.map(c=>({value:c.name,label:c.name}))]} />
              </div>
              {regionsError&&<p role="alert" className="asset-filter-error">{regionsError}</p>}
              <label className="admin-field">
                <span>Alamat lengkap *</span>
                <textarea
                  name="address"
                  value={address}
                  onChange={e=>setAddress(e.target.value)}
                  required
                  minLength={5}
                  maxLength={250}
                  rows={2}
                />
              </label>
              <div className="asset-map-input">
                <div className="asset-map-heading"><div><h3>Lokasi Google Maps</h3><p>Cari alamat, lalu klik peta untuk memilih titik aset. Geser pin untuk menyesuaikan lokasinya.</p></div>
                  <a className="outline-button" href={googleMapsSearchUrl([address,village,district,city,province].filter(Boolean).join(", "))} target="_blank" rel="noopener noreferrer">Cari lokasi di Google Maps <ArrowUpRight size={16}/></a>
                </div>
                <GoogleMapPicker value={mapPoint} onChange={point=>{setMapPoint(point);setGoogleMapsUrl(point?pointGoogleMapsUrl(point):"");}} address={[address,village,district,city,province].filter(Boolean).join(", ")} disabled={busy||loading}/>
                <details className="asset-map-manual"><summary>Gunakan tautan Google Maps</summary>
                <Input label="Tautan Google Maps (opsional)" name="googleMapsUrl" type="url" maxLength={2048} value={googleMapsUrl} onChange={e=>{setGoogleMapsUrl(e.target.value);setMapPoint(null);}} placeholder="https://maps.app.goo.gl/..." aria-describedby="asset-map-hint" aria-invalid={!!googleMapsUrl.trim()&&!isGoogleMapsUrl(googleMapsUrl.trim())}/>
                <small id="asset-map-hint">Tautan lokasi akan tampil pada bagian Lokasi di detail aset.</small>
                {googleMapsUrl.trim()&&(isGoogleMapsUrl(googleMapsUrl.trim())?<a className="asset-map-link" href={googleMapsUrl.trim()} target="_blank" rel="noopener noreferrer">Lihat lokasi yang dipilih di Google Maps <ArrowUpRight size={16}/></a>:<p role="alert" className="asset-filter-error">Masukkan tautan Google Maps yang valid, termasuk https://.</p>)}
                </details>
              </div>
            </section>
            <section className="admin-panel padded asset-editor-section">
              <h2>Harga & diskon</h2>
              <div className="admin-form-grid">
                <Input
                  label="Harga asli (Rp) *"
                  name="basePrice"
                  type="text"
                  inputMode="numeric"
                  value={formatPriceInput(basePrice)}
                  onChange={(e) => setBasePrice(priceDigits(e.target.value))}
                  required
                />
                <Input label="Harga akhir / limit (Rp)" name="price" value={finalPrice ? formatPriceInput(String(finalPrice)) : ""} readOnly />
              </div>
              <div className="asset-discount-settings">
                <label className="admin-checkbox asset-discount-toggle">
                  <input type="checkbox" checked={hasDiscount} onChange={(e) => setHasDiscount(e.target.checked)} />
                  <span><strong>Gunakan diskon</strong><small>{hasDiscount ? "Tentukan potongan dengan nominal atau persentase." : "Tanpa diskon, aset menggunakan harga asli."}</small></span>
                </label>
                {hasDiscount && <div className="admin-form-grid asset-discount-fields">
                <Select label="Jenis diskon" name="discountType" value={discountType} onChange={(value) => { setDiscountType(value); setDiscount(""); }} options={[{value:"nominal",label:"Nominal (Rp)"},{value:"percentage",label:"Persentase (%)"}]} />
                <Input
                  label={discountType === "percentage" ? "Persentase diskon (%) *" : "Nominal potongan (Rp) *"}
                  name="discount"
                  type={discountType === "percentage" ? "number" : "text"}
                  inputMode={discountType === "percentage" ? "decimal" : "numeric"}
                  min={discountType === "percentage" ? 0.01 : undefined}
                  max={discountType === "percentage" ? 99.99 : undefined}
                  step={discountType === "percentage" ? 0.01 : undefined}
                  required
                  value={discountType === "nominal" ? formatPriceInput(discount) : discount}
                  onChange={(e) => setDiscount(discountType === "nominal" ? priceDigits(e.target.value) : e.target.value)}
                />
                </div>}
              </div>
            </section>
            <section className="admin-panel padded asset-editor-section">
              <h2>{saleMethod === "Lelang" ? `Jadwal & ${categoryConfig.specsLabel.toLowerCase()}` : categoryConfig.specsLabel}</h2>
              <div className="admin-form-grid">
                {saleMethod === "Lelang" && <div className="asset-schedule-picker">
                  <div className="asset-schedule-heading"><CalendarDays size={18} aria-hidden="true" /><div><strong>Jadwal lelang</strong><small>Pilih tanggal dan waktu pelaksanaan dalam WIB.</small></div></div>
                  <div className="asset-schedule-controls">
                    <DatePicker label="Tanggal lelang *" name="auctionDay" value={auctionDay} onChange={setAuctionDay} emptyHint="Tentukan tanggal pelaksanaan lelang" />
                    <div className="asset-schedule-time">
                      <label id="asset-schedule-time-label">Jam lelang (WIB) *</label>
                      <div className="asset-schedule-time-inputs" aria-labelledby="asset-schedule-time-label">
                        <Clock3 size={18} aria-hidden="true" />
                        <input name="auctionHour" type="text" inputMode="numeric" maxLength={2} aria-label="Jam lelang, 00 sampai 23" placeholder="JJ" value={auctionHour} onChange={(e) => setAuctionHour(priceDigits(e.target.value).slice(0, 2))} onBlur={() => { if (auctionHour) setAuctionHour(auctionHour.padStart(2, "0")); }} />
                        <span aria-hidden="true">:</span>
                        <input name="auctionMinute" type="text" inputMode="numeric" maxLength={2} aria-label="Menit lelang, 00 sampai 59" placeholder="MM" value={auctionMinute} onChange={(e) => setAuctionMinute(priceDigits(e.target.value).slice(0, 2))} onBlur={() => { if (auctionMinute) setAuctionMinute(auctionMinute.padStart(2, "0")); }} />
                        <span className="asset-schedule-zone">WIB</span>
                      </div>
                    </div>
                  </div>
                </div>}
                {categoryConfig.fields.filter(f=>f.enabled).map(field => <div key={field.key}>
                  {field.type === "select" ? <Select icon={<CatalogIcon name={specificationIcon(field.key,field.icon)} size={18}/>} label={`${field.label}${field.required ? " *" : ""}`} name={`spec_${field.key}`} value={String(specValues[field.key]??"")} onChange={value=>setSpecValues(current=>({...current,[field.key]:value}))} options={[{value:"",label:`Pilih ${field.label.toLowerCase()}`},...field.options.map(value=>({value,label:value}))]} /> : <Input icon={<CatalogIcon name={specificationIcon(field.key,field.icon)} size={18}/>} label={`${field.label}${field.unit ? ` (${field.unit})` : ""}${field.required ? " *" : ""}`} name={`spec_${field.key}`} type={field.type === "number" ? "number" : "text"} min={field.min} max={field.max} step={legacySpecKeys.includes(field.key)?1:"any"} maxLength={500} required={field.required} value={specValues[field.key]??""} onChange={e=>setSpecValues(current=>({...current,[field.key]:field.type==="number" && e.target.value!=="" ? Number(e.target.value) : e.target.value}))} />}
                </div>)}
              </div>
            </section>
            {categoryConfig.sections.facilities && <section className="admin-panel padded asset-editor-section">
              <h2>{categoryConfig.facilitiesLabel}</h2>
              <p className="admin-helper">Pilih yang tersedia agar pengunjung melihat informasi aset yang akurat.</p>
              <div className="asset-facility-picker">
                {categoryConfig.facilities.map((name) => <label key={name} className={facilities.includes(name) ? "selected" : ""}>
                  <input type="checkbox" checked={facilities.includes(name)} onChange={() => toggleFacility(name)} />
                  <CatalogIcon name={facilityIcon(name,categoryConfig.facilityIcons)} size={20}/><span>{name}</span>
                </label>)}
              </div>
            </section>}
            {saleMethod === "Lelang" && <section className="admin-panel padded asset-editor-section">
              <h2>Informasi lelang</h2>
              <p className="admin-helper">Lengkapi jika jadwal dan pengumuman resmi sudah tersedia.</p>
              <div className="admin-form-grid">
                <Input label="Uang jaminan (Rp)" name="auctionDeposit" type="text" inputMode="numeric" value={formatPriceInput(auctionDeposit)} onChange={(e) => setAuctionDeposit(priceDigits(e.target.value))} placeholder="Belum ditetapkan" />
                <Input label="Penyelenggara lelang" name="auctionOrganizer" defaultValue={asset?.details?.auctionOrganizer ?? ""} maxLength={150} placeholder="Nama penyelenggara" />
                <Input label="Tautan pengumuman resmi" name="auctionUrl" type="url" pattern="https://.*" defaultValue={asset?.details?.auctionUrl ?? ""} maxLength={500} placeholder="https://..." />
              </div>
            </section>}
          </div>
          <div>
            <section className="admin-panel padded asset-photo-panel">
              <h2>Foto aset</h2>
              <p className="admin-helper">Foto pertama menjadi sampul katalog. Tambahkan hingga 12 foto, lalu pilih sampulnya.</p>
              <div className={`asset-upload-zone${dragging ? " is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void addPhotos(event.dataTransfer.files); }}>
                <input id="asset-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} onChange={(event) => { if (event.target.files) void addPhotos(event.target.files); event.target.value = ""; }} />
                <label htmlFor="asset-photos"><UploadCloud size={28} /><strong>{uploading ? "Mengunggah foto..." : "Pilih atau letakkan foto di sini"}</strong><span>JPG, PNG, WebP · maksimal 5 MB per foto</span></label>
              </div>
              {photoError && <p role="alert" className="asset-filter-error">{photoError}</p>}
              {photos.length > 0 && <div className="asset-upload-grid">
                {photos.map((url, index) => <div className="asset-upload-item" key={url}>
                  <img src={url} alt={`Foto aset ${index + 1}`} />
                  {index === 0 && <span className="asset-upload-cover"><Star size={13} /> Sampul</span>}
                  <div className="asset-upload-actions">
                    {index > 0 && <button type="button" title="Jadikan sampul" aria-label={`Jadikan foto ${index + 1} sampul`} onClick={() => setPhotos((current) => [url, ...current.filter((photo) => photo !== url)])}><GripVertical size={15} /> Sampul</button>}
                    <button type="button" title="Hapus foto" aria-label={`Hapus foto ${index + 1}`} onClick={() => setPhotos((current) => current.filter((photo) => photo !== url))}><X size={15} /></button>
                  </div>
                </div>)}
              </div>}
              <p className="admin-helper asset-photo-count"><Images size={15} /> {photos.length} dari 12 foto ditambahkan</p>
            </section>
            <section className="admin-panel padded asset-editor-section asset-catalog-settings">
              <h2>Pengaturan katalog</h2>
              <div className="asset-catalog-field">
              <Select label="Produk kredit untuk aset" name="creditProductId" value={creditProductId} onChange={setCreditProductId} disabled={creditLoading||!!creditError} options={[{value:"",label:creditLoading?"Memuat produk kredit...":"Tanpa produk kredit"},...creditProducts.filter(product=>product.active||String(product.id)===creditProductId).map(product=>({value:String(product.id),label:product.name+(product.active?"":" (nonaktif)")}))]}/>
              {creditError&&<p role="alert">{creditError} <button type="button" onClick={()=>setCreditRetry(value=>value+1)}>Coba lagi</button></p>}
              <p className="admin-helper">Produk yang dipilih menentukan bunga, metode simulasi, dan tombol Ajukan pada halaman aset. <Link href="/master-produk-kredit">Kelola produk kredit</Link></p>
              </div>
              <div className="asset-catalog-field">
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  name="featured"
                  defaultChecked={!!asset?.featured}
                />
                <span>Prioritaskan sebagai aset unggulan</span>
              </label>
              <p className="admin-helper">
                {asset?.archived
                  ? "Aset ini diarsipkan. Pulihkan dari daftar aset untuk menampilkannya kembali."
                  : "Informasi yang disimpan langsung muncul pada katalog publik."}
              </p>
              </div>
            </section>
          </div>
        </div>
        {error && (
          <div role="alert" className="admin-alert error">
            {error}
          </div>
        )}
        <div className="admin-save-bar">
          <span>Periksa kembali informasi sebelum menyimpan.</span>
          <div>
            <Link href="/aset" className="admin-button admin-button-secondary">
              Batal
            </Link>
            <Button type="submit" disabled={busy || uploading}>
              <Save size={17} />
              {busy ? "Menyimpan…" : "Simpan Aset"}
            </Button>
          </div>
        </div>
      </form>
      {tab === "preview" && preview && <section id="asset-preview-panel" role="tabpanel" aria-labelledby="asset-preview-tab" className="asset-editor-preview" onClickCapture={(event) => {
        const link = (event.target as HTMLElement).closest("a");
        if (link && !link.getAttribute("href")?.startsWith("#")) event.preventDefault();
      }}>
        <p className="asset-preview-notice">Pratinjau data yang sedang diisi. Perubahan belum dipublikasikan sebelum disimpan.</p>
        <AssetDetail asset={preview} saved={false} onFavorite={() => {}} preview categorySettings={categoryConfig}>
          <p>Formulir pengajuan tersedia pada halaman publik setelah aset disimpan.</p>
        </AssetDetail>
      </section>}
      </div>
    </>
  );
}

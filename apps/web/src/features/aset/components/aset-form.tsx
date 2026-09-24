"use client";
import { useRegions } from "../use-regions";
import { useCategories } from "@/features/categories/categories";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { asetService } from "../services/aset-service";
import type { Asset, AssetInput } from "../types";
import { errorMessage } from "@/services/api";
import { notify } from "@/store/notification-store";
function localDate(iso?: string) {
  if (!iso) return "";
  const time = new Date(iso);
  return new Date(time.getTime() + 7 * 3600000).toISOString().slice(0, 16);
}
export function AsetForm({ id }: { id?: string }) {
  const categories = useCategories();
  const [category, setCategory] = useState("Rumah");
  const [saleMethod, setSaleMethod] = useState("Lelang");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const {provinces,regencies,provincesLoading,regenciesLoading,error:regionsError}=useRegions(province);
  const router = useRouter();
  const [asset, setAsset] = useState<Asset | null>(null),
    [loading, setLoading] = useState(!!id),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [slug, setSlug] = useState(""),
    [image, setImage] = useState("");
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    asetService
      .detail(id, controller.signal)
      .then((data) => {
        setAsset(data);
        setSlug(data.slug);
        setImage(data.image);
        setCategory(data.category);
        setSaleMethod(data.saleMethod);
        setProvince(data.province || "");
        setCity(data.city);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const text = (key: string) => String(form.get(key) || "").trim();
    if (!province || !city) {
      setError("Pilih provinsi dan kota/kabupaten terlebih dahulu.");
      return;
    }
    const input: AssetInput = {
      slug,
      code: text("code"),
      title: text("title"),
      category: text("category"),
      saleMethod: text("saleMethod"),
      province: text("province"),
      city: text("city"),
      address: text("address"),
      price: Number(form.get("price")),
      oldPrice: text("oldPrice") ? Number(form.get("oldPrice")) : null,
      land: Number(form.get("land")),
      building: Number(form.get("building")),
      bedrooms: Number(form.get("bedrooms")),
      image,
      auctionDate: new Date(text("auctionDate") + ":00+07:00").toISOString(),
      certificate: text("certificate"),
      description: text("description"),
      featured: form.get("featured") === "on",
    };
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
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">INFORMASI KATALOG</span>
          <h1>{id ? "Edit informasi aset" : "Tambah aset baru"}</h1>
          <p>Lengkapi informasi untuk ditampilkan pada portal publik.</p>
        </div>
      </div>
      <form className="admin-form" onSubmit={submit}>
        <div className="admin-detail-grid">
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
                  onBlur={(e) => {
                    if (!slug)
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-|-$/g, ""),
                      );
                  }}
                />
                <Input
                  label="Kode aset *"
                  name="code"
                  defaultValue={asset?.code}
                  required
                  pattern="[A-Z0-9-]+"
                  maxLength={30}
                  placeholder="BKK-0009"
                />
                <Input
                  label="Slug URL *"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  minLength={3}
                  maxLength={150}
                />
                <Select label="Kategori *" name="category" value={category} onChange={setCategory} options={[...(categories.some(c=>c.name===category)?[]:[{value:category,label:category}]),...categories.map(c=>({value:c.name,label:c.label}))]} />
                <Select label="Metode penjualan *" name="saleMethod" value={saleMethod} onChange={setSaleMethod} options={["Jual Beli","Lelang","Cessie"].map(method=>({value:method,label:method}))} />
                <Select label="Provinsi *" name="province" value={province} onChange={value=>{setProvince(value);setCity("");}} disabled={provincesLoading} options={[{value:"",label:provincesLoading?"Memuat provinsi...":"Pilih provinsi"},...(province&&!provinces.some(p=>p.name===province)?[{value:province,label:province}]:[]),...provinces.map(p=>({value:p.name,label:p.name}))]} />
                <Select label="Kota / kabupaten *" name="city" value={city} onChange={setCity} disabled={!province||regenciesLoading} options={[{value:"",label:!province?"Pilih provinsi dahulu":regenciesLoading?"Memuat kota/kabupaten...":"Pilih kota / kabupaten"},...(city&&!regencies.some(c=>c.name===city)?[{value:city,label:city}]:[]),...regencies.map(c=>({value:c.name,label:c.name}))]} />
                <Input
                  label="Dokumen kepemilikan *"
                  name="certificate"
                  required
                  defaultValue={asset?.certificate}
                  minLength={2}
                  maxLength={30}
                  placeholder="SHM / SHGB / BPKB"
                />
              </div>
              {regionsError&&<p role="alert" className="asset-filter-error">{regionsError}</p>}
              <label className="admin-field">
                <span>Alamat lengkap *</span>
                <textarea
                  name="address"
                  defaultValue={asset?.address}
                  required
                  minLength={5}
                  maxLength={250}
                  rows={2}
                />
              </label>
              <label className="admin-field">
                <span>Deskripsi aset *</span>
                <textarea
                  name="description"
                  defaultValue={asset?.description}
                  required
                  minLength={10}
                  maxLength={10000}
                  rows={6}
                />
              </label>
            </section>
            <section className="admin-panel padded">
              <h2>Harga, jadwal & spesifikasi</h2>
              <div className="admin-form-grid">
                <Input
                  label="Harga limit (Rp) *"
                  name="price"
                  type="number"
                  min={1}
                  max={1000000000000}
                  defaultValue={asset?.price}
                  required
                />
                <Input
                  label="Harga sebelumnya (opsional)"
                  name="oldPrice"
                  type="number"
                  min={1}
                  max={1000000000000}
                  defaultValue={asset?.oldPrice || ""}
                />
                <Input
                  label="Jadwal lelang (WIB) *"
                  name="auctionDate"
                  type="datetime-local"
                  defaultValue={localDate(asset?.auctionDate)}
                  required
                />
                <Input
                  label="Luas tanah (m²)"
                  name="land"
                  type="number"
                  min={0}
                  max={10000000}
                  defaultValue={asset?.land || 0}
                  required
                />
                <Input
                  label="Luas bangunan (m²)"
                  name="building"
                  type="number"
                  min={0}
                  max={10000000}
                  defaultValue={asset?.building || 0}
                  required
                />
                <Input
                  label="Jumlah kamar tidur"
                  name="bedrooms"
                  type="number"
                  min={0}
                  max={1000}
                  defaultValue={asset?.bedrooms || 0}
                  required
                />
              </div>
            </section>
          </div>
          <div>
            <section className="admin-panel padded">
              <h2>Foto aset</h2>
              <div className="asset-image-preview">
                {image.startsWith("https://") ? (
                  <img src={image} alt="Pratinjau foto aset" />
                ) : (
                  <>
                    <ImageIcon size={35} />
                    <span>Pratinjau gambar</span>
                  </>
                )}
              </div>
              <Input
                label="URL foto (HTTPS) *"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                type="url"
                pattern="https://.*"
                maxLength={500}
                required
                placeholder="https://…"
              />
              <p className="admin-helper">
                Gunakan tautan gambar yang dapat diakses publik. Upload berkas
                belum tersedia.
              </p>
            </section>
            <section className="admin-panel padded">
              <h2>Pengaturan katalog</h2>
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
            <Button type="submit" disabled={busy}>
              <Save size={17} />
              {busy ? "Menyimpan…" : "Simpan Aset"}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}

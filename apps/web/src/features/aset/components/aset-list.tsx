"use client";
import { useRegions } from "../use-regions";
import { matchesAsset } from "../filters";
import {summarizeAssets} from "../summary";
import { useCategories } from "@/features/categories/categories";
import { PriceInput } from "@/components/ui/price-input";
import { Select } from "@/components/ui/select";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Pencil,
  Archive,
  RotateCcw,
  Building2,
  Layers3, Handshake, FileSignature, Gavel,
} from "lucide-react";
import { asetService } from "../services/aset-service";
import type { Asset } from "../types";
import { currency, formatDate } from "@/lib/utils";
import { errorMessage } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { notify } from "@/store/notification-store";
export function AsetList() {
  const categories = useCategories();
  const [category,setCategory]=useState(""),[saleMethod,setSaleMethod]=useState(""),[province,setProvince]=useState(""),[city,setCity]=useState(""),[minPrice,setMinPrice]=useState(""),[maxPrice,setMaxPrice]=useState("");
  const [district,setDistrict]=useState(""),[village,setVillage]=useState("");
  const {provinces,regencies,districts,villages,provincesLoading,regenciesLoading,districtsLoading,villagesLoading,error:regionsError}=useRegions(province,city,district);
  const [assets, setAssets] = useState<Asset[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [q, setQ] = useState(""),
    [filter, setFilter] = useState("active"),
    [selected, setSelected] = useState<Asset | null>(null),
    [busy, setBusy] = useState(false);
  async function load() {
    setLoading(true);
    setError("");
    try {
      setAssets(await asetService.list());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  const rangeError = !!minPrice && !!maxPrice && Number(minPrice)>Number(maxPrice);
  const visible = rangeError ? [] : assets.filter(a=>matchesAsset(a,{q,status:filter,category,saleMethod,province,city,district,village,minPrice,maxPrice}));
  const summary=summarizeAssets(rangeError?[]:assets.filter(a=>matchesAsset(a,{q,status:filter,category,saleMethod:"",province,city,district,village,minPrice,maxPrice})));
  const summaryIcons=[Layers3,Handshake,FileSignature,Gavel];
  const activeFilterCount = [category, saleMethod, province, city, district, village, minPrice, maxPrice].filter(Boolean).length;
  function resetFilters(){setQ("");setFilter("active");setCategory("");setSaleMethod("");setProvince("");setCity("");setDistrict("");setVillage("");setMinPrice("");setMaxPrice("");}
  async function archive() {
    if (!selected) return;
    setBusy(true);
    try {
      const result = await asetService.archive(selected.id, !selected.archived);
      setAssets((old) => old.map((a) => (a.id === result.id ? result : a)));
      notify(
        result.archived
          ? "Aset berhasil diarsipkan."
          : "Aset ditampilkan kembali pada katalog.",
      );
      setSelected(null);
    } catch (e) {
      setError(errorMessage(e));
      setSelected(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="admin-panel admin-filter-card asset-filter-card" aria-label="Filter aset">
        <div className="admin-filter-card-header">
          <div>
            <span className="admin-eyebrow">KATALOG LELANG BKK JATENG</span>
            <h1>Kelola aset</h1>
            <p>Pastikan informasi dan jadwal aset selalu diperbarui.</p>
            <small className="asset-summary-count" aria-live="polite">{loading?"Memuat ringkasan...":error?"Ringkasan belum tersedia":`${visible.length} dari ${assets.length} aset ditampilkan`}</small>
          </div>
          <div className="admin-filter-card-actions asset-summary-actions">
            <div className="asset-summary-cards" aria-label="Ringkasan nilai aset per metode; mengikuti filter selain metode penjualan">
              {summary.map((item,index)=>{const Icon=summaryIcons[index];return <button type="button" key={item.label} className={`asset-metric-card asset-metric-${index}`} aria-pressed={saleMethod===item.method} disabled={loading||!!error} onClick={()=>setSaleMethod(item.method)} title={`${item.label}: ${currency(item.total)}, ${item.count} aset. Klik untuk memfilter metode.`}>
                <span className="asset-metric-label"><Icon size={15}/>{item.label}</span>
                <strong>{loading||error?"—":currency(item.total)}</strong>
                <small>{loading?"Memuat...":error?"Belum tersedia":`${item.count} aset`}</small>
              </button>;})}
            </div>
            <Link href="/aset/baru" className="admin-button admin-button-primary">
              <Plus size={17} />Tambah Aset
            </Link>
          </div>
        </div>
        <div className="asset-filter-grid">
          <div className="asset-filter-search">
            <label htmlFor="admin-asset-search">Cari aset</label>
            <div className="admin-search">
              <Search size={17} />
              <input
                id="admin-asset-search"
                placeholder="Cari nama, kode, atau lokasi aset…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
          <Select label="Status aset" name="status" value={filter} onChange={setFilter}
            options={[{value:"active",label:"Aset aktif"},{value:"archived",label:"Diarsipkan"},{value:"all",label:"Semua aset"}]} />
          <Select label="Kategori" name="category" value={category} onChange={setCategory} options={[{value:"",label:"Semua kategori"},...categories.map(c=>({value:c.name,label:c.label}))]} />
          <Select label="Metode penjualan" name="saleMethod" value={saleMethod} onChange={setSaleMethod} options={[{value:"",label:"Semua metode"},...["Jual Beli","Lelang","Cessie"].map(m=>({value:m,label:m}))]} />
          <Select label="Provinsi" name="province" value={province} onChange={value=>{setProvince(value);setCity("");setDistrict("");setVillage("");}} disabled={provincesLoading} options={[{value:"",label:provincesLoading?"Memuat provinsi...":"Semua provinsi"},...provinces.map(p=>({value:p.name,label:p.name}))]} />
          <Select label="Kota / kabupaten" name="city" value={city} onChange={value=>{setCity(value);setDistrict("");setVillage("");}} disabled={!province || regenciesLoading} options={[{value:"",label:!province?"Pilih provinsi dahulu":regenciesLoading?"Memuat kota/kabupaten...":"Semua kota / kabupaten"},...regencies.map(c=>({value:c.name,label:c.name}))]} />
          <Select label="Kecamatan" name="district" value={district} onChange={value=>{setDistrict(value);setVillage("");}} disabled={!city || districtsLoading} options={[{value:"",label:!city?"Pilih kota/kabupaten dahulu":districtsLoading?"Memuat kecamatan...":"Semua kecamatan"},...districts.map(c=>({value:c.name,label:c.name}))]} />
          <Select label="Kelurahan / desa" name="village" value={village} onChange={setVillage} disabled={!district || villagesLoading} options={[{value:"",label:!district?"Pilih kecamatan dahulu":villagesLoading?"Memuat kelurahan/desa...":"Semua kelurahan / desa"},...villages.map(c=>({value:c.name,label:c.name}))]} />
          <PriceInput label="Harga minimal" name="minPrice" value={minPrice} onChange={setMinPrice} placeholder="0"/>
          <PriceInput label="Harga maksimal" name="maxPrice" value={maxPrice} onChange={setMaxPrice} placeholder="Tanpa batas"/>
          <div className="asset-filter-reset-slot"><button type="button" className="asset-filter-reset" onClick={resetFilters} disabled={!activeFilterCount && !q && filter === "active"}><RotateCcw size={15} />Reset filter</button></div>
        </div>
        {rangeError&&<p role="alert" className="asset-filter-error">Harga maksimal harus sama atau lebih besar dari harga minimal.</p>}
        {regionsError&&<p role="alert" className="asset-filter-error">{regionsError}</p>}
      </section>
      <div className="admin-panel asset-list-panel">
        {error ? (
          <div className="admin-empty">
            <p role="alert">{error}</p>
            <Button onClick={load}>Coba lagi</Button>
          </div>
        ) : loading ? (
          <div className="admin-loading">Memuat aset…</div>
        ) : !visible.length ? (
          <div className="admin-empty">
            <Building2 size={36} />
            <h3>Tidak ada aset yang sesuai</h3>
            <p>Coba pencarian lain atau tambahkan aset baru.</p>
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table assets-table">
              <thead>
                <tr>
                  <th>Aset</th>
                  <th>Harga limit</th>
                  <th>Jadwal lelang</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="asset-table-info">
                        <img src={a.image} alt="Ilustrasi aset" />
                        <div>
                          <strong>{a.title}</strong>
                          <small>
                            {a.code} · {a.city}
                          </small>
                          <span>{a.category} ? {a.saleMethod}</span>
                        </div>
                      </div>
                    </td>
                    <td className="table-price">{currency(a.price)}</td>
                    <td>{a.saleMethod === "Lelang" && a.auctionDate ? formatDate(a.auctionDate) : "—"}</td>
                    <td>
                      <span
                        className={
                          "status-badge " +
                          (a.archived ? "status-archived" : "status-selesai")
                        }
                      >
                        <i />
                        {a.archived ? "Diarsipkan" : "Aktif"}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link
                          href={`/aset/${a.id}`}
                          title="Edit aset"
                          aria-label={`Edit ${a.title}`}
                        >
                          <Pencil size={16} />
                        </Link>
                        <button
                          title={a.archived ? "Pulihkan aset" : "Arsipkan aset"}
                          aria-label={`${a.archived ? "Pulihkan" : "Arsipkan"} ${a.title}`}
                          onClick={() => setSelected(a)}
                        >
                          {a.archived ? (
                            <RotateCcw size={16} />
                          ) : (
                            <Archive size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="admin-pagination">
          <span>{visible.length} aset ditampilkan</span>
          <span>Perubahan tersimpan pada MySQL</span>
        </div>
      </div>
      {selected && (
        <Modal
          title={
            selected.archived ? "Tampilkan kembali aset?" : "Arsipkan aset?"
          }
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <p>
            <strong>{selected.title}</strong>
          </p>
          <p>
            {selected.archived
              ? "Aset ini akan muncul kembali pada katalog publik."
              : "Aset akan disembunyikan dari katalog publik. Pengajuan dan riwayat tetap tersimpan, dan aset dapat dipulihkan."}
          </p>
          <div className="admin-form-actions">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setSelected(null)}
            >
              Batal
            </Button>
            <Button disabled={busy} onClick={archive}>
              {busy
                ? "Menyimpan…"
                : selected.archived
                  ? "Pulihkan Aset"
                  : "Arsipkan Aset"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

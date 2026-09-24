"use client";
import { useRegions } from "../use-regions";
import { matchesAsset } from "../filters";
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
  SlidersHorizontal,
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
  const {provinces,regencies,provincesLoading,regenciesLoading,error:regionsError}=useRegions(province);
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
  const visible = rangeError ? [] : assets.filter(a=>matchesAsset(a,{q,status:filter,category,saleMethod,province,city,minPrice,maxPrice}));
  const activeFilterCount = [category, saleMethod, province, city, minPrice, maxPrice].filter(Boolean).length;
  function resetFilters(){setQ("");setFilter("active");setCategory("");setSaleMethod("");setProvince("");setCity("");setMinPrice("");setMaxPrice("");}
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
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">KATALOG LELANG BKK JATENG</span>
          <h1>Kelola aset</h1>
          <p>Pastikan informasi dan jadwal aset selalu diperbarui.</p>
        </div>
        <Link href="/aset/baru" className="admin-button admin-button-primary">
          <Plus size={17} />
          Tambah Aset
        </Link>
      </div>
      <div className="admin-panel asset-list-panel">
        <div className="admin-table-toolbar">
          <div className="admin-search">
            <Search size={17} />
            <input
              aria-label="Cari aset"
              placeholder="Cari nama, kode, atau lokasi aset…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="asset-status-control">
            <Select label="Status aset" name="status" value={filter} onChange={setFilter}
              options={[{value:"active",label:"Aset aktif"},{value:"archived",label:"Diarsipkan"},{value:"all",label:"Semua aset"}]} />
          </div>
        </div>
        <div className="asset-filter-panel">
          <div className="asset-filter-heading">
            <div>
              <span className="asset-filter-heading-icon"><SlidersHorizontal size={18} /></span>
              <div><strong>Filter aset</strong><small>Persempit daftar sesuai kebutuhan</small></div>
              {activeFilterCount > 0 && <span className="asset-filter-count">{activeFilterCount} aktif</span>}
            </div>
            <button type="button" className="asset-filter-reset" onClick={resetFilters} disabled={!activeFilterCount && !q && filter === "active"}><RotateCcw size={15} />Reset filter</button>
          </div>
          <div className="asset-filter-grid">
            <Select label="Kategori" name="category" value={category} onChange={setCategory} options={[{value:"",label:"Semua kategori"},...categories.map(c=>({value:c.name,label:c.label}))]} />
            <Select label="Metode penjualan" name="saleMethod" value={saleMethod} onChange={setSaleMethod} options={[{value:"",label:"Semua metode"},...["Jual Beli","Lelang","Cessie"].map(m=>({value:m,label:m}))]} />
            <Select label="Provinsi" name="province" value={province} onChange={value=>{setProvince(value);setCity("");}} disabled={provincesLoading} options={[{value:"",label:provincesLoading?"Memuat provinsi...":"Semua provinsi"},...provinces.map(p=>({value:p.name,label:p.name}))]} />
            <Select label="Kota / kabupaten" name="city" value={city} onChange={setCity} disabled={!province || regenciesLoading} options={[{value:"",label:!province?"Pilih provinsi dahulu":regenciesLoading?"Memuat kota/kabupaten...":"Semua kota / kabupaten"},...regencies.map(c=>({value:c.name,label:c.name}))]} />
          </div>
          <div className="asset-price-filters">
            <PriceInput label="Harga minimal" name="minPrice" value={minPrice} onChange={setMinPrice} placeholder="0"/>
            <span className="asset-price-divider" aria-hidden="true">sampai</span>
            <PriceInput label="Harga maksimal" name="maxPrice" value={maxPrice} onChange={setMaxPrice} placeholder="Tanpa batas"/>
          </div>
          {rangeError&&<p role="alert" className="asset-filter-error">Harga maksimal harus sama atau lebih besar dari harga minimal.</p>}
          {regionsError&&<p role="alert" className="asset-filter-error">{regionsError}</p>}
        </div>
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
                    <td>{formatDate(a.auctionDate)}</td>
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

"use client";
import { AssetGallery } from "./asset-gallery";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  Heart,
  Share2,
  Printer,
  MapPin,
  ArrowUpRight,
  House,
  Ruler,
  Building2,
  BedDouble,
  FileText,
  ShowerHead,
  Layers,
  Zap,
  CarFront,
  CalendarDays,
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
import { PriceInput } from "@/components/ui/price-input";

const money = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
const date = (value: string) =>
  new Date(value).toLocaleString("id-ID", {
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
}: {
  asset: CatalogAsset;
  saved: boolean;
  onFavorite: () => void;
  children: ReactNode;
  submitted?: boolean;
}) {
  const [shareMessage, setShareMessage] = useState("");
  const [related, setRelated] = useState<CatalogAsset[]>([]);
  const method = asset.saleMethod || "Lelang";
  useEffect(() => {
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
  }, [asset.id, asset.category]);
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
  const specIcons = [
    House,
    Ruler,
    Building2,
    BedDouble,
    FileText,
    ShowerHead,
    Layers,
    Zap,
    CarFront,
    CalendarDays,
  ];
  const [facilityTab, setFacilityTab] = useState("Semua");
  const [allFacilities, setAllFacilities] = useState(false);
  const facilities = [
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
  ].filter((item) => facilityTab === "Semua" || item.type === facilityTab);
  const specs = [
    ["Kategori", asset.category],
    ["Luas tanah", asset.land ? `${asset.land} m²` : "Tidak tersedia"],
    [
      "Luas bangunan",
      asset.building ? `${asset.building} m²` : "Tidak tersedia",
    ],
    ["Kamar tidur", asset.bedrooms || "Tidak tersedia"],
    ["Dokumen", asset.certificate || "Belum tersedia"],
    ["Kamar mandi", "Belum tersedia"],
    ["Jumlah lantai", "Belum tersedia"],
    ["Daya listrik", "Belum tersedia"],
    ["Carport", "Belum tersedia"],
    ["Tahun dibangun", "Belum tersedia"],
  ];
  return (
    <div className="container asset-detail-page">
      <div className="public-breadcrumb">
        <Link href="/">Beranda</Link>
        <span>/</span>
        <Link href="/katalog-aset">Katalog Aset</Link>
        <span>/</span>
        <span>{asset.code}</span>
      </div>
      <div className="asset-detail-grid">
        <div className="asset-detail-main">
          <AssetGallery asset={asset} submitted={submitted} />
          <nav className="asset-detail-tabs" aria-label="Bagian detail aset">
            {[
              ["deskripsi", "Deskripsi"],
              ["spesifikasi", "Spesifikasi"],
              ["lokasi", "Lokasi"],
              ["fasilitas", "Akses & Fasilitas"],
              ["skema", "Skema Pembelian"],
              ["kalkulator", "Kalkulator"],
            ].map(([id, text]) => (
              <a key={id} href={`#${id}`}>
                {text}
              </a>
            ))}
          </nav>
          <section className="asset-detail-panel" id="deskripsi">
            <span className="overline">KENALI ASET PILIHAN ANDA</span>
            <h2>Deskripsi aset</h2>
            <p>{asset.description}</p>
          </section>
          <section className="asset-detail-panel" id="spesifikasi">
            <h2>Spesifikasi aset</h2>
            <dl className="asset-detail-specs asset-icon-specs">
              {specs.map(([key, value], index) => {
                const Icon = specIcons[index];
                return (
                  <div key={key}>
                    <dt>
                      <Icon size={21} aria-hidden="true" />
                      {key}
                    </dt>
                    <dd>{value}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
          <section className="asset-detail-panel" id="lokasi">
            <h2>Lokasi aset</h2>
            <div className="asset-location">
              <MapPin size={30} />
              <div>
                <strong>{asset.city}, Jawa Tengah</strong>
                <p>{asset.address}</p>
              </div>
            </div>
            <a
              className="text-button"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(asset.address)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Cari alamat di Google Maps <ArrowUpRight size={16} />
            </a>
            <p className="asset-detail-muted">
              Pencarian berdasarkan alamat. Titik lokasi tepat perlu
              dikonfirmasi dengan petugas.
            </p>
          </section>
          <section className="asset-detail-panel" id="fasilitas">
            <h2>Akses & fasilitas</h2>
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
                .map(({ name, icon: Icon }) => (
                  <div key={name}>
                    <dt>
                      <Icon size={21} aria-hidden="true" />
                      {name}
                    </dt>
                    <dd>Belum tersedia</dd>
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
          </section>
          <section className="asset-detail-panel" id="skema">
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
                <small>Jadwal lelang contoh</small>
                <strong>{date(asset.auctionDate)}</strong>
                <small>Uang jaminan & batas penyetoran</small>
                <span>Belum ditetapkan</span>
                <small>Penyelenggara & tautan resmi</small>
                <span>Belum tersedia</span>
              </div>
            )}
            <div className="notice">
              Pengajuan minat bukan penawaran atau pendaftaran lelang.
              Persyaratan, biaya, dan ketersediaan pembiayaan perlu dikonfirmasi
              kepada petugas.
            </div>
          </section>
          {asset.category !== "Kendaraan" && (
            <MortgageCalculator price={asset.price} />
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
          <div className="asset-summary-card">
            <div className="asset-summary-heading">
              <div className="asset-summary-houses" aria-hidden="true">
                <House className="summary-house-main" strokeWidth={1.2} />
                <House className="summary-house-small" strokeWidth={1.4} />
              </div>
              <span className="asset-method">{method}</span>
              <p className="asset-summary-city">{asset.city}, Jawa Tengah</p>
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
              <dl className="asset-summary-area">
                <div>
                  <dt>
                    <abbr title="Luas tanah">LT</abbr>
                  </dt>
                  <dd>
                    {asset.land ? (
                      <>
                        {asset.land} m<sup>2</sup>
                      </>
                    ) : (
                      "-"
                    )}
                  </dd>
                </div>
                <div>
                  <dt>
                    <abbr title="Luas bangunan">LB</abbr>
                  </dt>
                  <dd>
                    {asset.building ? (
                      <>
                        {asset.building} m<sup>2</sup>
                      </>
                    ) : (
                      "-"
                    )}
                  </dd>
                </div>
              </dl>
              {asset.category !== "Kendaraan" && (
                <a href="#minat" className="primary-button asset-kpr-button">
                  Ajukan BKK Joglo
                </a>
              )}
              <a href="#minat" className="outline-button asset-contact-button">
                Hubungi Kami <ArrowUpRight size={17} />
              </a>
              <p className="asset-summary-hours">
                Hubungi petugas untuk informasi jam layanan.
              </p>
            </div>
          </div>
          <div className="asset-detail-actions">
            <button onClick={onFavorite} aria-pressed={saved}>
              <Heart size={21} fill={saved ? "currentColor" : "none"} />
              {saved ? "Tersimpan" : "Simpan"}
            </button>
            <button onClick={share}>
              <Share2 size={21} />
              Bagikan
            </button>
            <button onClick={() => window.print()}>
              <Printer size={21} />
              Brosur
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
  const [deposit, setDeposit] = useState(String(Math.round(price * 0.2)));
  const [rate, setRate] = useState("");
  const [years, setYears] = useState("10");
  const principal = price - Number(deposit);
  const monthlyRate = Number(rate) / 1200;
  const months = Number(years) * 12;
  const valid =
    deposit !== "" &&
    principal > 0 &&
    principal <= price &&
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
        <PriceInput
          label="Uang muka"
          name="deposit"
          value={deposit}
          onChange={setDeposit}
          placeholder="Uang muka"
        />
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
            Isi uang muka di bawah harga aset, bunga 0–100%, dan tenor 1–30
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

"use client";
import { useCategories } from "@/features/categories/categories";
import { useEffect, useId, useRef, useState } from "react";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { PriceInput } from "@/components/ui/price-input";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import type { CatalogFilters } from "../types/page";
import { CatalogResizer } from "./catalog-resizer";

type AssetLocation = { province: string | null; city: string; district: string | null };

export function CatalogSidebar({
  initialFilters,
  onApply,
}: {
  initialFilters: CatalogFilters;
  onApply: (filters: CatalogFilters) => void;
}) {
  const categories = useCategories();
  const [mobileOpen, setMobileOpen] = useState(false);
  const panelId = useId();
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  function closeMobileFilters() {
    setMobileOpen(false);
    if (window.matchMedia("(max-width: 800px)").matches) mobileTrigger.current?.focus();
  }
  const [filters, setFilters] = useState(initialFilters);
  const [error, setError] = useState("");
  const [scrolling, setScrolling] = useState(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (scrollTimer.current !== null) clearTimeout(scrollTimer.current);
  }, []);
  function showScrollbar() {
    setScrolling(true);
    if (scrollTimer.current !== null) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      setScrolling(false);
      scrollTimer.current = null;
    }, 1000);
  }
  const [locations, setLocations] = useState<AssetLocation[]>([]);
  const [locationStatus, setLocationStatus] = useState("loading");
  const [locationRetry, setLocationRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLocationStatus("loading");
    fetch("/api/asset-locations", { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Lokasi belum tersedia.");
        const body: { data: AssetLocation[] } = await response.json();
        if (!controller.signal.aborted) {
          setLocations(body.data);
          setLocationStatus("ready");
        }
      })
      .catch(() => { if (!controller.signal.aborted) setLocationStatus("error"); });
    return () => controller.abort();
  }, [locationRetry]);
  const city = filters.city === "Semua lokasi" ? "" : filters.city || "";
  const provinceLocations = locations.filter(location => !filters.province || location.province === filters.province);
  const districtLocations = provinceLocations.filter(location => !city || location.city === city);
  function locationOptions(values: (string | null)[], selected: string | undefined, placeholder: string) {
    return [
      { value: "", label: placeholder },
      ...Array.from(new Set([...values, selected].filter((value): value is string => !!value)))
        .sort((a, b) => a.localeCompare(b, "id"))
        .map(value => ({ value, label: value })),
    ];
  }
  function set(key: keyof CatalogFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }
  return (
    <aside className={`catalog-sidebar${mobileOpen ? " is-mobile-open" : ""}`} aria-label="Filter katalog aset">
      <CatalogResizer />
      <button
        ref={mobileTrigger}
        type="button"
        className="catalog-mobile-filter-toggle"
        aria-expanded={mobileOpen}
        aria-controls={panelId}
        onClick={() => setMobileOpen(open => !open)}
      >
        <SlidersHorizontal size={18} />
        <span>{mobileOpen ? "Tutup filter" : "Tampilkan filter"}</span>
        <ChevronDown size={18} />
      </button>
      <div className="catalog-sidebar-heading">
        <h2>
          <SlidersHorizontal size={20} />
          Filter Aset
        </h2>
        <button
          type="button"
          onClick={() => {
            setFilters({});
            setError("");
            closeMobileFilters();
            onApply({});
          }}
        >
          Reset
        </button>
      </div>
      <div id={panelId} className={`catalog-sidebar-scroll${scrolling ? " is-scrolling" : ""}`} onScroll={showScrollbar} tabIndex={0} role="region" aria-label="Pilihan filter aset">
      <form
        action="/katalog-aset"
        method="get"
        onSubmit={(event) => {
          event.preventDefault();
          if (
            [filters.minPrice, filters.maxPrice].some(
              (value) => value && Number(value) > 1000000000000,
            )
          ) {
            setError(
              "Harga maksimal yang dapat dimasukkan adalah Rp1.000.000.000.000.",
            );
            return;
          }
          if (
            filters.minPrice &&
            filters.maxPrice &&
            Number(filters.minPrice) > Number(filters.maxPrice)
          ) {
            setError(
              "Harga minimal tidak boleh lebih besar dari harga maksimal.",
            );
            return;
          }
          if (
            filters.dateFrom &&
            filters.dateTo &&
            filters.dateFrom > filters.dateTo
          ) {
            setError("Tanggal awal tidak boleh melewati tanggal akhir.");
            return;
          }
          setError("");
          onApply(filters);
          closeMobileFilters();
        }}
      >
        <label>
          <span>Kata kunci</span>
          <div className="sidebar-search-field">
            <Search size={17} />
            <input
              name="q"
              maxLength={100}
              value={filters.q || ""}
              onChange={(e) => set("q", e.target.value)}
              placeholder="Nama atau kode aset"
            />
          </div>
        </label>
        <Select
          label="Metode Penjualan"
          name="saleMethod"
          value={filters.saleMethod || ""}
          onChange={(value) => set("saleMethod", value)}
          options={[
            { value: "", label: "Semua metode" },
            ...["Jual Beli", "Lelang", "Cessie"].map((method) => ({
              value: method,
              label: method,
            })),
          ]}
        />
        <Select
          label="Kategori"
          name="category"
          value={filters.category || "Semua"}
          onChange={(value) => set("category", value)}
          options={[
            { value: "Semua", label: "Semua kategori" },
            ...categories.map(c=>({value:c.name,label:c.label})),
          ]}
        />
        <Select
          label="Provinsi"
          name="province"
          value={filters.province || ""}
          onChange={(province) => setFilters(current => ({ ...current, province, city: "", district: "" }))}
          options={locationOptions(locations.map(location => location.province), filters.province, "Semua provinsi")}
        />
        <Select
          label="Kabupaten / Kota"
          name="city"
          value={city}
          onChange={(city) => setFilters(current => ({ ...current, city, district: "" }))}
          options={locationOptions(provinceLocations.map(location => location.city), city, "Semua kabupaten/kota")}
        />
        <Select
          label="Kecamatan"
          name="district"
          value={filters.district || ""}
          disabled={!city}
          onChange={(value) => set("district", value)}
          options={locationOptions(districtLocations.map(location => location.district), filters.district, city ? "Semua kecamatan" : "Pilih kabupaten/kota dahulu")}
        />
        {locationStatus === "loading" && <small role="status">Memuat pilihan wilayah…</small>}
        {locationStatus === "error" && <div role="alert">Pilihan wilayah belum dapat dimuat. <button type="button" onClick={() => setLocationRetry(value => value + 1)}>Coba lagi</button></div>}
        <Select
          label="Tag"
          name="tag"
          value={filters.tag || ""}
          onChange={(value) => set("tag", value)}
          options={[
            { value: "", label: "Semua tag" },
            { value: "featured", label: "Aset Unggulan" },
            { value: "discount", label: "Turun Harga" },
          ]}
        />
        <PriceInput
          label="Harga minimal"
          name="minPrice"
          value={filters.minPrice || ""}
          onChange={(value) => set("minPrice", value)}
          placeholder="0"
        />
        <PriceInput
          label="Harga maksimal"
          name="maxPrice"
          value={filters.maxPrice || ""}
          onChange={(value) => set("maxPrice", value)}
          placeholder="Tanpa batas"
        />
        <fieldset className="filter-date-range">
          <legend>Waktu Lelang</legend>
          <DatePicker
            label="Dari tanggal"
            name="dateFrom"
            value={filters.dateFrom || ""}
            max={filters.dateTo || "9999-12-31"}
            onChange={(value) => set("dateFrom", value)}
          />
          <DatePicker
            label="Sampai tanggal"
            name="dateTo"
            value={filters.dateTo || ""}
            min={filters.dateFrom || "1000-01-01"}
            onChange={(value) => set("dateTo", value)}
          />
          <small>Termasuk seluruh hari pada tanggal akhir (WIB).</small>
        </fieldset>
        {error && (
          <div className="filter-validation" role="alert">
            {error}
          </div>
        )}
        <button className="primary-button" type="submit">
          <Search size={17} />
          Terapkan Filter
        </button>
      </form>
      <p>Temukan aset berdasarkan kategori, lokasi, dan anggaran Anda.</p>
      </div>
    </aside>
  );
}

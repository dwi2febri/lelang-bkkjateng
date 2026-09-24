"use client";
import { useCategories } from "@/features/categories/categories";
import { useState } from "react";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { PriceInput } from "@/components/ui/price-input";
import { Search, SlidersHorizontal } from "lucide-react";
import type { CatalogFilters } from "../types/page";

export function CatalogSidebar({
  initialFilters,
  onApply,
}: {
  initialFilters: CatalogFilters;
  onApply: (filters: CatalogFilters) => void;
}) {
  const categories = useCategories();
  const [filters, setFilters] = useState(initialFilters);
  const [error, setError] = useState("");
  function set(key: keyof CatalogFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }
  return (
    <aside className="catalog-sidebar" aria-label="Filter katalog aset">
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
            onApply({});
          }}
        >
          Reset
        </button>
      </div>
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
          label="Kota / Kabupaten"
          name="city"
          value={filters.city || "Semua lokasi"}
          onChange={(value) => set("city", value)}
          options={Array.from(
            new Set([
              "Semua lokasi",
              "Semarang",
              "Surakarta",
              "Karanganyar",
              "Banyumas",
              "Pekalongan",
              "Kendal",
              ...(filters.city ? [filters.city] : []),
            ]),
          ).map((city) => ({ value: city, label: city }))}
        />
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
    </aside>
  );
}

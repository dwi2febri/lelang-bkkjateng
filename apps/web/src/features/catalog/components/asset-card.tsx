"use client";
import { Heart, MapPin, CalendarDays, ArrowUpRight } from "lucide-react";
import { CategoryIcon, type Category } from "@/features/categories/categories";
import {
  getCategorySettings,
  formatSpec,
  specValue,
} from "@/features/categories/settings";
import { AssetBadge } from "./asset-badge";
import { AssetCardPrice } from "./asset-card-price";
import type { CatalogAsset } from "../types";

const date = (value: string) =>
  new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

export function AssetCard({
  asset: a,
  categories: masterCategories,
  saved,
  onFavorite: favorite,
  onOpen: open,
}: {
  asset: CatalogAsset;
  categories: Category[];
  saved: boolean;
  onFavorite: (id: number) => void;
  onOpen: (asset: CatalogAsset) => void;
}) {
  return (
    <article className="asset-card">
      <div className="card-photo">
        <button
          className="photo-link"
          onClick={() => open(a)}
          aria-label={`Lihat ${a.title}`}
        >
          <img
            src={a.image}
            alt={`Ilustrasi ${a.category.toLowerCase()}`}
            loading="lazy"
          />
        </button>
        <AssetBadge price={a.price} oldPrice={a.oldPrice} />
        <button
          aria-label={saved ? "Hapus dari favorit" : "Simpan ke favorit"}
          aria-pressed={saved}
          className={"heart " + (saved ? "saved" : "")}
          onClick={() => favorite(a.id)}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="card-content">
        <div className="card-meta">
          <span className="card-category">
            <span aria-hidden="true">
              <CategoryIcon
                name={
                  masterCategories.find((c) => c.name === a.category)?.icon ||
                  "building"
                }
                size={17}
              />
            </span>
            <span>{a.category}</span>
          </span>
          <div className="card-location">
            <MapPin size={13} />
            {a.city}, Jawa Tengah
          </div>
        </div>
        <button className="card-title" onClick={() => open(a)}>
          {a.title}
        </button>
        <div className="specs">
          {getCategorySettings(
            a.category,
            masterCategories.find((c) => c.name === a.category)?.settings,
          )
            .fields.filter((f) => f.enabled && f.summary)
            .map((field) => (
              <span key={field.key}>
                {["luas tanah", "luas bangunan"].includes(field.label.toLowerCase()) ? (
                  <>
                    <span className="card-spec-full">{field.label}:</span>
                    <abbr className="card-spec-short" title={field.label}>
                      {field.label.toLowerCase() === "luas tanah" ? "LT" : "LB"}
                    </abbr>
                  </>
                ) : <span>{field.label}:</span>}
                {formatSpec(specValue(a, field.key), field.unit)}
              </span>
            ))}
        </div>
        <AssetCardPrice price={a.price} oldPrice={a.oldPrice} />
        <div className="card-bottom">
          <span>
            {a.saleMethod === "Lelang" && a.auctionDate ? (
              <>
                <CalendarDays size={14} />
                {date(a.auctionDate)}
              </>
            ) : (
              a.saleMethod
            )}
          </span>
          <button onClick={() => open(a)} aria-label={`Detail ${a.title}`}>
            Lihat detail
            <ArrowUpRight size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}

"use client";
import {
  CalendarDays,
  Clock3,
  MapPin,
  ArrowUpRight,
  Heart,
} from "lucide-react";
import type { CatalogAsset } from "../types";
import { currency } from "@/lib/utils";
export function ScheduleList({
  assets,
  favorites,
  onOpen,
  onFavorite,
}: {
  assets: CatalogAsset[];
  favorites: number[];
  onOpen: (asset: CatalogAsset) => void;
  onFavorite: (id: number) => void;
}) {
  const scheduledAssets = assets.filter((asset): asset is CatalogAsset & { auctionDate: string } => asset.saleMethod === "Lelang" && !!asset.auctionDate);
  const groups = Map.groupBy(scheduledAssets, (asset) =>
    new Date(asset.auctionDate).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }),
  );
  return (
    <div className="schedule-groups">
      {Array.from(groups, ([day, items]) => (
        <section className="schedule-day" key={day}>
          <div className="schedule-day-heading">
            <CalendarDays size={19} />
            <h3>{day}</h3>
            <span>{items.length} aset</span>
          </div>
          <div className="schedule-rows">
            {items.map((asset) => (
              <article className="schedule-item" key={asset.id}>
                <div className="schedule-time">
                  <Clock3 size={17} />
                  <strong>
                    {new Date(asset.auctionDate).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                      timeZone: "Asia/Jakarta",
                    })}
                  </strong>
                  <span>WIB</span>
                </div>
                <button
                  className="schedule-photo"
                  onClick={() => onOpen(asset)}
                  aria-label={`Lihat ${asset.title}`}
                >
                  <img
                    src={asset.image}
                    alt={`Ilustrasi ${asset.category.toLowerCase()}`}
                    loading="lazy"
                  />
                </button>
                <div className="schedule-info">
                  <span className="schedule-category">
                    {asset.category} · {asset.code}
                  </span>
                  <button onClick={() => onOpen(asset)}>{asset.title}</button>
                  <span className="schedule-location">
                    <MapPin size={13} />
                    {asset.city}, Jawa Tengah
                  </span>
                  <small>
                    {new Date(asset.auctionDate).getTime() < Date.now()
                      ? "Jadwal berlalu"
                      : "Jadwal mendatang"}
                  </small>
                </div>
                <div className="schedule-price">
                  <span>Harga limit</span>
                  <strong>{currency(asset.price)}</strong>
                  <button className="text-button" onClick={() => onOpen(asset)}>
                    Lihat detail <ArrowUpRight size={16} />
                  </button>
                </div>
                <button
                  className={
                    "schedule-favorite " +
                    (favorites.includes(asset.id) ? "saved" : "")
                  }
                  onClick={() => onFavorite(asset.id)}
                  aria-label={
                    favorites.includes(asset.id)
                      ? `Hapus ${asset.title} dari favorit`
                      : `Simpan ${asset.title} ke favorit`
                  }
                  aria-pressed={favorites.includes(asset.id)}
                >
                  <Heart
                    size={19}
                    fill={
                      favorites.includes(asset.id) ? "currentColor" : "none"
                    }
                  />
                </button>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

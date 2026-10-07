import { Check } from "lucide-react";

const money = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export function AssetCardPrice({ price, oldPrice }: { price: number; oldPrice?: number | null }) {
  const saving = oldPrice != null && oldPrice > price && oldPrice > 0 ? oldPrice - price : 0;
  const percent = saving && oldPrice ? Math.round((saving / oldPrice) * 100) : 0;

  return (
    <div className="asset-card-pricing">
      <div className="price-line">
        <span>Harga limit</span>
      {saving > 0 && (
        <div className="card-original-price">
          <del>{money(oldPrice!)}</del>
          <span className="card-discount-percent" aria-label={`Hemat ${percent || "kurang dari 1"} persen`}>
            {percent ? `−${percent}%` : "<1%"}
          </span>
        </div>
      )}
      </div>
      <div className="card-price">
        <strong>{money(price)}</strong>
      </div>
      {saving > 0 && (
        <p className="card-saving-note">
          <span className="card-saving-icon" aria-hidden="true"><Check size={14} strokeWidth={2.5} /></span>
          <span>Hemat {money(saving)}</span>
        </p>
      )}
    </div>
  );
}

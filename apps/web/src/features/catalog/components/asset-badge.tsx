import { Sparkle, TrendingDown } from "lucide-react";

export function AssetBadge({ price, oldPrice }: { price: number; oldPrice?: number | null }) {
  const reduced = oldPrice != null && oldPrice > 0 && price < oldPrice;

  return reduced ? (
    <span className="asset-badge discount">
      <span className="asset-badge-label"><TrendingDown aria-hidden="true" />Turun harga</span>
    </span>
  ) : (
    <span className="asset-badge available">
      <span className="asset-badge-label"><Sparkle aria-hidden="true" />Pilihan Aset</span>
    </span>
  );
}

import type { Asset } from "@/features/aset/types";

export const BILLION = 1_000_000_000;
export type AssetGroup = { name: string; count: number; total: number };

export function getDashboardAnalytics(assets: Asset[]) {
  const active = assets.filter(asset => !asset.archived);
  const methods = new Map<string, AssetGroup>(["Jual Beli", "Cessie", "Lelang"].map(name => [name, { name, count: 0, total: 0 }]));
  const categories = new Map<string, AssetGroup>();
  let total = 0;
  for (const asset of active) {
    const price = Number.isFinite(Number(asset.price)) ? Number(asset.price) : 0;
    total += price;
    for (const [groups, name] of [[methods, asset.saleMethod || "Lainnya"], [categories, asset.category || "Tanpa kategori"]] as const) {
      const group = groups.get(name) || { name, count: 0, total: 0 };
      group.count++;
      group.total += price;
      groups.set(name, group);
    }
  }
  return {
    active, total,
    methods: [...methods.values()],
    categories: [...categories.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    highValue: active.filter(asset => Number(asset.price) > BILLION).sort((a, b) => Number(b.price) - Number(a.price)),
  };
}

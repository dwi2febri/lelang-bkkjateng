export type PublicView = "home" | "catalog" | "schedule" | "favorites";
export type CatalogFilters = {
  category?: string;
  q?: string;
  city?: string;
  province?: string;
  district?: string;
  maxPrice?: string;
  minPrice?: string;
  saleMethod?: string;
  tag?: string;
  dateFrom?: string;
  dateTo?: string;
};
export const publicRoutes: Record<PublicView, string> = {
  home: "/",
  catalog: "/katalog-aset",
  schedule: "/jadwal-lelang",
  favorites: "/favorit",
};

export function catalogHref(filters: CatalogFilters = {}) {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.category && filters.category !== "Semua")
    params.set("category", filters.category);
  if (filters.city && filters.city !== "Semua lokasi")
    params.set("city", filters.city);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  for (const key of [
    "province",
    "district",
    "minPrice",
    "saleMethod",
    "tag",
    "dateFrom",
    "dateTo",
  ] as const) {
    if (filters[key]) params.set(key, filters[key]);
  }
  return publicRoutes.catalog + (params.size ? "?" + params.toString() : "");
}

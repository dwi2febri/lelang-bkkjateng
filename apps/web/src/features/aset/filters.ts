import type { Asset } from "./types";
import { sameProvince, sameRegency } from "./regions.mjs";
export type AssetFilters = {q:string;status:string;category:string;saleMethod:string;province:string;city:string;district?:string;village?:string;minPrice:string;maxPrice:string};
export function matchesAsset(a: Asset, f: AssetFilters) {
 return (f.status === "all" || (f.status === "archived" ? !!a.archived : !a.archived))
 && `${a.title} ${a.code} ${a.city} ${a.province || ""} ${a.district || ""} ${a.village || ""}`.toLowerCase().includes(f.q.trim().toLowerCase())
 && (!f.category || a.category === f.category)
 && (!f.saleMethod || a.saleMethod === f.saleMethod)
 && (!f.province || sameProvince(a.province, f.province))
 && (!f.city || sameRegency(a.city, f.city))
 && (!f.district || a.district === f.district)
 && (!f.village || a.village === f.village)
 && (!f.minPrice || a.price >= Number(f.minPrice))
 && (!f.maxPrice || a.price <= Number(f.maxPrice));
}

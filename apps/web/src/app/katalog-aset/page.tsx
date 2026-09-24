import CatalogPage from "@/features/catalog/components/catalog-page";
import type { CatalogFilters } from "@/features/catalog/types/page";
export const metadata = { title: "Katalog Aset | Lelang BKK Jateng" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters: CatalogFilters = {};
  for (const key of [
    "category",
    "q",
    "city",
    "maxPrice",
    "minPrice",
    "saleMethod",
    "tag",
    "dateFrom",
    "dateTo",
  ] as const) {
    if (typeof params[key] === "string") filters[key] = params[key];
  }
  return (
    <CatalogPage
      key={JSON.stringify(filters)}
      view="catalog"
      initialFilters={filters}
    />
  );
}

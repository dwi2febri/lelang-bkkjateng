import CatalogPage from "@/features/catalog/components/catalog-page";
import { AssetDetailSkeleton } from "@/components/ui/public-skeleton";
export default function Loading() {
  return <CatalogPage view="catalog"><AssetDetailSkeleton/></CatalogPage>;
}

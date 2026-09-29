import CatalogPage from "@/features/catalog/components/catalog-page";
import { GuideSkeleton } from "@/components/ui/public-skeleton";
export default function Loading() {
  return <CatalogPage view="catalog" guidePage><GuideSkeleton/></CatalogPage>;
}

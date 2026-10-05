import CatalogPage from "@/features/catalog/components/catalog-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function HomePage() {
  return <CatalogPage />;
}
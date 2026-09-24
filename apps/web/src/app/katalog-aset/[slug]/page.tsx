import { notFound } from "next/navigation";
import CatalogPage from "@/features/catalog/components/catalog-page";

export const metadata = { title: "Detail Aset | Lelang BKK Jateng" };
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const response = await fetch(
    `${process.env.API_URL || "http://127.0.0.1:3001"}/api/assets/${encodeURIComponent(slug)}`,
    { cache: "no-store" },
  );
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error("Detail aset belum dapat dimuat.");
  return <CatalogPage view="catalog" detailAsset={await response.json()} />;
}

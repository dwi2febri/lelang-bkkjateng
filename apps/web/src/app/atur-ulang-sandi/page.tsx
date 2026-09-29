import CatalogPage from "@/features/catalog/components/catalog-page";
import { PublicPasswordResetPage } from "@/features/catalog/components/public-password-reset-page";
export const metadata = { title: "Atur Ulang Kata Sandi | BKK Jateng", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;
  return <CatalogPage historyPage><PublicPasswordResetPage token={typeof token === "string" ? token : ""}/></CatalogPage>;
}

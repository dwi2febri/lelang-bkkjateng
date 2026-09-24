import Link from "next/link";
import CatalogPage from "@/features/catalog/components/catalog-page";
import { GuideContent } from "@/features/guide/guide-content";
export const metadata = { title: "Panduan Lelang | BKK Jateng" };
export default async function Page() {
  let guide = null;
  try {
    const response = await fetch(
      `${process.env.API_URL || "http://127.0.0.1:3001"}/api/guide`,
      { cache: "no-store" },
    );
    if (response.ok) guide = await response.json();
  } catch {}
  return (
    <CatalogPage view="catalog" guidePage>
      <div className="container guide-public">
        <div className="public-breadcrumb">
          <Link href="/">Beranda</Link>
          <span>/</span>
          <span>Panduan Lelang</span>
        </div>
        <span className="overline">LELANG BKK JATENG</span>
        {guide ? (
          <GuideContent guide={guide} />
        ) : (
          <div className="empty">
            <h1>Panduan Lelang</h1>
            <p>Panduan belum dapat dimuat. Silakan coba kembali.</p>
            <Link href="/panduan-lelang">Muat ulang</Link>
          </div>
        )}
      </div>
    </CatalogPage>
  );
}

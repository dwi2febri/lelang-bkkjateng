import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container asset-detail-page">
      <h1>Aset tidak ditemukan</h1>
      <p>Aset mungkin sudah tidak tersedia.</p>
      <Link className="primary-button" href="/katalog-aset">
        Kembali ke katalog
      </Link>
    </div>
  );
}

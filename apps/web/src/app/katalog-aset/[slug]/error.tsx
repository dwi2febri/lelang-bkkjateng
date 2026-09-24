"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container asset-detail-page">
      <h1>Detail belum dapat dimuat</h1>
      <p>Silakan coba kembali beberapa saat lagi.</p>
      <button className="primary-button" onClick={reset}>
        Coba lagi
      </button>{" "}
      <Link href="/katalog-aset">Kembali ke katalog</Link>
    </div>
  );
}

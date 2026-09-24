"use client";
import { useTransition } from "react";
import { House, RefreshCw, CloudOff, ArrowRight } from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";

export default function ErrorPage({ retry }: { retry: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <main className="portal-error">
      <a className="portal-error-brand" href="/" aria-label="Beranda BKK Jateng"><BrandLogo /></a>
      <section className="portal-error-card" aria-labelledby="portal-error-title">
        <div className="portal-error-art" aria-hidden="true">
          <span className="portal-error-orbit" />
          <div className="portal-error-house"><House size={76} strokeWidth={1.3} /></div>
          <span className="portal-error-cloud"><CloudOff size={27} strokeWidth={1.6} /></span>
          <span className="portal-error-dot" />
        </div>
        <span className="portal-error-label">SEJENAK, ADA KENDALA</span>
        <h1 id="portal-error-title">Halaman belum dapat dimuat</h1>
        <p>Maaf, terjadi kendala saat membuka halaman ini.<br className="portal-error-break" /> Silakan coba lagi dalam beberapa saat.</p>
        <div className="portal-error-actions">
          <button className="primary-button" disabled={pending} onClick={() => startTransition(() => retry())}>
            <RefreshCw size={17} className={pending ? "portal-error-spin" : undefined} />
            {pending ? "Mencoba kembali..." : "Coba lagi"}
          </button>
          <a href="/" className="portal-error-home">Kembali ke beranda <ArrowRight size={17} /></a>
        </div>
        <div className="portal-error-note" role="status">{pending ? "Sedang memuat ulang halaman." : "Jika kendala berlanjut, silakan kunjungi kembali nanti."}</div>
      </section>
      <p className="portal-error-signature">Lelang &amp; Katalog Aset <span>·</span> BKK Jateng</p>
    </main>
  );
}

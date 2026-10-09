"use client";
import { useEffect, useRef, useState } from "react";
import { MapPin, Mail, Phone, MessageCircle, ShieldCheck, Users, UserRound, ChevronUp } from "lucide-react";

export function PublicFooter() {
  const footerRef = useRef<HTMLElement>(null);
  const [footerVisible, setFooterVisible] = useState(false);
  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting));
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);
  const [counts, setCounts] = useState<{ daily: number; total: number } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let visitorId: string;
    try {
      visitorId = localStorage.getItem("bkk-site-visitor") || crypto.randomUUID();
      localStorage.setItem("bkk-site-visitor", visitorId);
    } catch { return; }
    fetch("/api/visitors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId }), signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error("Unavailable"); return response.json(); })
      .then(data => { if (Number.isFinite(data.daily) && Number.isFinite(data.total)) setCounts(data); })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return <footer className="public-footer" ref={footerRef}>
    <div className="container public-footer-grid">
      <div className="public-footer-about">
        <img src="/logo/bkk-lelang-v2.png" alt="BKK Jateng Lelang dan Katalog Aset" width={2172} height={724} />
        <p>PT BPR BKK Jateng (Perseroda) adalah pelaku jasa keuangan berizin dan diawasi oleh Otoritas Jasa Keuangan sekaligus merupakan Bank Peserta Penjaminan Lembaga Penjamin Simpanan (LPS)</p>
      </div>
      <div><h4>Alamat</h4><p className="public-footer-line"><MapPin size={18} /><span>Jl. Tanjung No.11-A Sekayu, Semarang Tengah, Kota Semarang 50132</span></p></div>
      <div><h4>Kontak</h4><div className="public-footer-contacts">
        <a href="mailto:kanpus@bkkjateng.co.id"><Mail size={18} />kanpus@bkkjateng.co.id</a>
        <a href="tel:02486403887"><Phone size={18} />(024) 86403887</a>
        <a href="https://wa.me/6281578100833" target="_blank" rel="noreferrer"><MessageCircle size={18} />0815-7810-0833</a>
        <span><ShieldCheck size={18} />Whistleblowing System</span>
      </div></div>
      <div><h4>Produk</h4><div className="public-footer-products"><span>Simpanan</span><span>Pinjaman</span><span>Keris</span></div></div>
    </div>
    <div className="container public-footer-visitors" aria-live="polite">
      <span><UserRound size={17} /> Pengunjung hari ini <strong>{counts ? counts.daily.toLocaleString("id-ID") : "—"}</strong></span>
      <span><Users size={18} /> Total pengunjung <strong>{counts ? counts.total.toLocaleString("id-ID") : "—"}</strong></span>
    </div>
    <button
      type="button"
      className="public-back-to-top"
      data-visible={footerVisible}
      aria-label="Kembali ke atas"
      title="Kembali ke atas"
      tabIndex={footerVisible ? 0 : -1}
      aria-hidden={!footerVisible}
      onClick={() => window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      })}
    >
      <ChevronUp size={25} aria-hidden="true" />
    </button>
  </footer>;
}

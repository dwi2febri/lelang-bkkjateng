"use client";
import { useEffect, useState } from "react";
import { MapPin, Mail, Phone, MessageCircle, ShieldCheck, Users, UserRound } from "lucide-react";

export function PublicFooter() {
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
  return <footer className="public-footer">
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
  </footer>;
}

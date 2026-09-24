"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { UploadField } from "@/components/ui/upload-field";
import { api, errorMessage } from "@/services/api";
import { HeroSlider } from "@/features/catalog/components/hero-slider";
import defaults from "./defaults.json";
import type { BannerSettings, BannerSlide } from "./types";

const fields: { key: keyof BannerSlide; label: string; max: number }[] = [
  { key: "eyebrow", label: "Teks kecil di atas judul", max: 100 },
  { key: "title", label: "Judul utama", max: 100 },
  { key: "accent", label: "Judul berwarna emas", max: 100 },
  { key: "description", label: "Deskripsi", max: 500 },
  { key: "action", label: "Tulisan tombol", max: 60 },
  { key: "href", label: "Tujuan tombol (contoh: /katalog-aset)", max: 500 },
  { key: "trustFirst", label: "Keterangan di bawah tombol — kiri", max: 100 },
  { key: "trustSecond", label: "Keterangan di bawah tombol — kanan", max: 100 },
  { key: "note", label: "Kalimat di pojok kanan bawah", max: 150 },
  { key: "caption", label: "Keterangan foto", max: 100 },
];
export function BannerEditor() {
  const [settings, setSettings] = useState<BannerSettings | null>(null);
  const [selected, setSelected] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);
  async function load() {
    setError("");
    try { setSettings((await api.get<BannerSettings>("/banners")).data); setDirty(false); setSelected(0); }
    catch (e) { setError(errorMessage(e)); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change(slides: BannerSlide[]) {
    setSettings(current => current ? { ...current, slides } : current);
    setDirty(true); setMessage("");
  }
  function patch(key: keyof BannerSlide, value: string) {
    if (settings) change(settings.slides.map((slide, i) => i === selected ? { ...slide, [key]: value } : slide));
  }
  async function upload(file?: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setError("Gunakan JPG, PNG, atau WebP maksimal 5 MB."); return; }
    setBusy(true); setError("");
    try {
      const form = new FormData(); form.append("image", file);
      patch("image", (await api.post<{ url: string }>("/admin/banners/images", form)).data.url);
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    try { setSettings((await api.put<BannerSettings>("/admin/banners", settings)).data); setDirty(false); setMessage("Banner berhasil disimpan dan tampil di beranda."); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  if (!settings) return <section className="guide-editor"><h1>Pengaturan Banner</h1>{error ? <div role="alert"><p>{error}</p><button className="admin-button" onClick={load}>Coba lagi</button></div> : <p role="status">Memuat pengaturan...</p>}</section>;
  const slide = settings.slides[selected];
  return <section className="guide-editor banner-editor">
    <div className="guide-editor-top"><div><h1>Pengaturan Banner Beranda</h1><p>Atur gambar, kalimat, dan tombol setiap slide. Perubahan tampil setelah disimpan.</p></div><Link href="/" target="_blank">Lihat beranda ↗</Link></div>
    {error && <div className="admin-alert error" role="alert">{error}</div>}
    {message && <p role="status">{message}</p>}
    <form onSubmit={save}>
      <fieldset disabled={busy} className="banner-editor-fieldset">
        <div className="banner-editor-actions"><button type="button" className="outline-button" onClick={() => setPreview(!preview)}>{preview ? "Tutup pratinjau" : "Pratinjau slide"}</button><button className="admin-button" disabled={!dirty || busy}>{busy ? "Memproses..." : "Simpan Banner"}</button><span>{dirty ? "Ada perubahan belum disimpan" : "Tersimpan"}</span></div>
        <div className="banner-slide-tabs" role="group" aria-label="Pilih slide">{settings.slides.map((item, i) => <button type="button" key={i} aria-pressed={selected === i} className={selected === i ? "active" : ""} onClick={() => setSelected(i)}>Slide {i + 1}</button>)}<button type="button" disabled={settings.slides.length >= 10} onClick={() => { change([...settings.slides, { ...defaults[0], title: "Judul banner baru" }]); setSelected(settings.slides.length); }}>+ Tambah slide</button></div>
        {preview && <div className="banner-editor-preview" inert><HeroSlider key={selected} previewSlides={[slide]} /></div>}
        <div className="guide-editor-block">
          <div className="banner-editor-actions"><h2>Slide {selected + 1}</h2><button className="outline-button" type="button" disabled={selected === 0} onClick={() => { const next = [...settings.slides]; [next[selected - 1], next[selected]] = [next[selected], next[selected - 1]]; change(next); setSelected(selected - 1); }}>← Sebelumnya</button><button className="outline-button" type="button" disabled={selected === settings.slides.length - 1} onClick={() => { const next = [...settings.slides]; [next[selected + 1], next[selected]] = [next[selected], next[selected + 1]]; change(next); setSelected(selected + 1); }}>Berikutnya →</button><button className="outline-button" type="button" disabled={settings.slides.length === 1} onClick={() => { change(settings.slides.filter((_, i) => i !== selected)); setSelected(Math.max(0, selected - 1)); }}>Hapus slide</button></div>
          <img className="banner-editor-image" src={slide.image} alt={`Gambar slide ${selected + 1}`} />
          <UploadField key={selected} label="Gambar banner" hint="Gunakan gambar landscape, disarankan lebar 1920 px. Gambar akan tampil setelah pengaturan disimpan." disabled={busy} onFile={upload} />
          <div className="banner-editor-fields">{fields.map(field => <label className="admin-field" key={field.key}>{field.label}{field.key === "description" ? <textarea rows={4} value={slide[field.key]} maxLength={field.max} onChange={e => patch(field.key, e.target.value)} /> : <input required={["title", "action", "href"].includes(field.key)} value={slide[field.key]} maxLength={field.max} onChange={e => patch(field.key, e.target.value)} />}</label>)}</div>
        </div>
      </fieldset>
    </form>
  </section>;
}

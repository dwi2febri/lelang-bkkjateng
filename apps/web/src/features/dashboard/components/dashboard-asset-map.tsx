"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MapPin, Search, ArrowUpRight } from "lucide-react";
import type { Asset } from "@/features/aset/types";
import { isMapPoint } from "@/features/aset/google-maps";
import { loadGoogleMaps, onMapsAuthenticationError } from "@/features/aset/services/google-maps-loader";
import { currency } from "@/lib/utils";

export function DashboardAssetMap({ assets }: { assets: Asset[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [ready, setReady] = useState(false), [error, setError] = useState(""), [retry, setRetry] = useState(0);
  const canvas = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const info = useRef<google.maps.InfoWindow | null>(null);
  const library = useRef<google.maps.MarkerLibrary | null>(null);
  const pins = useRef(new Map<number, google.maps.marker.AdvancedMarkerElement>());
  const located = useMemo(() => assets.flatMap(asset => {
    try {
      const details = typeof asset.details === "string" ? JSON.parse(asset.details) : asset.details;
      const demo = !!details?.locationIsDemo;
      return isMapPoint(details) ? [{ asset, point: { lat: details.latitude, lng: details.longitude }, demo }] : [];
    } catch { return []; }
  }), [assets]);
  const filtered = useMemo(() => {
    const text = query.trim().toLocaleLowerCase("id-ID");
    return located.filter(({ asset }) => [asset.title, asset.code, asset.category, asset.saleMethod, asset.city, asset.district, asset.village, asset.address].filter(Boolean).join(" ").toLocaleLowerCase("id-ID").includes(text));
  }, [located, query]);

  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;
    setReady(false); setError("");
    const unsubscribe = onMapsAuthenticationError(() => { if (!disposed) { setReady(false); setError("Peta belum tersedia. Silakan coba lagi."); } });
    const timeout = window.setTimeout(() => { if (!disposed) setError("Peta belum berhasil dimuat. Periksa koneksi lalu coba lagi."); }, 20000);
    loadGoogleMaps().then(({ maps, markers }) => {
      if (disposed || !canvas.current) return;
      library.current = markers;
      const instance = new maps.Map(canvas.current, { center: { lat: -7.15, lng: 110.14 }, zoom: 8, mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID", streetViewControl: false, gestureHandling: "cooperative", fullscreenControl: true, mapTypeControl: true });
      map.current = instance;
      info.current = new maps.InfoWindow();
      observer = new ResizeObserver(() => google.maps.event.trigger(instance, "resize"));
      observer.observe(canvas.current);
      window.clearTimeout(timeout); setReady(true); setError("");
    }).catch(() => { if (!disposed) { window.clearTimeout(timeout); setError("Peta belum dapat dimuat. Daftar lokasi aset tetap tersedia di bawah."); } });
    return () => { disposed = true; window.clearTimeout(timeout); unsubscribe(); observer?.disconnect(); info.current?.close(); map.current = null; };
  }, [retry]);

  useEffect(() => {
    if (!ready || !map.current || !library.current) return;
    const instance = map.current;
    const listeners: google.maps.MapsEventListener[] = [];
    const created: google.maps.marker.AdvancedMarkerElement[] = [];
    const bounds = new google.maps.LatLngBounds();
    info.current?.close();
    for (const { asset, point } of filtered) {
      const marker = new library.current.AdvancedMarkerElement({ map: instance, position: point, title: `${asset.code} · ${asset.title}` });
      created.push(marker); pins.current.set(asset.id, marker); bounds.extend(point);
      listeners.push(marker.addListener("click", () => setSelectedId(asset.id)));
    }
    if (filtered.length === 1) { instance.setCenter(filtered[0].point); instance.setZoom(15); }
    else if (filtered.length > 1) {
      instance.fitBounds(bounds, 50);
      listeners.push(google.maps.event.addListenerOnce(instance, "idle", () => { if ((instance.getZoom() || 0) > 16) instance.setZoom(16); }));
    }
    return () => { listeners.forEach(listener => listener.remove()); created.forEach(marker => { marker.map = null; }); pins.current.clear(); };
  }, [filtered, ready]);

  useEffect(() => {
    const found = filtered.find(item => item.asset.id === selectedId);
    const marker = selectedId ? pins.current.get(selectedId) : undefined;
    if (!found || !marker || !map.current || !info.current) return;
    const content = document.createElement("div"); content.className = "dashboard-map-popup";
    const cover = document.createElement("div"); cover.className = "dashboard-map-popup-cover";
    const coverUrl = found.asset.image || found.asset.photos?.[0];
    if (coverUrl) {
      const photo = document.createElement("img");
      photo.alt = `Foto sampul ${found.asset.title}`;
      photo.width = 260; photo.height = 146;
      photo.addEventListener("error", () => { cover.textContent = "Foto belum tersedia"; }, { once: true });
      photo.src = coverUrl;
      cover.append(photo);
    } else {
      cover.textContent = "Foto belum tersedia";
    }
    const title = document.createElement("strong"); title.textContent = found.asset.title;
    const text = document.createElement("p"); text.textContent = `${found.asset.code} · ${found.asset.saleMethod} · ${currency(found.asset.price)}`;
    const link = document.createElement("a"); link.href = `/aset/${found.asset.id}`; link.textContent = "Lihat detail aset →";
    content.append(cover, title, text, link);
    info.current.setContent(content); info.current.open({ map: map.current, anchor: marker });
    map.current.panTo(found.point);
  }, [selectedId, filtered, ready]);

  return <section className="admin-panel dashboard-map-panel">
    <div className="panel-heading"><div><h2>Sebaran lokasi aset</h2><p>Cari aset, lalu pilih pin atau nama aset untuk melihat lokasinya.</p></div><MapPin size={21}/></div>
    <div className="dashboard-map-search"><label htmlFor="dashboard-location-search"><Search size={18}/><input id="dashboard-location-search" value={query} onChange={event => { setQuery(event.target.value); setSelectedId(null); }} placeholder="Cari nama, kode aset, kategori, metode, atau lokasi..."/><span className="dashboard-visually-hidden">Cari aset pada peta</span></label>{query && <button type="button" onClick={() => { setQuery(""); setSelectedId(null); }}>Reset</button>}</div>
    <p className="dashboard-map-caption" role="status">{filtered.length} dari {located.length} lokasi ditampilkan{assets.length > located.length ? ` · ${assets.length - located.length} aset belum memiliki koordinat` : ""}{located.some(item => item.demo) ? " · Sebagian titik merupakan lokasi demo" : ""}</p>
    <div className="dashboard-map-layout"><div className="dashboard-map-frame"><div className="dashboard-map-canvas" ref={canvas} aria-label="Peta sebaran lokasi aset"/>{(!ready || error) && <div className="dashboard-map-overlay" role={error ? "alert" : "status"}>{error || "Memuat peta lokasi aset..."}{error && <button type="button" className="outline-button" onClick={() => setRetry(value => value + 1)}>Coba lagi</button>}</div>}</div>
      <div className="dashboard-map-results" aria-label="Hasil pencarian lokasi aset">{filtered.length ? filtered.map(({ asset }) => <div className={selectedId === asset.id ? "selected" : ""} key={asset.id}><button type="button" onClick={() => setSelectedId(asset.id)} aria-pressed={selectedId === asset.id}><small>{asset.code} · {asset.saleMethod}</small><strong>{asset.title}</strong><span>{asset.city}</span><b>{currency(asset.price)}</b></button><Link href={`/aset/${asset.id}`} aria-label={`Detail ${asset.title}`}><ArrowUpRight size={17}/></Link></div>) : <p className="dashboard-analytics-empty">{query ? "Tidak ada lokasi aset yang sesuai dengan pencarian." : "Belum ada aset dengan koordinat lokasi."}</p>}</div>
    </div>
  </section>;
}

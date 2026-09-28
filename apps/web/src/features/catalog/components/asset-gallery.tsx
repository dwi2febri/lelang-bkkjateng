"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, Images, Eye, Send } from "lucide-react";
import type { CatalogAsset } from "../types";

export function AssetGallery({
  asset,
  submitted,
  preview = false,
}: {
  asset: CatalogAsset;
  submitted: boolean;
  preview?: boolean;
}) {
  const photos = [...new Set([asset.image, ...(asset.photos || [])])];
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [views, setViews] = useState(asset.viewCount || 0);
  const modal = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (preview) return;
    let cancelled = false;
    try {
      let visitorId = sessionStorage.getItem("bkk-visitor");
      if (!visitorId) {
        visitorId = crypto.randomUUID();
        sessionStorage.setItem("bkk-visitor", visitorId);
      }
      fetch(`/api/assets/${encodeURIComponent(asset.slug)}/views`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId }),
      })
        .then(async (response) => {
          if (response.ok && !cancelled)
            setViews((await response.json()).viewCount);
        })
        .catch(() => {});
    } catch {}
    return () => {
      cancelled = true;
    };
  }, [asset.slug, preview]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modal.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        setActive(
          (index) =>
            (index + (event.key === "ArrowRight" ? 1 : photos.length - 1)) %
            photos.length,
        );
      }
      if (event.key === "Tab") {
        const buttons = modal.current?.querySelectorAll<HTMLButtonElement>(
          "button:not(:disabled)",
        );
        if (!buttons?.length) return;
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, [open, photos.length]);
  function show(index: number) {
    setActive(index);
    setOpen(true);
  }
  return (
    <>
      <div className="asset-photo-gallery">
        <button
          className="gallery-cover"
          onClick={() => show(0)}
          aria-label={`Perbesar foto ${asset.title}`}
        >
          <img src={photos[0]} alt={`Ilustrasi ${asset.title}`} />
          <span>
            <Images size={16} /> {photos.length} foto
          </span>
        </button>
        {photos.length > 1 && (
          <div className="gallery-preview">
            {photos.slice(0, 4).map((url, index) => (
              <button
                key={url}
                onClick={() => show(index)}
                aria-label={
                  index === 3
                    ? `Lihat semua ${photos.length} foto`
                    : `Perbesar foto ${index + 1}`
                }
              >
                <img
                  src={url}
                  alt={`Foto ilustrasi ${index + 1}`}
                  loading="lazy"
                />
                {index === 3 && <span>Lihat semua</span>}
              </button>
            ))}
          </div>
        )}
        <div className="gallery-meta">
          <small>{asset.image.startsWith("/api/uploads/") ? "Foto aset" : "Foto ilustrasi · Data contoh"}</small>
          <div>
            <span className="asset-method">{asset.category}</span>
            <span title="Dilihat per sesi browser">
              <Eye size={18} aria-hidden="true" />
              {views} dilihat
            </span>
            <span title="Jumlah pengajuan minat">
              <Send size={17} aria-hidden="true" />
              {(asset.interestCount || 0) + (submitted ? 1 : 0)} pengajuan
            </span>
          </div>
        </div>
      </div>
      {open &&
        createPortal(
          <div className="gallery-backdrop" onClick={() => setOpen(false)}>
            <div
              ref={modal}
              className="gallery-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="gallery-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="gallery-heading">
                <h2 id="gallery-title">{asset.title}</h2>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Tutup galeri"
                >
                  <X size={26} />
                </button>
              </div>
              <div className="gallery-layout">
                <div className="gallery-stage">
                  <img
                    src={photos[active]}
                    alt={`Ilustrasi ${asset.title}, foto ${active + 1}`}
                  />
                  {photos.length > 1 && (
                    <>
                      <button
                        className="gallery-prev"
                        onClick={() =>
                          setActive(
                            (active + photos.length - 1) % photos.length,
                          )
                        }
                        aria-label="Foto sebelumnya"
                      >
                        <ChevronLeft />
                      </button>
                      <button
                        className="gallery-next"
                        onClick={() => setActive((active + 1) % photos.length)}
                        aria-label="Foto berikutnya"
                      >
                        <ChevronRight />
                      </button>
                    </>
                  )}
                  <span className="gallery-counter" role="status">
                    {active + 1} / {photos.length}
                  </span>
                </div>
                <div className="gallery-thumbnails">
                  {photos.map((url, index) => (
                    <button
                      key={url}
                      className={index === active ? "active" : ""}
                      aria-label={`Tampilkan foto ${index + 1}`}
                      aria-pressed={index === active}
                      onClick={() => setActive(index)}
                    >
                      <img src={url} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

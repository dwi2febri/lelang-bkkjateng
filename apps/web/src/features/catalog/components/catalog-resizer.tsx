"use client";

import { useEffect, useRef, useState } from "react";

export function CatalogResizer() {
  const handle = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; width: number; scale: number } | null>(null);
  const [width, setWidth] = useState(235);
  const [maximum, setMaximum] = useState(420);

  function layout() {
    const sidebar = handle.current?.parentElement;
    const grid = sidebar?.parentElement;
    return { sidebar, grid };
  }

  function resize(value: number) {
    const { grid } = layout();
    if (!grid) return;
    const limit = Math.max(200, Math.min(420, grid.clientWidth * 0.4));
    const next = Math.round(Math.max(200, Math.min(limit, value)));
    grid.style.setProperty("--catalog-filter-width", `${next}px`);
    setWidth(next);
    setMaximum(Math.floor(limit));
  }

  function finish() {
    drag.current = null;
    layout().grid?.classList.remove("is-resizing-filter");
  }

  useEffect(() => {
    const { sidebar, grid } = layout();
    if (!sidebar || !grid) return;
    const observer = new ResizeObserver(() => {
      if (window.matchMedia("(max-width: 800px)").matches) return;
      const limit = Math.max(200, Math.min(420, grid.clientWidth * 0.4));
      setMaximum(Math.floor(limit));
      if (sidebar.offsetWidth > limit) resize(limit);
      else setWidth(sidebar.offsetWidth);
    });
    observer.observe(sidebar);
    observer.observe(grid);
    return () => {
      observer.disconnect();
      grid.classList.remove("is-resizing-filter");
      grid.style.removeProperty("--catalog-filter-width");
    };
  }, []);

  return (
    <div
      ref={handle}
      className="catalog-resizer"
      role="separator"
      tabIndex={0}
      aria-label="Atur lebar filter aset"
      aria-orientation="vertical"
      aria-valuemin={200}
      aria-valuemax={maximum}
      aria-valuenow={width}
      title="Geser untuk mengatur lebar filter. Klik dua kali untuk mengembalikan ukuran."
      onPointerDown={event => {
        if (event.button !== 0) return;
        const { sidebar, grid } = layout();
        if (!sidebar || !grid) return;
        event.preventDefault();
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
          x: event.clientX,
          width: sidebar.offsetWidth,
          scale: grid.getBoundingClientRect().width / grid.offsetWidth,
        };
        grid.classList.add("is-resizing-filter");
      }}
      onPointerMove={event => {
        if (drag.current) resize(drag.current.width + (event.clientX - drag.current.x) / drag.current.scale);
      }}
      onPointerUp={event => {
        finish();
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
      onDoubleClick={() => layout().grid?.style.removeProperty("--catalog-filter-width")}
      onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        resize(event.key === "Home" ? 200 : event.key === "End" ? maximum : width + (event.key === "ArrowRight" ? 10 : -10));
      }}
    />
  );
}

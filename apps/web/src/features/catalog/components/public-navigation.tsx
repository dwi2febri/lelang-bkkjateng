"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";

const items = [
  ["/", "Beranda"],
  ["/katalog-aset", "Katalog Aset"],
  ["/jadwal-lelang", "Jadwal Lelang"],
  ["/panduan-lelang", "Panduan Lelang"],
  ["/riwayat-pengajuan", "History Pengajuan"],
] as const;

// Public pages remount their header. Remember only the last menu destination
// in this browser module so its marker can continue moving across routes.
let previousHref: string | null = null;

export function PublicNavigation({ activeHref, open, onNavigate }: {
  activeHref: string;
  open: boolean;
  onNavigate: () => void;
}) {
  const nav = useRef<HTMLElement>(null);
  const marker = useRef<HTMLSpanElement>(null);
  const transition = useRef<{ href: string; from: string | null } | null>(null);

  useLayoutEffect(() => {
    const element = nav.current;
    const indicator = marker.current;
    if (!element || !indicator) return;
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>("a"));
    const active = links.find(link => link.getAttribute("href") === activeHref);
    if (transition.current?.href !== activeHref) {
      transition.current = { href: activeHref, from: previousHref };
    }
    const previous = links.find(link => link.getAttribute("href") === transition.current?.from);
    previousHref = activeHref;
    let animation: Animation | undefined;
    let lastPosition = "";
    const bounds = (link: HTMLAnchorElement) => {
      const style = window.getComputedStyle(link);
      return {
        x: link.offsetLeft + parseFloat(style.paddingLeft),
        y: link.offsetTop + parseFloat(style.paddingTop) - 6,
      };
    };
    const frame = ({ x, y }: { x: number; y: number }, width = 20) => ({
      transform: `translate3d(${x}px, ${y}px, 0)`,
      width: `${width}px`,
    });
    const measure = (animate = false) => {
      if (!active || !element.getClientRects().length) {
        delete element.dataset.markerReady;
        indicator.style.opacity = "0";
        return;
      }
      const destination = bounds(active);
      const target = frame(destination);
      const position = JSON.stringify(target);
      if (position === lastPosition) return;
      lastPosition = position;
      animation?.cancel();
      Object.assign(indicator.style, target, { opacity: "1" });
      element.dataset.markerReady = "true";
      if (animate && previous && previous !== active && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const start = bounds(previous);
        const stretch = Math.min(72, 20 + Math.abs(destination.x - start.x) * 0.3);
        // The leading edge advances first; the trailing edge catches up so
        // the gold line gently stretches, then returns to its original size.
        const middle = frame({
          x: start.x + (destination.x - start.x) * 0.55 - (stretch - 20) / 2,
          y: start.y + (destination.y - start.y) * 0.55,
        }, stretch);
        animation = indicator.animate([frame(start), { ...middle, offset: 0.45 }, target], {
          duration: 540,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        });
      }
    };
    measure(true);
    const observer = new ResizeObserver(() => measure());
    observer.observe(element);
    links.forEach(link => observer.observe(link));
    return () => { observer.disconnect(); animation?.cancel(); };
  }, [activeHref, open]);

  return <nav ref={nav} className={`public-navigation${open ? " open" : ""}`} aria-label="Menu utama">
    <span ref={marker} className="public-navigation-marker" aria-hidden="true" />
    {items.map(([href, label]) => <Link key={href} href={href}
      aria-current={activeHref === href ? "page" : undefined}
      className={activeHref === href ? "active" : ""}
      onClick={onNavigate}>{label}</Link>)}
  </nav>;
}

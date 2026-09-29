"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";

import defaults from "@/features/banner/defaults.json";
import type { BannerSlide } from "@/features/banner/types";

export function HeroSlider({ previewSlides }: { previewSlides?: BannerSlide[] } = {}) {
  const [savedSlides, setSavedSlides] = useState<BannerSlide[]>(defaults);
  const slides = previewSlides || savedSlides;
  useEffect(() => {
    if (previewSlides) return;
    const controller = new AbortController();
    fetch("/api/banners", { signal: controller.signal, cache: "no-store" })
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { if (Array.isArray(data.slides) && data.slides.length) { setSavedSlides(data.slides); setActive(0); } })
      .catch(() => {});
    return () => controller.abort();
  }, [previewSlides]);
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (previewSlides || slides.length < 2 || focused || reducedMotion) return;
    const timer = window.setInterval(() => {
      if (!document.hidden)
        setActive((current) => (current + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [focused, reducedMotion, slides.length, previewSlides]);
  const slide = slides[active % slides.length];
  return (
    <section
      className="hero hero-slider"
      aria-label="Informasi pilihan BKK Jateng"
      aria-roledescription="carousel"
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <div
        className="hero-slide"
        key={active}
        role="group"
        aria-roledescription="slide"
        aria-label={`${active + 1} dari ${slides.length}`}
      >
        <img
          className="hero-image"
          src={slide.image}
          alt=""
        />
        <div className="hero-shade" />
        <div className="container hero-content">
          <div className="eyebrow">
            <span />
            {slide.eyebrow}
          </div>
          <h1>
            {slide.title}
            <br />
            <em>{slide.accent}</em>
          </h1>
          <p>{slide.description}</p>
          <Link className="gold-button" href={slide.href}>
            {slide.action}
            <ArrowUpRight size={19} />
          </Link>
          <div className="hero-trust">
            <ShieldCheck size={18} />
            <span>{slide.trustFirst}</span>
            <i />
            <span>{slide.trustSecond}</span>
          </div>
        </div>
        <div className="hero-note">
          <strong>{slide.note}</strong>
          {slide.caption && !/ilustrasi|demonstrasi/i.test(slide.caption) && <small>{slide.caption}</small>}
        </div>
        <div className="hero-bkk-logo">
          <img
            src="/logo/bkk-lelang-v2.png"
            alt="BKK Jawa Tengah"
            width={2172}
            height={724}
          />
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";

import defaults from "@/features/banner/defaults.json";
import type { BannerSlide } from "@/features/banner/types";
import { resolveBannerImage, isIllustratedBanner } from "@/features/banner/images";

export function HeroSlider({ previewSlides }: { previewSlides?: BannerSlide[] } = {}) {
  const [savedSlides, setSavedSlides] = useState<BannerSlide[]>(defaults);
  const slides = previewSlides || savedSlides;
  const readyImages = useRef(new Set<string>());
  useEffect(() => {
    if (previewSlides) return;
    const controller = new AbortController();
    fetch("/api/banners", { signal: controller.signal, cache: "no-store" })
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(async data => {
        if (!Array.isArray(data.slides) || !data.slides.length) return;
        await Promise.all(data.slides.map(async (item: BannerSlide) => {
          const image = new Image();
          const source = resolveBannerImage(item.image);
          image.src = source;
          await image.decode();
          readyImages.current.add(source);
        }));
        if (controller.signal.aborted) return;
        setSavedSlides(data.slides);
        setActive(0);
      })
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
        setActive((current) => {
          const next = (current + 1) % slides.length;
          return readyImages.current.has(resolveBannerImage(slides[next].image)) ? next : current;
        });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [focused, reducedMotion, slides, previewSlides]);
  const slide = slides[active % slides.length];
  const image = resolveBannerImage(slide.image);
  return (
    <section
      className={`hero hero-slider${isIllustratedBanner(image) ? " hero-illustrated" : ""}`}
      aria-label="Informasi pilihan BKK Jateng"
      aria-roledescription="carousel"
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      {slides.map((item, index) => {
        const source = resolveBannerImage(item.image);
        return (
          <img
            key={`${index}:${source}`}
            className="hero-image hero-slider-image"
            src={source}
            alt=""
            loading="eager"
            fetchPriority={index === 0 ? "high" : "auto"}
            style={{
              opacity: index === active % slides.length ? 1 : 0,
              zIndex: index === active % slides.length ? 1 : 0,
              transition: reducedMotion ? "none" : index === active % slides.length
                ? "opacity .45s ease-in-out" : "opacity 0s .45s",
            }}
            onLoad={async (event) => {
              try {
                await event.currentTarget.decode();
                readyImages.current.add(source);
              } catch { /* Keep the current slide while a replacement is unavailable. */ }
            }}
          />
        );
      })}
      <div
        className="hero-slide"
        role="group"
        aria-roledescription="slide"
        aria-label={`${active + 1} dari ${slides.length}`}
      >
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
            src="/logo/bkk-lelang-v2.webp"
            alt="BKK Jawa Tengah"
            width={2172}
            height={724}
          />
        </div>
      </div>
    </section>
  );
}

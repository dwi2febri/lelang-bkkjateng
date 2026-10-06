"use client";
import {getCategorySettings,specValue,formatSpec} from "@/features/categories/settings";
import { useCategories, CategoryIcon } from "@/features/categories/categories";
import { AssetDetail } from "./asset-detail";
import { HeroSlider } from "./hero-slider";
import { PublicNavigation } from "./public-navigation";
import { BrandLogo } from "@/components/ui/brand-logo";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { PublicFooter } from "./public-footer";
import { ScheduleCalendar } from "./schedule-calendar";
import { ScheduleList } from "./schedule-list";
import { AssetGridSkeleton, ListSkeleton, Skeleton } from "@/components/ui/public-skeleton";
import { CatalogSidebar } from "./catalog-sidebar";
import {
  publicRoutes,
  catalogHref,
  type PublicView,
  type CatalogFilters,
} from "../types/page";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  MapPin,
  ChevronDown,
  Heart,
  Building2,
  Trees,
  CarFront,
  Warehouse,
  CalendarDays,
  ShieldCheck,
  BadgeCheck,
  Headphones,
  SlidersHorizontal,
  X,
  Check,
  Menu,
  Ruler,
  BedDouble,
  LogOut,
} from "lucide-react";
import type { CatalogAsset as Asset } from "../types";
import { getCatalog, getInterestStatus, InterestRequestError, sendInterest } from "../services/catalog-service";
import { saveSubmissionReceipt } from "../submission-history";
import { accountRequest, saveLatestApplicant } from "../public-account";
import { usePublicFavorites } from "../public-favorites-provider";
const money = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
const date = (s: string) =>
  new Date(s).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
const saleMethodCards = [
  { name: "Jual Beli", description: "Pilihan aset dengan penawaran jual beli langsung.", icon: "/images/sale-methods/jual-beli-3d.webp", tone: "buy" },
  { name: "Lelang", description: "Temukan aset yang ditawarkan melalui proses lelang.", icon: "/images/sale-methods/lelang-3d.webp", tone: "auction" },
  { name: "Cessie", description: "Jelajahi peluang aset melalui skema cessie.", icon: "/images/sale-methods/cessie-3d.webp", tone: "cessie" },
] as const;
export default function CatalogPage({
  view = "home",
  initialFilters = {},
  detailAsset,
  children,
  guidePage = false,
  historyPage = false,
}: {
  view?: PublicView;
  initialFilters?: CatalogFilters;
  detailAsset?: Asset;
  children?: React.ReactNode;
  guidePage?: boolean;
  historyPage?: boolean;
}) {
  const masterCategories = useCategories();
  const categories = [{name:"Semua",label:"Semua Aset",icon:"building",showHome:true},...masterCategories.filter(c=>c.showHome)];
  const [scheduleView, setScheduleView] = useState<"list" | "calendar">("list");
  const selected = detailAsset;
  const router = useRouter();
  const sentinel = useRef<HTMLDivElement>(null);
  const requesting = useRef(false);
  const [retry, setRetry] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const { minPrice, saleMethod, tag, dateFrom, dateTo, province, district } = initialFilters;
  const [total, setTotal] = useState(0),
    [page, setPage] = useState(1),
    [period, setPeriod] = useState("upcoming");
  const pageSize = view === "home" ? 4 : view === "favorites" ? 200 : 12;
  const [assets, setAssets] = useState<Asset[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const { favorites, favoritesReady, publicUser, accountChecked, toggleFavorite } = usePublicFavorites();
  const [category, setCategory] = useState(
      initialFilters.category?.slice(0,30) || "Semua",
    ),
    [city, setCity] = useState(
      initialFilters.city?.slice(0, 60) || "Semua lokasi",
    ),
    [price, setPrice] = useState(
      initialFilters.maxPrice &&
        /^\d{1,13}$/.test(initialFilters.maxPrice) &&
        Number(initialFilters.maxPrice) <= 1000000000000
        ? initialFilters.maxPrice
        : "",
    ),
    [query, setQuery] = useState(initialFilters.q?.slice(0, 100) || ""),
    [term, setTerm] = useState(initialFilters.q?.slice(0, 100) || ""),
    [sort, setSort] = useState("recommended");
  const [info, setInfo] = useState(""),
    [menu, setMenu] = useState(false),
    [submitted, setSubmitted] = useState(false),
    [historyUnavailable, setHistoryUnavailable] = useState(false),
    [sending, setSending] = useState(false),
    [formError, setFormError] = useState("");
  const [interestCheck, setInterestCheck] = useState<{ key: string; state: "ready" | "submitted" | "error" } | null>(null);
  const [interestRetry, setInterestRetry] = useState(0);
  const interestKey = `${selected?.slug || ""}:${publicUser?.id || 0}`;
  const interestState = interestCheck?.key === interestKey ? interestCheck.state : undefined;
  const checkingInterest = !accountChecked || (!!publicUser && !interestState);
  const alreadyContacted = interestState === "submitted";
  useEffect(() => {
    setSubmitted(false);
    setFormError("");
    setInterestCheck(null);
    if (!selected || !accountChecked || !publicUser) return;
    const controller = new AbortController();
    getInterestStatus(selected.slug, controller.signal).then(result => {
      if (!controller.signal.aborted) setInterestCheck({ key: interestKey, state: result.submitted ? "submitted" : "ready" });
    }).catch(() => {
      if (!controller.signal.aborted) setInterestCheck({ key: interestKey, state: "error" });
    });
    return () => controller.abort();
  }, [selected?.slug, publicUser?.id, accountChecked, interestKey, interestRetry]);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      requesting.current = true;
      setLoading(true);
      setError("");
      try {
        const params =
          view === "home"
            ? new URLSearchParams({ featured: "true", sort: "recommended" })
            : new URLSearchParams({
                category,
                city,
                q: term,
                sort: view === "schedule" ? "soonest" : sort,
              });
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        if (view === "schedule") params.set("period", period);
        if (price && view !== "home") params.set("maxPrice", price);
        if (view === "catalog")
          for (const [key, value] of Object.entries({
            province,
            district,
            minPrice,
            saleMethod,
            tag,
            dateFrom,
            dateTo,
          })) {
            if (value) params.set(key, value);
          }
        const body = await getCatalog(params, signal);
        if (signal?.aborted) return;
        setAssets((previous) =>
          view === "catalog" && page > 1
            ? [
                ...previous,
                ...body.data.filter(
                  (asset) => !previous.some((item) => item.id === asset.id),
                ),
              ]
            : body.data,
        );
        setHasMore(body.data.length > 0 && page * pageSize < body.total);
        setTotal(body.total);
      } catch (e) {
        if (signal?.aborted || (e instanceof Error && e.name === "AbortError"))
          return;
        setError(
          "Katalog belum dapat dimuat. Pastikan layanan API dan MySQL berjalan.",
        );
      } finally {
        if (!signal?.aborted) {
          requesting.current = false;
          setLoading(false);
        }
      }
    },
    [
      category,
      city,
      province,
      district,
      term,
      sort,
      price,
      view,
      page,
      pageSize,
      period,
      minPrice,
      saleMethod,
      tag,
      dateFrom,
      dateTo,
    ],
  );
  useEffect(() => {
    if (
      detailAsset ||
      children ||
      guidePage ||
      historyPage ||
      (view === "schedule" && scheduleView === "calendar")
    )
      return;
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load, retry, detailAsset, children, guidePage, historyPage, view, scheduleView]);
  const loadMore = useCallback(() => {
    if (requesting.current || loading || error || !hasMore) return;
    requesting.current = true;
    setPage((current) => current + 1);
  }, [loading, error, hasMore]);
  useEffect(() => {
    if (
      view !== "catalog" ||
      loading ||
      error ||
      !hasMore ||
      !sentinel.current ||
      !("IntersectionObserver" in window)
    )
      return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: "0px 0px 240px 0px" },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [view, loading, error, hasMore, loadMore]);
  useEffect(() => {
    if (!info) return;
    const old = document.body.style.overflow;
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setInfo("");
      }
      if (e.key === "Tab") {
        const elements = document
          .querySelector('[role="dialog"]')
          ?.querySelectorAll<HTMLElement>(
            "button:not(:disabled),a[href],input,select,textarea,summary",
          );
        if (!elements?.length) return;
        const first = elements[0],
          last = elements[elements.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      window.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [info]);
  function favorite(id: number) {
    void toggleFavorite(id).catch(() => setInfo("Favorit belum tersimpan di akun. Coba kembali."));
  }
  async function logoutPublic() {
    try {
      await accountRequest("logout", {});
      try {
        localStorage.removeItem("bkk-favorites");
        localStorage.removeItem("bkk-favorites-owner");
      } catch {}
      window.location.assign("/riwayat-pengajuan");
    } catch {
      setInfo("Gagal keluar dari akun. Silakan coba kembali.");
    }
  }
  function navigate(next: string) {
    setMenu(false);
    router.push(publicRoutes[next as PublicView] || "/");
  }
  function changeFilter(change: () => void) {
    change();
    if (view === "catalog") {
      setAssets([]);
      setHasMore(false);
    }
    setPage(1);
  }
  const visible = assets.filter(
    (a) => view !== "favorites" || favorites.includes(a.id),
  );
  function open(a: Asset) {
    router.push(`/katalog-aset/${encodeURIComponent(a.slug)}`);
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected || sending || submitted || checkingInterest || alreadyContacted || interestState === "error") return;
    setSending(true);
    setFormError("");
    const data = new FormData(e.currentTarget);
    try {
      await sendInterest(selected.slug, {
        name: publicUser?.name ?? data.get("name"),
        email: publicUser?.email ?? data.get("email"),
        phone: publicUser?.phone ?? data.get("phone"),
        message: data.get("message") || "",
        consent: data.get("consent") === "on",
      });
      setHistoryUnavailable(!saveSubmissionReceipt(selected));
      saveLatestApplicant(publicUser || { name: String(data.get("name") || ""), email: String(data.get("email") || ""), phone: String(data.get("phone") || "") });
      setSubmitted(true);
    } catch (error) {
      if (error instanceof InterestRequestError && error.status === 409) {
        setInterestCheck({ key: interestKey, state: "submitted" });
        return;
      }
      setFormError(
        "Permintaan belum tersimpan. Periksa isian dan coba kembali.",
      );
    } finally {
      setSending(false);
    }
  }
  return (
    <>
      <header>
        <div className="container header-inner">
          <a href="/" className="brand" aria-label="Beranda BKK Jateng">
            <BrandLogo variant="original" />
          </a>
          <PublicNavigation
            activeHref={guidePage ? "/panduan-lelang" : historyPage ? "/riwayat-pengajuan" : publicRoutes[view]}
            open={menu}
            onNavigate={() => setMenu(false)}
          />
          {accountChecked && !publicUser && <Link href="/masuk" className="public-login-link"><span>Sudah punya akun?</span> <strong>Masuk</strong></Link>}
          {accountChecked && publicUser && <button type="button" className="public-logout-button" aria-label="Keluar" title="Keluar" onClick={logoutPublic}><LogOut size={16}/><span>Keluar</span></button>}
          <button
            className="favorite-nav"
            onClick={() => navigate("favorites")}
          >
            <Heart size={18} /> <span>Favorit</span>
            <b aria-live="polite">{favoritesReady ? favorites.length : "…"}</b>
          </button>
          <button
            className="mobile-menu"
            aria-label="Buka navigasi"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
        </div>
      </header>
      <main className={view === "home" && !selected && !children ? "homepage-compact" : undefined}>
        {children ||
          (selected ? (
            <AssetDetail
              asset={selected}
              submitted={submitted}
              saved={favorites.includes(selected.id)}
              onFavorite={() => favorite(selected.id)}
            >
              {checkingInterest ? (
                <div role="status" aria-label="Memeriksa pengajuan" className="interest-form">
                  <Skeleton className="ghost-interest-field" /><Skeleton className="ghost-interest-field" />
                  <Skeleton className="ghost-interest-field" /><Skeleton className="ghost-interest-field" />
                </div>
              ) : interestState === "error" ? (
                <div role="alert">
                  <p>Riwayat pengajuan belum dapat diperiksa. Silakan coba kembali.</p>
                  <button type="button" className="outline-button" onClick={() => setInterestRetry(value => value + 1)}>Coba kembali</button>
                </div>
              ) : submitted || alreadyContacted ? (
                <div className="success">
                  <Check />
                  <div>
                    <strong>{submitted ? "Minat Anda berhasil tersimpan" : "Anda sudah menghubungi pengelola aset ini"}</strong>
                    <p>
                      Pengajuan untuk aset {selected.code} sudah tercatat dan tidak dapat dikirim ulang.
                      Pantau statusnya melalui History Pengajuan. Chat pengelola aset tersedia setelah pengajuan diproses.
                    </p>
                    {historyUnavailable ? <p>Riwayat tidak dapat disimpan di browser ini.</p> : <Link href="/riwayat-pengajuan">Lihat History Pengajuan →</Link>}
                  </div>
                </div>
              ) : (
                <form className="interest-form" onSubmit={submit}>
                  {publicUser && <p className="interest-account-note">Nama, email, dan WhatsApp menggunakan data akun Anda dan tidak dapat diubah di formulir ini.</p>}
                  <label>
                    Nama lengkap
                    <input
                      name="name"
                      key={`name-${publicUser?.id || 0}`}
                      defaultValue={publicUser?.name || ""}
                      readOnly={!!publicUser}
                      required
                      minLength={2}
                      maxLength={80}
                      placeholder="Nama Anda"
                    />
                  </label>
                  <label>
                    Email
                    <input
                      name="email"
                      key={`email-${publicUser?.id || 0}`}
                      defaultValue={publicUser?.email || ""}
                      readOnly={!!publicUser}
                      type="email"
                      required
                      maxLength={150}
                      placeholder="nama@email.com"
                    />
                  </label>
                  <label>
                    Nomor WhatsApp
                    <input
                      name="phone"
                      key={`phone-${publicUser?.id || 0}`}
                      defaultValue={publicUser?.phone || ""}
                      readOnly={!!publicUser}
                      type="tel"
                      pattern="(\+62|0)[0-9]{8,13}"
                      required
                      placeholder="08xxxxxxxxxx"
                    />
                  </label>
                  <label>
                    Pesan
                    <textarea
                      name="message"
                      maxLength={1000}
                      placeholder="Saya ingin mengetahui informasi lebih lanjut mengenai aset ini."
                    />
                  </label>
                  <label className="consent">
                    <input type="checkbox" name="consent" required />
                    Saya menyetujui penyimpanan data kontak untuk menanggapi
                    permintaan informasi ini.
                  </label>
                  {formError && (
                    <p role="alert" className="form-error">
                      {formError}
                    </p>
                  )}
                  <button className="primary-button" disabled={sending}>
                    {sending ? "Menyimpan…" : "Kirim Minat"}
                    <ArrowRight size={17} />
                  </button>
                </form>
              )}
            </AssetDetail>
          ) : (
            <>
              {view === "home" && <HeroSlider />}
              {view !== "home" && (
                <section className={`public-page-intro${view === "catalog" || view === "schedule" ? " public-page-intro-compact" : ""}`}>
                  <div className="container">
                    <div className="public-breadcrumb">
                      <Link href="/">Beranda</Link>
                      <span>/</span>
                      <span>
                        {view === "catalog"
                          ? "Katalog Aset"
                          : view === "schedule"
                            ? "Jadwal Lelang"
                            : "Favorit"}
                      </span>
                    </div>
                    <span className="overline">LELANG BKK JATENG</span>
                    <h1>
                      {view === "catalog"
                        ? "Katalog Aset"
                        : view === "schedule"
                          ? "Jadwal Lelang"
                          : "Aset Favorit"}
                    </h1>
                    <p>
                      {view === "catalog"
                        ? "Jelajahi seluruh aset dan temukan pilihan yang sesuai kebutuhan Anda."
                        : view === "schedule"
                          ? "Temukan jadwal lelang, waktu pelaksanaan, dan informasi aset dalam satu tempat."
                          : "Simpan dan temukan kembali aset pilihan Anda."}
                    </p>
                  </div>
                </section>
              )}
              {view === "home" && (
                <>
                  <section className="container search-section">
                    <form
                      className="search-panel"
                      action="/katalog-aset"
                      method="get"
                      onSubmit={(e) => {
                        e.preventDefault();
                        router.push(
                          catalogHref({ q: query, city, maxPrice: price }),
                        );
                      }}
                    >
                      <div className="search-title">
                        <span>Temukan aset yang tepat untuk Anda</span>
                        <small>Mulai langkah baik Anda di sini</small>
                      </div>
                      <div className="search-fields">
                        <label className="keyword">
                          <span>Kata kunci</span>
                          <div>
                            <Search size={18} />
                            <input
                              name="q"
                              maxLength={100}
                              value={query}
                              onChange={(e) => setQuery(e.target.value)}
                              placeholder="Nama aset atau kode aset"
                            />
                          </div>
                        </label>
                        <Select
                          label="Lokasi"
                          name="city"
                          value={city}
                          onChange={setCity}
                          options={[
                            "Semua lokasi",
                            "Semarang",
                            "Surakarta",
                            "Karanganyar",
                            "Banyumas",
                            "Pekalongan",
                            "Kendal",
                          ].map((location) => ({
                            value: location,
                            label: location,
                          }))}
                        />
                        <Select
                          label="Rentang harga"
                          name="maxPrice"
                          value={price}
                          onChange={setPrice}
                          options={[
                            { value: "", label: "Semua harga" },
                            { value: "500000000", label: "Hingga Rp500 juta" },
                            { value: "1000000000", label: "Hingga Rp1 miliar" },
                            { value: "2000000000", label: "Hingga Rp2 miliar" },
                          ]}
                        />
                        <button className="primary-button" type="submit">
                          <Search size={18} /> Cari Aset
                        </button>
                      </div>
                    </form>
                  </section>
                  <section className="container category-section">
                    <div className="section-heading">
                      <div>
                        <span className="overline">PILIH SESUAI KEBUTUHAN</span>
                        <h2>Beragam aset, banyak peluang</h2>
                      </div>
                      <p>Temukan pilihan terbaik untuk rencana Anda.</p>
                    </div>
                    <div className="categories">
                      {categories.map((c) => (
                        <Link
                          key={c.name}
                          href={catalogHref({
                            category: c.name,
                            q: query,
                            city,
                            maxPrice: price,
                          })}
                        >
                          <span className="category-icon">
                            <CategoryIcon name={c.icon} size={27} />
                          </span>
                          <strong>{c.label}</strong>
                          <span className="category-arrow">
                            <ArrowUpRight size={15} />
                          </span>
                        </Link>
                      ))}
                    </div>
                  </section>
                </>
              )}
              {view === "home" && (
                <section className="sale-method-shortcuts" aria-labelledby="sale-method-shortcuts-title">
                  <div className="container">
                  <div className="sale-method-shortcuts-heading">
                    <span className="overline">JELAJAHI ASET</span>
                    <h2 id="sale-method-shortcuts-title">Pilih metode penjualan</h2>
                  </div>
                  <div className="sale-method-shortcuts-grid">
                    {saleMethodCards.map(({ name, description, icon, tone }) => (
                      <Link key={name} className={`sale-method-shortcut sale-method-shortcut-${tone}`} href={catalogHref({ saleMethod: name })}>
                        <span className="sale-method-shortcut-icon" aria-hidden="true"><img src={icon} alt="" width={72} height={72} loading="lazy" decoding="async" /></span>
                        <span className="sale-method-shortcut-copy"><strong>{name}</strong><small>{description}</small></span>
                        <span className="sale-method-shortcut-arrow"><ArrowUpRight size={18} /></span>
                      </Link>
                    ))}
                  </div>
                  </div>
                </section>
              )}
              <section
                className={
                  "catalog-section" +
                  (view === "catalog" ? " catalog-sidebar-section" : "")
                }
                id="katalog"
              >
                <div
                  className={
                    "container" +
                    (view === "catalog" ? " catalog-with-sidebar" : "")
                  }
                >
                  {view === "catalog" && (
                    <CatalogSidebar
                      initialFilters={{
                        q: term,
                        category,
                        city,
                        province,
                        district,
                        maxPrice: price,
                        minPrice,
                        saleMethod,
                        tag,
                        dateFrom,
                        dateTo,
                      }}
                      onApply={(filters) => {
                        router.push(catalogHref(filters));
                      }}
                    />
                  )}
                  <div className="catalog-results">
                    <div className="section-heading">
                      <div>
                        <span className="overline">
                          {view === "favorites"
                            ? "TERSIMPAN UNTUK ANDA"
                            : view === "schedule"
                              ? "CATAT TANGGALNYA"
                              : "PILIHAN UNTUK ANDA"}
                        </span>
                        <h2>
                          {view === "favorites"
                            ? "Aset favorit Anda"
                            : view === "schedule"
                              ? "Daftar jadwal lelang"
                              : view === "catalog"
                                ? "Seluruh aset lelang"
                                : "Aset rekomendasi"}
                        </h2>
                        <p>
                          {view === "favorites"
                            ? "Kembali ke aset yang menarik perhatian Anda."
                            : view === "schedule"
                              ? "Jadwal contoh. Konfirmasi kembali sebelum mengikuti lelang."
                              : view === "catalog"
                                ? "Gunakan filter untuk menemukan aset yang Anda cari."
                                : "Pilihan aset unggulan yang direkomendasikan untuk Anda."}
                        </p>
                      </div>
                      {view === "home" && (
                        <Link className="text-button" href="/katalog-aset">
                          Lihat semua aset <ArrowRight size={17} />
                        </Link>
                      )}
                    </div>
                    {view !== "home" && (
                      <div className="filter-row">
                        <div className="filter-tabs">
                          {view === "schedule" &&
                            [
                              ["upcoming", "Mendatang"],
                              ["past", "Berlalu"],
                              ["all", "Semua jadwal"],
                            ].map(([value, label]) => (
                              <button
                                key={value}
                                className={period === value ? "active" : ""}
                                onClick={() =>
                                  changeFilter(() => setPeriod(value))
                                }
                              >
                                {label}
                              </button>
                            ))}
                          {!(
                            view === "schedule" && scheduleView === "calendar"
                          ) && (
                            <span aria-live="polite">
                              {loading || (view === "favorites" && !favoritesReady)
                                ? <Skeleton className="ghost-counter"/>
                                : (view === "favorites"
                                    ? visible.length
                                    : total) + " aset tersedia"}
                            </span>
                          )}
                        </div>
                        {view === "catalog" && (
                          <div className="sort">
                            <SlidersHorizontal size={15} />
                            <Select label="Urutkan aset" name="sort" value={sort}
                              onChange={(value) => changeFilter(() => setSort(value))}
                              options={[
                                { value: "recommended", label: "Paling relevan" },
                                { value: "lowest", label: "Harga terendah" },
                                { value: "highest", label: "Harga tertinggi" },
                                { value: "soonest", label: "Jadwal terdekat" },
                              ]} />
                          </div>
                        )}
                        {view === "schedule" && (
                          <button
                            className="text-button"
                            onClick={() => {
                              setCategory("Semua");
                              setCity("Semua lokasi");
                              setPrice("");
                              setQuery("");
                              setTerm("");
                              setPage(1);
                            }}
                          >
                            Reset filter
                          </button>
                        )}
                      </div>
                    )}
                    {view === "schedule" && (
                      <div
                        className="schedule-view-switch"
                        role="group"
                        aria-label="Tampilan jadwal"
                      >
                        <button
                          className={scheduleView === "list" ? "active" : ""}
                          aria-pressed={scheduleView === "list"}
                          onClick={() => setScheduleView("list")}
                        >
                          Daftar
                        </button>
                        <button
                          className={
                            scheduleView === "calendar" ? "active" : ""
                          }
                          aria-pressed={scheduleView === "calendar"}
                          onClick={() => setScheduleView("calendar")}
                        >
                          <CalendarDays size={16} /> Kalender
                        </button>
                      </div>
                    )}
                    {view === "schedule" && scheduleView === "calendar" ? (
                      <ScheduleCalendar period={period} />
                    ) : error && !(view === "catalog" && assets.length > 0) ? (
                      <div className="empty">
                        <h3>Katalog belum tersedia</h3>
                        <p>{error}</p>
                        <button
                          className="primary-button"
                          onClick={() => setRetry((value) => value + 1)}
                        >
                          Coba lagi
                        </button>
                      </div>
                    ) : (loading || (view === "favorites" && !favoritesReady)) &&
                      !(view === "catalog" && assets.length > 0) ? (
                      view === "schedule" ? <ListSkeleton/> : <AssetGridSkeleton count={view === "catalog" ? 6 : 4}/>
                    ) : visible.length === 0 ? (
                      <div className="empty">
                        <Search size={35} />
                        <h3>
                          {view === "favorites"
                            ? "Belum ada aset favorit"
                            : view === "home"
                              ? "Belum ada aset rekomendasi"
                              : view === "schedule"
                                ? "Belum ada jadwal yang sesuai"
                                : "Belum ada aset yang sesuai"}
                        </h3>
                        <p>
                          {view === "favorites"
                            ? "Tekan ikon hati pada aset untuk menyimpannya."
                            : view === "home"
                              ? "Jelajahi katalog untuk melihat seluruh aset yang tersedia."
                              : "Coba kata kunci, lokasi, atau rentang harga lainnya."}
                        </p>
                      </div>
                    ) : view === "schedule" ? (
                      <ScheduleList
                        assets={visible}
                        favorites={favorites}
                        onOpen={open}
                        onFavorite={favorite}
                      />
                    ) : (
                      <div className="asset-grid">
                        {visible.map((a) => (
                          <article className="asset-card" key={a.id}>
                            <div className="card-photo">
                              <button
                                className="photo-link"
                                onClick={() => open(a)}
                                aria-label={`Lihat ${a.title}`}
                              >
                                <img
                                  src={a.image}
                                  alt={`Ilustrasi ${a.category.toLowerCase()}`}
                                  loading="lazy"
                                />
                              </button>
                              <span
                                className={
                                  "asset-badge " +
                                  (a.oldPrice ? "discount" : "available")
                                }
                              >
                                {a.oldPrice ? "Turun Harga" : "Pilihan Aset"}
                              </span>
                              <button
                                aria-label={
                                  favorites.includes(a.id)
                                    ? "Hapus dari favorit"
                                    : "Simpan ke favorit"
                                }
                                aria-pressed={favorites.includes(a.id)}
                                className={
                                  "heart " +
                                  (favorites.includes(a.id) ? "saved" : "")
                                }
                                onClick={() => favorite(a.id)}
                              >
                                <Heart
                                  size={18}
                                  fill={
                                    favorites.includes(a.id)
                                      ? "currentColor"
                                      : "none"
                                  }
                                />
                              </button>
                              <span className="photo-category">
                                {a.category}
                              </span>
                            </div>
                            <div className="card-content">
                              <div className="card-location">
                                <MapPin size={13} />
                                {a.city}, Jawa Tengah
                              </div>
                              <button
                                className="card-title"
                                onClick={() => open(a)}
                              >
                                {a.title}
                              </button>
                              <div className="specs">
                                {getCategorySettings(a.category,masterCategories.find(c=>c.name===a.category)?.settings).fields.filter(f=>f.enabled&&f.summary).map(field=><span key={field.key}>{field.label}: {formatSpec(specValue(a,field.key),field.unit)}</span>)}
                              </div>
                              <div className="price-line">
                                <span>Harga limit</span>
                                {a.oldPrice && <del>{money(a.oldPrice)}</del>}
                              </div>
                              <div className="card-price">
                                <strong>{money(a.price)}</strong>
                                {a.oldPrice && (
                                  <b>
                                    −
                                    {Math.round(
                                      (1 - a.price / a.oldPrice) * 100,
                                    )}
                                    %
                                  </b>
                                )}
                              </div>
                              <div className="card-bottom">
                                <span>
                                  {a.saleMethod === "Lelang" && a.auctionDate ? <><CalendarDays size={14} />{date(a.auctionDate)}</> : a.saleMethod}
                                </span>
                                <button
                                  onClick={() => open(a)}
                                  aria-label={`Detail ${a.title}`}
                                >
                                  <ArrowUpRight size={18} />
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                    {view === "catalog" && loading && assets.length > 0 && <div className="ghost-more"><AssetGridSkeleton count={3}/></div>}
                    {view === "catalog" && assets.length > 0 && (
                      <div className="catalog-load-more" ref={sentinel}>
                        <p role="status" aria-live="polite">
                          {loading
                            ? "Memuat aset berikutnya..."
                            : `${assets.length} dari ${total} aset ditampilkan`}
                        </p>
                        {error ? (
                          <>
                            <p role="alert">
                              Aset berikutnya belum dapat dimuat.
                            </p>
                            <button
                              className="outline-button"
                              onClick={() => setRetry((value) => value + 1)}
                            >
                              Coba lagi
                            </button>
                          </>
                        ) : hasMore ? (
                          <button
                            className="outline-button"
                            disabled={loading}
                            onClick={loadMore}
                          >
                            {loading ? "Memuat..." : "Muat lebih banyak"}
                          </button>
                        ) : (
                          <span>Semua aset yang sesuai sudah ditampilkan.</span>
                        )}
                      </div>
                    )}
                    {view !== "catalog" &&
                      !loading &&
                      !error &&
                      view === "schedule" &&
                      scheduleView === "list" &&
                      total > pageSize && (
                        <div className="public-pagination">
                          <button
                            className="outline-button"
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                          >
                            ← Sebelumnya
                          </button>
                          <span>
                            Halaman {page} dari {Math.ceil(total / pageSize)} ·{" "}
                            {total} aset
                          </span>
                          <button
                            className="outline-button"
                            disabled={page * pageSize >= total}
                            onClick={() => setPage(page + 1)}
                          >
                            Berikutnya →
                          </button>
                        </div>
                      )}
                  </div>
                </div>
              </section>
              <section className="container guide-banner">
                <div className="guide-illustration" aria-hidden="true">
                  <Image src="/images/auction-guide-illustration.png" alt="" width={1536} height={1024} sizes="(max-width: 620px) 240px, (max-width: 800px) 160px, 300px" />
                </div>
                <div>
                  <span className="overline">
                    LANGKAH MUDAH, PELUANG LEBIH LUAS
                  </span>
                  <h2>Baru pertama kali ikut lelang?</h2>
                  <p>
                    Kenali alurnya dan siapkan diri untuk menemukan aset pilihan
                    Anda.
                  </p>
                </div>
                <button
                  className="outline-button"
                  onClick={() => router.push("/panduan-lelang")}
                >
                  Pelajari Panduan <ArrowRight size={17} />
                </button>
              </section>
              <section className="container benefits">
                {[
                  {
                    icon: ShieldCheck,
                    title: "Informasi transparan",
                    text: "Detail aset dan harga limit dalam satu tempat.",
                  },
                  {
                    icon: BadgeCheck,
                    title: "Pilihan aset beragam",
                    text: "Dari hunian hingga aset untuk usaha Anda.",
                  },
                  {
                    icon: Headphones,
                    title: "Pendampingan informasi",
                    text: "Sampaikan minat dan pertanyaan dengan mudah.",
                  },
                ].map((b) => (
                  <div key={b.title}>
                    <b.icon size={29} strokeWidth={1.4} />
                    <div>
                      <h3>{b.title}</h3>
                      <p>{b.text}</p>
                    </div>
                  </div>
                ))}
              </section>
            </>
          ))}
      </main>
      <PublicFooter />
      {info && (
        <div className="modal-backdrop" onClick={() => setInfo("")}>
          <section
            className="info-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="info-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close"
              autoFocus
              aria-label="Tutup informasi"
              onClick={() => setInfo("")}
            >
              <X />
            </button>
            <span className="overline">LELANG BKK JATENG</span>
            <h2 id="info-title">
              {info === "privacy"
                ? "Kebijakan privasi demo"
                : info === "terms"
                  ? "Syarat & ketentuan demo"
                  : "Pusat bantuan"}
            </h2>
            {info === "help" ? (
              <>
                <p>Pilih pertanyaan untuk melihat jawaban.</p>
                {[
                  [
                    "Bagaimana menanyakan detail aset?",
                    "Buka detail aset, lalu isi formulir minat dengan kontak dan pertanyaan Anda. Pada versi demo, permintaan disimpan tanpa pengiriman notifikasi.",
                  ],
                  [
                    "Apakah saya bisa mengajukan penawaran di sini?",
                    "Belum. Portal ini adalah katalog dan sarana pengajuan minat. Lelang dilakukan melalui kanal resmi yang ditetapkan penyelenggara.",
                  ],
                  [
                    "Bagaimana menyimpan aset favorit?",
                    "Klik ikon hati pada kartu aset. Favorit disimpan pada browser ini tanpa perlu akun.",
                  ],
                  [
                    "Apakah foto dan harga sudah resmi?",
                    "Seluruh data saat ini adalah contoh. Foto ilustrasi tidak mewakili kondisi aset sebenarnya.",
                  ],
                ].map(([q, a]) => (
                  <details key={q}>
                    <summary>
                      {q}
                      <ChevronDown size={16} />
                    </summary>
                    <p>{a}</p>
                  </details>
                ))}
              </>
            ) : info === "privacy" ? (
              <>
                <p>
                  Formulir minat menyimpan nama, email, nomor telepon, pesan,
                  aset terkait, persetujuan, dan waktu pengiriman di database
                  aplikasi.
                </p>
                <p>
                  Favorit dan riwayat pengajuan tanpa data kontak disimpan secara lokal di browser. Tidak ada pembayaran
                  ataupun pengiriman notifikasi pada prototipe ini.
                </p>
                <p>
                  Gunakan data fiktif saat mencoba aplikasi. Kebijakan
                  operasional, masa retensi, dan kontak pengelola perlu
                  ditetapkan sebelum layanan digunakan publik.
                </p>
              </>
            ) : (
              <>
                <p>
                  Aplikasi ini merupakan prototipe katalog. Data, harga, foto,
                  dokumen, dan jadwal yang ditampilkan merupakan contoh dan
                  bukan pengumuman lelang resmi.
                </p>
                <p>
                  Mengirim formulir minat tidak membuat perjanjian, penawaran,
                  atau hak atas aset. Syarat resmi mengikuti penyelenggara
                  lelang setelah diverifikasi dan dipublikasikan oleh pengelola.
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock3,
  MapPin,
  ArrowUpRight,
} from "lucide-react";
import { getCatalog } from "../services/catalog-service";
import { normalizeHolidays, type Holiday } from "../services/holidays";
import type { CatalogAsset } from "../types";

const dayKey = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
const key = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
export function ScheduleCalendar({ period }: { period: string }) {
  const [month, setMonth] = useState(() => {
    const [year, month] = dayKey(new Date()).split("-").map(Number);
    return { year, month: month - 1 };
  });
  const [selectedDate, setSelectedDate] = useState(() => dayKey(new Date()));
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidayStatus, setHolidayStatus] = useState("loading");
  const [holidayRetry, setHolidayRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setHolidays([]);
    setHolidayStatus("loading");
    const timeout = setTimeout(() => controller.abort(), 12000);
    let active = true;
    fetch(`https://api-harilibur.pages.dev/api?year=${month.year}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Holiday API unavailable");
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        const result = normalizeHolidays(data, month.year);
        setHolidays(result);
        setHolidayStatus(result.length ? "ready" : "empty");
      })
      .catch(() => {
        if (active) setHolidayStatus("error");
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [month.year, holidayRetry]);
  const [assets, setAssets] = useState<CatalogAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const today = dayKey(new Date());
  const days = new Date(Date.UTC(month.year, month.month + 1, 0)).getUTCDate();
  const offset =
    (new Date(Date.UTC(month.year, month.month, 1)).getUTCDay() + 6) % 7;
  const title = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(month.year, month.month, 1)));
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setAssets([]);
    async function load() {
      const result: CatalogAsset[] = [];
      try {
        for (let page = 1; ; page++) {
          const response = await getCatalog(
            new URLSearchParams({
              period,
              sort: "soonest",
              dateFrom: key(month.year, month.month, 1),
              dateTo: key(month.year, month.month, days),
              page: String(page),
              pageSize: "200",
            }),
            controller.signal,
          );
          result.push(...response.data);
          if (!response.data.length || result.length >= response.total) break;
        }
        if (!controller.signal.aborted) setAssets(result);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [month.year, month.month, days, period, retry]);
  function move(delta: number) {
    const next = new Date(Date.UTC(month.year, month.month + delta, 1));
    setMonth({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
    setSelectedDate(key(next.getUTCFullYear(), next.getUTCMonth(), 1));
  }
  const groups = new Map<string, CatalogAsset[]>();
  for (const asset of assets) {
    const date = dayKey(new Date(asset.auctionDate));
    groups.set(date, [...(groups.get(date) || []), asset]);
  }
  const selectedAssets = groups.get(selectedDate) || [];
  const selectedTitle = new Date(
    `${selectedDate}T00:00:00+07:00`,
  ).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
  const holidayNames = (date: string) =>
    holidays
      .filter((item) => item.date === date)
      .map((item) => item.name)
      .join(" ? ");
  return (
    <div className="schedule-calendar-layout">
      <section className="auction-calendar" aria-label="Kalender jadwal lelang">
        <div className="auction-calendar-toolbar">
          <div>
            <span className="overline">JADWAL DALAM WIB</span>
            <h3 aria-live="polite">{title}</h3>
          </div>
          <div className="auction-month-controls">
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => {
                const [year, month] = today.split("-").map(Number);
                setMonth({ year, month: month - 1 });
                setSelectedDate(today);
              }}
            >
              Bulan ini
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Bulan berikutnya"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <p className="calendar-status" role="status">
          {loading
            ? "Memuat jadwal..."
            : error
              ? "Jadwal belum dapat dimuat."
              : `${assets.length} aset sesuai filter bulan ini. Klik tanggal untuk melihat aset.`}
        </p>
        <div className="auction-calendar-grid" aria-busy={loading}>
          {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(
            (name, index) => (
              <div
                className={`calendar-weekday${index === 6 ? " calendar-red" : ""}`}
                key={name}
              >
                {name}
              </div>
            ),
          )}
          {Array.from(
            { length: Math.ceil((offset + days) / 7) * 7 },
            (_, index) => {
              const day = index - offset + 1;
              if (day < 1 || day > days)
                return (
                  <div
                    className="calendar-day calendar-outside"
                    key={`blank-${index}`}
                    aria-hidden="true"
                  />
                );
              const date = key(month.year, month.month, day);
              const names = holidayNames(date);
              const count =
                loading || error ? 0 : (groups.get(date) || []).length;
              const red = index % 7 === 6 || Boolean(names);
              return (
                <button
                  type="button"
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`calendar-day${red ? " calendar-red" : ""}${date === today ? " calendar-today" : ""}${date === selectedDate ? " calendar-selected" : ""}`}
                  aria-pressed={date === selectedDate}
                  aria-current={date === today ? "date" : undefined}
                  aria-label={`${day} ${title}${names ? `, ${names}` : ""}, ${count} aset lelang`}
                  title={names || undefined}
                >
                  <time dateTime={date}>{day}</time>
                  {count > 0 && (
                    <span className="calendar-auction-marker">
                      <i aria-hidden="true" />
                      <span>
                        {count}
                        <span className="marker-label"> lelang</span>
                      </span>
                    </span>
                  )}
                </button>
              );
            },
          )}
        </div>
        <div className="calendar-legend">
          <span>
            <i className="legend-auction" /> Ada lelang
          </span>
          <span>
            <i className="legend-holiday" /> Minggu / hari libur
          </span>
          <span>
            <i className="legend-today" /> Hari ini
          </span>
        </div>
        <div className="calendar-holidays">
          <p className="calendar-help" role="status">
            {holidayStatus === "loading"
              ? "Memuat hari libur Indonesia..."
              : holidayStatus === "error"
                ? "Data hari libur belum dapat dimuat. Penanda lelang tetap tersedia."
                : holidayStatus === "empty"
                  ? `Data hari libur tahun ${month.year} belum tersedia.`
                  : "Hari libur nasional bulan ini:"}
          </p>
          {holidayStatus === "error" && (
            <button
              type="button"
              className="text-button"
              onClick={() => setHolidayRetry((value) => value + 1)}
            >
              Muat ulang hari libur
            </button>
          )}
          {holidayStatus === "ready" && (
            <ul>
              {holidays
                .filter((item) =>
                  item.date.startsWith(
                    key(month.year, month.month, 1).slice(0, 7),
                  ),
                )
                .map((item) => (
                  <li key={item.date + item.name}>
                    <strong>{Number(item.date.slice(-2))}</strong> {item.name}
                  </li>
                ))}
            </ul>
          )}
          {holidayStatus === "ready" &&
            !holidays.some((item) =>
              item.date.startsWith(key(month.year, month.month, 1).slice(0, 7)),
            ) && (
              <p className="calendar-help">
                Tidak ada hari libur nasional pada bulan ini.
              </p>
            )}
        </div>
      </section>
      <section
        className="calendar-assets-card"
        aria-label="Aset pada tanggal terpilih"
      >
        <header>
          <span className="overline">AGENDA LELANG</span>
          <h3>{selectedTitle}</h3>
          <p aria-live="polite">
            {loading
              ? "Memuat aset..."
              : `${selectedAssets.length} aset pada tanggal ini`}
          </p>
          {holidayNames(selectedDate) && (
            <div className="selected-holiday">{holidayNames(selectedDate)}</div>
          )}
        </header>
        {error ? (
          <div className="calendar-agenda-empty">
            <p>Jadwal belum dapat dimuat.</p>
            <button
              type="button"
              className="outline-button"
              onClick={() => setRetry((value) => value + 1)}
            >
              Coba lagi
            </button>
          </div>
        ) : loading ? (
          <p className="calendar-agenda-empty" role="status">
            Memuat daftar aset...
          </p>
        ) : selectedAssets.length ? (
          <div className="calendar-agenda-list">
            {selectedAssets.map((asset) => (
              <Link
                className="calendar-asset"
                key={asset.id}
                href={`/katalog-aset/${encodeURIComponent(asset.slug)}`}
              >
                <div className="calendar-asset-time">
                  <Clock3 size={18} />
                  <strong>
                    {new Date(asset.auctionDate).toLocaleTimeString("id-ID", {
                      timeZone: "Asia/Jakarta",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </strong>
                  <small>WIB</small>
                </div>
                <img src={asset.image} alt={asset.title} loading="lazy" />
                <div className="calendar-asset-info">
                  <span>
                    {asset.category} &middot; {asset.code}
                  </span>
                  <h4>{asset.title}</h4>
                  <p>
                    <MapPin size={14} />
                    {asset.city}, Jawa Tengah
                  </p>
                  <small>
                    {new Date(asset.auctionDate).getTime() < Date.now()
                      ? "Jadwal berlalu"
                      : "Jadwal mendatang"}
                  </small>
                  <b>
                    Lihat detail <ArrowUpRight size={14} />
                  </b>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="calendar-agenda-empty">
            <CalendarDays size={36} />
            <h4>Belum ada jadwal lelang</h4>
            <p>
              Tidak ada aset sesuai filter pada tanggal ini. Pilih tanggal
              dengan penanda lelang atau ubah filter jadwal.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}


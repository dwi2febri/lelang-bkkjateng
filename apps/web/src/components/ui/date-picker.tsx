"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

const months = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const weekdays = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const parse = (value: string) => new Date(value + "T12:00:00Z");
const iso = (date: Date) => date.toISOString().slice(0, 10);
function todayWib() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type)!.value)
    .join("-");
}
function shiftDay(value: string, amount: number) {
  const date = parse(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return iso(date);
}
function shiftMonth(value: string, amount: number) {
  const date = parse(value);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + amount);
  const last = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return iso(date);
}

export function DatePicker({
  label,
  name,
  value,
  onChange,
  min = "1000-01-01",
  max = "9999-12-31",
  emptyHint = "Tentukan tanggal untuk menyaring jadwal",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  emptyHint?: string;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null),
    panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false),
    [active, setActive] = useState("2026-01-01"),
    [today, setToday] = useState("");
  const [position, setPosition] = useState({ left: 12, top: 12, width: 320 });
  const clamp = (date: string) => (date < min ? min : date > max ? max : date);
  const current = parse(active),
    year = current.getUTCFullYear(),
    month = current.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1, 12));
  const start = new Date(first);
  start.setUTCDate(1 - ((first.getUTCDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) =>
    shiftDay(iso(start), index),
  );
  function close(focus = false) {
    setOpen(false);
    if (focus) trigger.current?.focus();
  }
  function expand() {
    const now = todayWib();
    setToday(now);
    setActive(clamp(value || now));
    setOpen(true);
  }
  function choose(date: string) {
    onChange(date);
    close(true);
  }

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(320, window.innerWidth - 24);
      const height = panel.current?.offsetHeight || 365;
      setPosition({
        width,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        top: Math.max(
          12,
          Math.min(
            rect.bottom + height + 8 <= window.innerHeight
              ? rect.bottom + 8
              : rect.top - height - 8,
            window.innerHeight - height - 12,
          ),
        ),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);
  useEffect(() => {
    if (open)
      panel.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${active}"]`)
        ?.focus({ preventScroll: true });
  }, [open, active]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (
        !panel.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    const focus = (event: FocusEvent) => {
      if (
        !panel.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", focus);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", focus);
    };
  }, [open]);

  return (
    <div className="filter-date-picker">
      <label htmlFor={id}>{label}</label>
      <input type="hidden" name={name} value={value} />
      <button
        id={id}
        ref={trigger}
        type="button"
        className={`date-picker-trigger${open ? " is-open" : ""}${value ? " has-value" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${id}-calendar` : undefined}
        aria-label={`${label}: ${value ? value.split("-").reverse().join("/") : "pilih tanggal"}`}
        onClick={() => (open ? close() : expand())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            expand();
          }
          if (event.key === "Escape") close();
        }}
      >
        <span>
          {value ? value.split("-").reverse().join("/") : "Pilih tanggal"}
        </span>
        <CalendarDays size={17} />
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            id={`${id}-calendar`}
            role="dialog"
            aria-label={`Pilih ${label.toLowerCase()}`}
            className="date-picker-panel"
            style={position}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                close(true);
              }
            }}
          >
            <div className="date-picker-caption">
              <span>
                <CalendarDays size={15} />
                {label}
              </span>
              <button
                type="button"
                aria-label="Tutup kalender"
                onClick={() => close(true)}
              >
                <X size={15} />
              </button>
            </div>
            <div className="date-picker-preview">
              <strong>
                {value
                  ? parse(value).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    })
                  : "Pilih tanggal lelang"}
              </strong>
              <span>
                {value
                  ? "Klik tanggal lain untuk mengubah pilihan"
                  : emptyHint}
              </span>
            </div>
            <div className="date-picker-month">
              <button
                type="button"
                aria-label="Bulan sebelumnya"
                disabled={active.slice(0, 7) <= min.slice(0, 7)}
                onClick={() => setActive(clamp(shiftMonth(active, -1)))}
              >
                <ChevronLeft size={18} />
              </button>
              <strong aria-live="polite">
                {months[month]} <span>{year}</span>
              </strong>
              <button
                type="button"
                aria-label="Bulan berikutnya"
                disabled={active.slice(0, 7) >= max.slice(0, 7)}
                onClick={() => setActive(clamp(shiftMonth(active, 1)))}
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <table
              className="date-picker-grid"
              role="grid"
              aria-label={`${months[month]} ${year}`}
            >
              <thead>
                <tr>
                  {weekdays.map((day) => (
                    <th key={day} scope="col">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }, (_, week) => (
                  <tr key={week}>
                    {days.slice(week * 7, week * 7 + 7).map((day) => (
                      <td key={day} aria-selected={day === value}>
                        <button
                          type="button"
                          data-date={day}
                          tabIndex={day === active ? 0 : -1}
                          disabled={day < min || day > max}
                          aria-current={day === today ? "date" : undefined}
                          aria-label={parse(day).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            timeZone: "UTC",
                          })}
                          className={`${day.slice(5, 7) !== active.slice(5, 7) ? "is-outside " : ""}${day === value ? "is-selected " : ""}${day === today ? "is-today" : ""}`}
                          onClick={() => choose(day)}
                          onKeyDown={(event) => {
                            let next: string | undefined;
                            const offset = (parse(day).getUTCDay() + 6) % 7;
                            switch (event.key) {
                              case "ArrowLeft":
                                next = shiftDay(day, -1);
                                break;
                              case "ArrowRight":
                                next = shiftDay(day, 1);
                                break;
                              case "ArrowUp":
                                next = shiftDay(day, -7);
                                break;
                              case "ArrowDown":
                                next = shiftDay(day, 7);
                                break;
                              case "Home":
                                next = shiftDay(day, -offset);
                                break;
                              case "End":
                                next = shiftDay(day, 6 - offset);
                                break;
                              case "PageUp":
                                next = shiftMonth(day, -1);
                                break;
                              case "PageDown":
                                next = shiftMonth(day, 1);
                                break;
                            }
                            if (next) {
                              event.preventDefault();
                              setActive(clamp(next));
                            }
                          }}
                        >
                          {parse(day).getUTCDate()}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="date-picker-actions">
              <button type="button" onClick={() => choose("")}>
                Hapus
              </button>
              <button
                type="button"
                disabled={today < min || today > max}
                onClick={() => choose(today)}
              >
                Hari ini
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

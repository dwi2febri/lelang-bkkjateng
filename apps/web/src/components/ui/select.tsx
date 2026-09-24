"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

type Option = { value: string; label: string };

export function Select({
  label,
  name,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  name: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const matches = options.filter((option) =>
    option.label.toLocaleLowerCase("id-ID").includes(query.trim().toLocaleLowerCase("id-ID")),
  );
  const activeIndex = Math.min(active, matches.length - 1);

  useEffect(() => {
    if (!open) return;
    searchInput.current?.focus();
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  useEffect(() => {
    if (open && activeIndex >= 0)
      document.getElementById(`${id}-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, query, id]);

  function expand(initialQuery = "") {
    const rect = trigger.current?.getBoundingClientRect();
    const menuHeight = Math.min(options.length * 44 + 74, 330);
    setAbove(!!rect && window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight);
    setQuery(initialQuery);
    setActive(initialQuery ? 0 : selectedIndex);
    setOpen(true);
  }

  function close(restoreFocus = false) {
    setOpen(false);
    setQuery("");
    if (restoreFocus) trigger.current?.focus();
  }

  function choose(index: number) {
    const option = matches[index];
    if (!option) return;
    onChange(option.value);
    close(true);
  }

  function move(key: string) {
    if (!matches.length) return;
    setActive((current) =>
      key === "Home" ? 0 : key === "End" ? matches.length - 1 :
      Math.max(0, Math.min(matches.length - 1, current + (key === "ArrowDown" ? 1 : -1))),
    );
  }

  return (
    <div className="filter-select" ref={root}>
      <label id={`${id}-label`} htmlFor={id}>{label}</label>
      <input type="hidden" name={name} value={value} />
      <button
        ref={trigger}
        id={id}
        type="button"
        disabled={disabled}
        role="combobox"
        aria-labelledby={`${id}-label`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        className={`filter-select-trigger${open ? " is-open" : ""}`}
        onClick={() => open ? close() : expand()}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.preventDefault();
            close();
          } else if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(event.key)) {
            event.preventDefault();
            if (!open) expand();
            else if (event.key === "Enter" || event.key === " ") choose(activeIndex);
            else move(event.key);
          } else if (!open && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault();
            expand(event.key);
          }
        }}
      >
        <span>{options[selectedIndex]?.label}</span>
        <ChevronDown size={17} strokeWidth={1.8} />
      </button>
      {open && (
        <div className={`filter-select-menu${above ? " opens-above" : ""}`}>
          <div className="filter-select-search">
            <Search size={16} aria-hidden="true" />
            <input
              ref={searchInput}
              type="search"
              role="combobox"
              aria-label={`Cari ${label.replace(/\s*\*$/, "")}`}
              aria-controls={`${id}-list`}
              aria-expanded={open}
              aria-autocomplete="list"
              aria-activedescendant={activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
              placeholder="Cari pilihan..."
              autoComplete="off"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setActive(0); }}
              onKeyDown={(event) => {
                if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
                  event.preventDefault();
                  move(event.key);
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  choose(activeIndex);
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  close(true);
                } else if (event.key === "Tab") {
                  close();
                }
              }}
            />
          </div>
          <div id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`} className="filter-select-options">
            {matches.length ? matches.map((option, index) => (
              <div
                key={option.value}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={option.value === value}
                className={`filter-select-option${index === activeIndex ? " is-active" : ""}${option.value === value ? " is-selected" : ""}`}
                onPointerMove={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
              >
                <span>{option.label}</span>
                {option.value === value && <Check size={16} strokeWidth={2} />}
              </div>
            )) : <p className="filter-select-empty">Pilihan tidak ditemukan.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

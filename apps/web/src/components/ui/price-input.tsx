"use client";
import { useId, useLayoutEffect, useRef } from "react";
import { formatPriceInput, priceDigits } from "@/lib/price";
export function PriceInput({
  label,
  name,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (caret.current === null || !input.current) return;
    const text = input.current.value;
    let digits = 0,
      index = 0;
    while (index < text.length && digits < caret.current) {
      if (/\d/.test(text[index])) digits++;
      index++;
    }
    input.current.setSelectionRange(index, index);
    caret.current = null;
  }, [value]);
  return (
    <label htmlFor={id}>
      <span>{label}</span>
      <div className="filter-price-input">
        <span aria-hidden="true">Rp</span>
        <input
          ref={input}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={formatPriceInput(value)}
          maxLength={22}
          placeholder={placeholder}
          onChange={(event) => {
            caret.current = priceDigits(
              event.target.value.slice(0, event.target.selectionStart ?? 0),
            ).length;
            onChange(priceDigits(event.target.value));
          }}
        />
        <input type="hidden" name={name} value={value} />
      </div>
    </label>
  );
}

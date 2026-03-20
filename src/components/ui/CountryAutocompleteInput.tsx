"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getGermanCountryData, isValidGermanCountryName } from "@/lib/countries";

type Props = {
  id: string;
  name?: string;
  value: string;
  onChange: (next: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  listClassName?: string;
  showValidityHint?: boolean;
  defaultValue?: string;
};

export default function CountryAutocompleteInput({
  id,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  className,
  listClassName,
  showValidityHint = true,
  defaultValue,
}: Props) {
  const all = getGermanCountryData().names;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const q = (value || "").trim();
  const lower = q.toLowerCase();

  const filtered = useMemo(() => {
    if (!lower) return all.slice(0, 12);
    const starts: string[] = [];
    const contains: string[] = [];
    for (const n of all) {
      const nl = n.toLowerCase();
      if (nl.startsWith(lower)) starts.push(n);
      else if (nl.includes(lower)) contains.push(n);
      if (starts.length >= 12) break;
    }
    if (starts.length >= 12) return starts.slice(0, 12);

    for (const n of contains) {
      starts.push(n);
      if (starts.length >= 12) break;
    }
    return starts;
  }, [all, lower]);

  const isValid = useMemo(() => {
    if (!showValidityHint) return true;
    if (!q) return true;
    return isValidGermanCountryName(q);
  }, [q, showValidityHint]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setOpen(false);
      setActiveIndex(-1);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const apply = (next: string) => {
    onChange(next);
    setOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        id={id}
        name={name}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => {
          setOpen(true);
          setActiveIndex(-1);
        }}
        onBlur={() => {
          if (defaultValue) {
            const trimmed = (value || "").trim();
            if (!trimmed) onChange(defaultValue);
          }
          onBlur?.();
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-invalid={showValidityHint && q.length > 0 && !isValid ? true : undefined}
      />

      {showValidityHint && !isValid ? (
        <div className="mt-1 text-xs text-red-600">Unbekanntes Land (bitte aus der Liste wählen)</div>
      ) : null}

      {open && filtered.length > 0 ? (
        <div
          id={`${id}-listbox`}
          role="listbox"
          className={
            listClassName ||
            "absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-lg"
          }
        >
          {filtered.map((n, idx) => {
            const active = idx === activeIndex;
            return (
              <button
                key={n}
                type="button"
                role="option"
                aria-selected={active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  apply(n);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                className={
                  "block w-full text-left px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-hover)]" +
                  (active ? " bg-[var(--surface-hover)]" : "")
                }
              >
                {n}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

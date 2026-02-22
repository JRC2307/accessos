"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale, ThemeMode } from "@/lib/ui/preferences";

type Labels = {
  menuLabel: string;
  language: string;
  theme: string;
  spanish: string;
  english: string;
  light: string;
  dark: string;
};

interface PreferencesPillProps {
  locale: Locale;
  theme: ThemeMode;
  labels: Labels;
  onLocaleChange: (next: Locale) => void;
  onThemeChange: (next: ThemeMode) => void;
}

export function PreferencesPill({
  locale,
  theme,
  labels,
  onLocaleChange,
  onThemeChange,
}: PreferencesPillProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const pillClass =
    "inline-flex items-center gap-3 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]";
  const buttonClass =
    "rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold";
  const subtleButtonClass =
    "rounded-full border border-transparent bg-transparent px-3 py-1 text-xs font-semibold text-slate-400 transition hover:text-[var(--foreground)]";

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        className={pillClass}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="text-[10px] text-slate-400">{labels.menuLabel}</span>
        <span className="rounded-full border border-[var(--line)] px-2 py-1 text-[10px]">
          {locale.toUpperCase()}
        </span>
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--line)]">
          {theme === "dark" ? (
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
              <path d="M12 3a9 9 0 0 0 9 9 7 7 0 1 1-9-9z" strokeWidth="1.6" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="4" strokeWidth="1.6" />
              <path
                d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.5-6.5-1.4 1.4M7.9 16.1l-1.4 1.4m0-11.5 1.4 1.4m8.2 8.2 1.4 1.4"
                strokeWidth="1.6"
              />
            </svg>
          )}
        </span>
      </button>
      {open ? (
        <div
          ref={menuRef}
          className="absolute right-0 mt-3 w-56 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[0_18px_45px_-35px_rgba(0,0,0,0.7)]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {labels.language}
            </span>
            <div className="flex gap-2">
              <button
                className={locale === "es" ? buttonClass : subtleButtonClass}
                type="button"
                onClick={() => onLocaleChange("es")}
              >
                {labels.spanish}
              </button>
              <button
                className={locale === "en" ? buttonClass : subtleButtonClass}
                type="button"
                onClick={() => onLocaleChange("en")}
              >
                {labels.english}
              </button>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {labels.theme}
            </span>
            <div className="flex gap-2">
              <button
                className={theme === "dark" ? buttonClass : subtleButtonClass}
                type="button"
                onClick={() => onThemeChange("dark")}
              >
                {labels.dark}
              </button>
              <button
                className={theme === "light" ? buttonClass : subtleButtonClass}
                type="button"
                onClick={() => onThemeChange("light")}
              >
                {labels.light}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { listEvents, type EventRecord } from "@/lib/supabase/events";
import { usePreferences } from "@/lib/ui/preferences";
import { PreferencesPill } from "@/components/PreferencesPill";

const copy = {
  es: {
    title: "Eventos",
    subtitle: "Eventos proximos. Selecciona uno para entrar.",
    create: "Crear evento",
    none: "No hay eventos proximos.",
    loading: "Cargando eventos...",
    menuLabel: "Preferencias",
    language: "Idioma",
    theme: "Tema",
    spanish: "ES",
    english: "EN",
    light: "Claro",
    dark: "Oscuro",
    logout: "Cerrar sesion",
  },
  en: {
    title: "Events",
    subtitle: "Upcoming events. Select one to enter.",
    create: "Create event",
    none: "No upcoming events.",
    loading: "Loading events...",
    menuLabel: "Preferences",
    language: "Language",
    theme: "Theme",
    spanish: "ES",
    english: "EN",
    light: "Light",
    dark: "Dark",
    logout: "Sign out",
  },
};

function formatDateTime(value: string, locale: "es" | "en") {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString(locale === "es" ? "es-MX" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function EventsPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const { locale, setLocale, theme, setTheme } = usePreferences();
  const t = copy[locale];

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    if (!supabase) {
      return;
    }

    setBusy(true);
    const { data, error: fetchError } = await listEvents(supabase);
    if (fetchError) {
      setError(fetchError);
      setBusy(false);
      return;
    }

    const now = new Date();
    const upcoming = data
      .filter((event) => new Date(event.starts_at) > now)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

    setEvents(upcoming);
    setError(null);
    setBusy(false);
  }, [supabase]);

  useEffect(() => {
    async function ensureSession() {
      if (!supabase) {
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.replace("/login");
        return;
      }
      await loadEvents();
    }

    void ensureSession();
  }, [loadEvents, router, supabase]);

  async function handleLogout() {
    if (!supabase) {
      return;
    }
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--accent-contrast)]">
            AccessOS
          </p>
          <h1 className="mt-4 text-4xl font-semibold">{t.title}</h1>
          <p className="mt-3 text-sm text-slate-400">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold"
            type="button"
            onClick={handleLogout}
          >
            {t.logout}
          </button>
          <PreferencesPill
            locale={locale}
            theme={theme}
            onLocaleChange={setLocale}
            onThemeChange={setTheme}
            labels={t}
          />
        </div>
      </header>

      <div className="flex items-center justify-between">
        <Link
          className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold"
          href="/events/new"
        >
          {t.create}
        </Link>
      </div>

      {busy ? <p className="text-sm text-slate-400">{t.loading}</p> : null}
      {error ? <p className="text-sm text-[var(--alert)]">{error}</p> : null}
      {!busy && events.length === 0 ? <p className="text-sm">{t.none}</p> : null}

      <div className="grid gap-3">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 transition hover:border-[var(--accent)]"
          >
            <p className="text-sm font-semibold">{event.name}</p>
            <p className="mt-1 text-xs text-slate-500">
              {formatDateTime(event.starts_at, locale)} - {formatDateTime(event.ends_at, locale)}
            </p>
            {event.venue_name ? (
              <p className="mt-1 text-xs text-slate-500">{event.venue_name}</p>
            ) : null}
          </Link>
        ))}
      </div>
    </main>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { createEvent } from "@/lib/supabase/events";
import { listUserOrgs, type OrgRecord } from "@/lib/supabase/orgs";
import { createVenue } from "@/lib/supabase/venues";
import { usePreferences } from "@/lib/ui/preferences";
import { PreferencesPill } from "@/components/PreferencesPill";

const copy = {
  es: {
    title: "Crear evento",
    subtitle: "Define nombre, venue y horario.",
    orgLabel: "Organizacion",
    orgMissing: "Crea o asigna una organizacion en Supabase primero.",
    eventName: "Nombre del evento",
    venueName: "Nombre del venue",
    startsAt: "Empieza",
    endsAt: "Termina",
    capacityOptional: "Capacidad (opcional)",
    createEvent: "Crear evento",
    creatingEvent: "Creando...",
    requiredFields: "Completa organizacion, nombre y fechas.",
    invalidDate: "Revisa fecha/hora de inicio y fin.",
    invalidCapacity: "La capacidad debe ser un numero mayor a 0.",
    invalidVenue: "Ingresa un nombre de venue.",
    back: "Regresar",
    menuLabel: "Preferencias",
    language: "Idioma",
    theme: "Tema",
    spanish: "ES",
    english: "EN",
    light: "Claro",
    dark: "Oscuro",
  },
  en: {
    title: "Create event",
    subtitle: "Define name, venue, and schedule.",
    orgLabel: "Organization",
    orgMissing: "Create or assign an organization in Supabase first.",
    eventName: "Event name",
    venueName: "Venue name",
    startsAt: "Starts at",
    endsAt: "Ends at",
    capacityOptional: "Capacity (optional)",
    createEvent: "Create event",
    creatingEvent: "Creating...",
    requiredFields: "Fill organization, event name and dates.",
    invalidDate: "Check start/end date values.",
    invalidCapacity: "Capacity must be a number greater than 0.",
    invalidVenue: "Enter a venue name.",
    back: "Back",
    menuLabel: "Preferences",
    language: "Language",
    theme: "Theme",
    spanish: "ES",
    english: "EN",
    light: "Light",
    dark: "Dark",
  },
};

export default function EventCreatePage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const { locale, setLocale, theme, setTheme } = usePreferences();
  const t = copy[locale];

  const [orgs, setOrgs] = useState<OrgRecord[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [venueName, setVenueName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [capacityInput, setCapacityInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadOrgs = useCallback(async () => {
    if (!supabase) {
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      router.replace("/login");
      return;
    }
    const { data, error } = await listUserOrgs(supabase, userData.user.id);
    if (error) {
      setMessage(error);
      return;
    }
    setOrgs(data);
    if (!selectedOrgId && data.length > 0) {
      setSelectedOrgId(data[0].id);
    }
  }, [router, selectedOrgId, supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrgs();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadOrgs]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      return;
    }

    setMessage(null);

    if (!selectedOrgId || !eventName.trim() || !startsAt || !endsAt) {
      setMessage(t.requiredFields);
      return;
    }

    if (!venueName.trim()) {
      setMessage(t.invalidVenue);
      return;
    }

    const startsDate = new Date(startsAt);
    const endsDate = new Date(endsAt);
    if (
      Number.isNaN(startsDate.getTime()) ||
      Number.isNaN(endsDate.getTime()) ||
      endsDate <= startsDate
    ) {
      setMessage(t.invalidDate);
      return;
    }

    let capacity: number | null = null;
    if (capacityInput.trim()) {
      const parsedCapacity = Number(capacityInput);
      if (!Number.isFinite(parsedCapacity) || parsedCapacity <= 0) {
        setMessage(t.invalidCapacity);
        return;
      }
      capacity = parsedCapacity;
    }

    setBusy(true);
    const venueResult = await createVenue(supabase, selectedOrgId, venueName.trim());
    if (venueResult.error || !venueResult.data) {
      setMessage(venueResult.error ?? t.invalidVenue);
      setBusy(false);
      return;
    }

    const { error } = await createEvent(supabase, {
      orgId: selectedOrgId,
      venueId: venueResult.data.id,
      name: eventName.trim(),
      startsAt,
      endsAt,
      capacity,
    });

    if (error) {
      setMessage(error);
      setBusy(false);
      return;
    }

    router.replace("/events");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--accent-contrast)]">
            AccessOS
          </p>
          <h1 className="mt-4 text-4xl font-semibold">{t.title}</h1>
          <p className="mt-3 text-sm text-slate-400">{t.subtitle}</p>
        </div>
        <PreferencesPill
          locale={locale}
          theme={theme}
          onLocaleChange={setLocale}
          onThemeChange={setTheme}
          labels={t}
        />
      </header>

      <form
        onSubmit={handleCreate}
        className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6"
      >
        <label className="text-[10px] font-semibold uppercase tracking-[0.3em]">
          {t.orgLabel}
        </label>
        {orgs.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">{t.orgMissing}</p>
        ) : (
          <select
            className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm"
            value={selectedOrgId ?? ""}
            onChange={(event) => setSelectedOrgId(event.target.value)}
          >
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        )}

        <label className="mt-5 block text-[10px] font-semibold uppercase tracking-[0.3em]">
          {t.eventName}
        </label>
        <input
          className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm"
          value={eventName}
          onChange={(event) => setEventName(event.target.value)}
          placeholder="Friday: Main Room"
          required
        />

        <label className="mt-5 block text-[10px] font-semibold uppercase tracking-[0.3em]">
          {t.venueName}
        </label>
        <input
          className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm"
          value={venueName}
          onChange={(event) => setVenueName(event.target.value)}
          placeholder="North Warehouse Club"
          required
        />

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.3em]">
              {t.startsAt}
            </label>
            <input
              className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.3em]">
              {t.endsAt}
            </label>
            <input
              className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm"
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              required
            />
          </div>
        </div>

        <label className="mt-5 block text-[10px] font-semibold uppercase tracking-[0.3em]">
          {t.capacityOptional}
        </label>
        <input
          className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm"
          type="number"
          min={1}
          value={capacityInput}
          onChange={(event) => setCapacityInput(event.target.value)}
        />

        <button
          className="mt-6 w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold"
          type="submit"
          disabled={busy || orgs.length === 0}
        >
          {busy ? t.creatingEvent : t.createEvent}
        </button>
        {message ? <p className="mt-3 text-sm text-[var(--alert)]">{message}</p> : null}
      </form>

      <button
        className="text-xs uppercase tracking-[0.2em] text-slate-400"
        type="button"
        onClick={() => router.push("/events")}
      >
        {t.back}
      </button>
    </main>
  );
}

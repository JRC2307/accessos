"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { foundationSnapshot, type TierName } from "@/lib/foundations";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { createEvent, listEvents, type EventRecord } from "@/lib/supabase/events";

type Locale = "es" | "en";
type ThemeMode = "dark" | "light";

const LOCALE_STORAGE_KEY = "accessos-locale";
const THEME_STORAGE_KEY = "accessos-theme";
const tierHeaders: TierName[] = ["GA", "VIP", "BACKSTAGE", "ARTIST", "PRESS"];

const copy = {
  es: {
    foundationBadge: "AccessOS Fundaciones",
    venue: "Venue",
    startTime: "Hora de inicio",
    doorWindow: "Ventana de puerta",
    capacity: "Capacidad",
    zones: "Zonas",
    accessTiers: "Niveles de acceso",
    eventRoles: "Roles activos del evento",
    allocations: "Asignaciones por stakeholder",
    quotaEnabled: "control de cupos activo",
    group: "Grupo",
    role: "Rol",
    cap: "cupo",
    language: "Idioma",
    theme: "Tema",
    spanish: "Espanol",
    english: "English",
    light: "Claro",
    dark: "Oscuro",
    nextStep: "Siguiente paso: autenticacion + CRUD de eventos",
    supabaseReady: "Supabase configurado",
    supabaseMissing: "Supabase no configurado",
    supabaseHint:
      "Agrega NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY para activar autenticacion y datos reales.",
    authTitle: "Autenticacion",
    email: "Email",
    sendOtp: "Enviar OTP",
    sendingOtp: "Enviando...",
    signOut: "Cerrar sesion",
    signedInAs: "Sesion activa",
    noSession: "Sin sesion",
    otpSent: "OTP enviado. Revisa tu email.",
    eventsCrud: "Alta de evento",
    orgId: "Organization ID",
    eventName: "Nombre del evento",
    startsAt: "Empieza",
    endsAt: "Termina",
    capacityOptional: "Capacidad (opcional)",
    createEvent: "Crear evento",
    creatingEvent: "Creando...",
    eventCreated: "Evento creado.",
    eventList: "Eventos visibles",
    loadingEvents: "Cargando eventos...",
    noEvents: "Sin eventos visibles todavia.",
    rlsNote:
      "Nota: con RLS activo solo veras eventos del org donde seas miembro y tengas permisos.",
    refresh: "Refrescar",
    invalidDate: "Revisa fecha/hora de inicio y fin.",
    requiredFields: "Completa Organization ID, nombre y fechas.",
    invalidCapacity: "La capacidad debe ser un numero mayor a 0.",
  },
  en: {
    foundationBadge: "AccessOS Foundations",
    venue: "Venue",
    startTime: "Start Time",
    doorWindow: "Door Window",
    capacity: "Capacity",
    zones: "Zones",
    accessTiers: "Access Tiers",
    eventRoles: "Event Roles Active",
    allocations: "Stakeholder Allocations",
    quotaEnabled: "quota enforcement enabled",
    group: "Group",
    role: "Role",
    cap: "cap",
    language: "Language",
    theme: "Theme",
    spanish: "Espanol",
    english: "English",
    light: "Light",
    dark: "Dark",
    nextStep: "Next step: auth + event CRUD",
    supabaseReady: "Supabase configured",
    supabaseMissing: "Supabase not configured",
    supabaseHint:
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable auth and live data.",
    authTitle: "Authentication",
    email: "Email",
    sendOtp: "Send OTP",
    sendingOtp: "Sending...",
    signOut: "Sign out",
    signedInAs: "Signed in",
    noSession: "No active session",
    otpSent: "OTP sent. Check your email.",
    eventsCrud: "Create Event",
    orgId: "Organization ID",
    eventName: "Event name",
    startsAt: "Starts at",
    endsAt: "Ends at",
    capacityOptional: "Capacity (optional)",
    createEvent: "Create event",
    creatingEvent: "Creating...",
    eventCreated: "Event created.",
    eventList: "Visible events",
    loadingEvents: "Loading events...",
    noEvents: "No visible events yet.",
    rlsNote:
      "Note: with RLS enabled, you only see events in orgs where you are a member with permission.",
    refresh: "Refresh",
    invalidDate: "Check start/end date values.",
    requiredFields: "Fill Organization ID, event name and dates.",
    invalidCapacity: "Capacity must be a number greater than 0.",
  },
};

function formatDateTime(value: string, locale: Locale): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(locale === "es" ? "es-MX" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function Home() {
  const { setup, zones, tiers, rosterRoles, allocations } = foundationSnapshot;
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === "undefined") {
      return "es";
    }

    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return storedLocale === "es" || storedLocale === "en" ? storedLocale : "es";
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === "dark" || storedTheme === "light" ? storedTheme : "dark";
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [eventsBusy, setEventsBusy] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventBusy, setEventBusy] = useState(false);
  const [eventMessage, setEventMessage] = useState<string | null>(null);
  const [orgId, setOrgId] = useState("");
  const [eventName, setEventName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [capacityInput, setCapacityInput] = useState("");

  const t = copy[locale];

  const refreshSession = useCallback(async () => {
    if (!supabase) {
      setCurrentUser(null);
      return;
    }

    const { data, error } = await supabase.auth.getUser();
    if (error) {
      setCurrentUser(null);
      setAuthMessage(error.message);
      return;
    }

    setCurrentUser(data.user ?? null);
  }, [supabase]);

  const refreshEvents = useCallback(async () => {
    if (!supabase || !currentUser) {
      setEvents([]);
      setEventsError(null);
      return;
    }

    setEventsBusy(true);
    const { data, error } = await listEvents(supabase);
    setEvents(data);
    setEventsError(error);
    setEventsBusy(false);
  }, [supabase, currentUser]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const initialSync = window.setTimeout(() => {
      void refreshSession();
    }, 0);

    const { data } = supabase.auth.onAuthStateChange(() => {
      void refreshSession();
    });

    return () => {
      window.clearTimeout(initialSync);
      data.subscription.unsubscribe();
    };
  }, [supabase, refreshSession]);

  useEffect(() => {
    const initialFetch = window.setTimeout(() => {
      void refreshEvents();
    }, 0);

    return () => {
      window.clearTimeout(initialFetch);
    };
  }, [refreshEvents]);

  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      return;
    }

    setAuthBusy(true);
    setAuthMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      setAuthMessage(error.message);
    } else {
      setAuthMessage(t.otpSent);
    }
    setAuthBusy(false);
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    setAuthBusy(true);
    setAuthMessage(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthMessage(error.message);
    }
    setAuthBusy(false);
  }

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      return;
    }

    setEventMessage(null);

    if (!orgId.trim() || !eventName.trim() || !startsAt || !endsAt) {
      setEventMessage(t.requiredFields);
      return;
    }

    const startsDate = new Date(startsAt);
    const endsDate = new Date(endsAt);
    if (
      Number.isNaN(startsDate.getTime()) ||
      Number.isNaN(endsDate.getTime()) ||
      endsDate <= startsDate
    ) {
      setEventMessage(t.invalidDate);
      return;
    }

    let capacity: number | null = null;
    if (capacityInput.trim()) {
      const parsedCapacity = Number(capacityInput);
      if (!Number.isFinite(parsedCapacity) || parsedCapacity <= 0) {
        setEventMessage(t.invalidCapacity);
        return;
      }
      capacity = parsedCapacity;
    }

    setEventBusy(true);
    const { error } = await createEvent(supabase, {
      orgId: orgId.trim(),
      name: eventName.trim(),
      startsAt,
      endsAt,
      capacity,
    });

    if (error) {
      setEventMessage(error);
    } else {
      setEventMessage(t.eventCreated);
      setEventName("");
      setStartsAt("");
      setEndsAt("");
      setCapacityInput("");
      await refreshEvents();
    }
    setEventBusy(false);
  }

  const inputClass =
    "w-full rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]";
  const buttonClass =
    "rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm font-semibold transition hover:border-[var(--accent)]";
  const activeButtonClass =
    "rounded-xl border border-[var(--accent)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_14px_40px_-20px_rgba(0,0,0,0.45)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent-contrast)]">
              {t.foundationBadge}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              {setup.eventName}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={locale === "es" ? activeButtonClass : buttonClass}
              onClick={() => setLocale("es")}
            >
              {t.spanish}
            </button>
            <button
              type="button"
              className={locale === "en" ? activeButtonClass : buttonClass}
              onClick={() => setLocale("en")}
            >
              {t.english}
            </button>
            <button
              type="button"
              className={theme === "dark" ? activeButtonClass : buttonClass}
              onClick={() => setTheme("dark")}
            >
              {t.dark}
            </button>
            <button
              type="button"
              className={theme === "light" ? activeButtonClass : buttonClass}
              onClick={() => setTheme("light")}
            >
              {t.light}
            </button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 font-mono text-xs uppercase tracking-wider text-slate-600">
          <span>{t.language}: {locale.toUpperCase()}</span>
          <span>{t.theme}: {theme.toUpperCase()}</span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
            <p className="font-mono text-xs uppercase tracking-wider text-slate-600">
              {t.venue}
            </p>
            <p className="mt-1 text-lg font-semibold">{setup.venueName}</p>
          </article>
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
            <p className="font-mono text-xs uppercase tracking-wider text-slate-600">
              {t.startTime}
            </p>
            <p className="mt-1 text-lg font-semibold">{setup.startsAt}</p>
          </article>
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
            <p className="font-mono text-xs uppercase tracking-wider text-slate-600">
              {t.doorWindow}
            </p>
            <p className="mt-1 text-lg font-semibold">{setup.doorWindow}</p>
          </article>
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
            <p className="font-mono text-xs uppercase tracking-wider text-slate-600">
              {t.capacity}
            </p>
            <p className="mt-1 text-lg font-semibold">{setup.capacity}</p>
          </article>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-slate-700">
            {t.zones}
          </h2>
          <ul className="mt-4 space-y-3">
            {zones.map((zone) => (
              <li
                key={zone.name}
                className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3"
              >
                <span className="font-medium">{zone.name}</span>
                <span className="font-mono text-sm text-slate-700">
                  {t.cap} {zone.capacity}
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-slate-700">
            {t.accessTiers}
          </h2>
          <ul className="mt-4 space-y-3">
            {tiers.map((tier) => (
              <li key={tier.name} className="rounded-xl border border-[var(--line)] p-4">
                <p className="text-sm font-bold tracking-wide">{tier.name}</p>
                <p className="mt-1 text-sm text-slate-700">
                  {tier.zonesAllowed.join(" / ")}
                </p>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-slate-700">
          {t.eventRoles}
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {rosterRoles.map((role) => (
            <span
              key={role}
              className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1 font-mono text-xs"
            >
              {role}
            </span>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)]">
        <header className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-slate-700">
            {t.allocations}
          </h2>
          <p className="font-mono text-xs text-[var(--alert)]">{t.quotaEnabled}</p>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-[var(--panel)] font-mono text-xs uppercase tracking-wider text-slate-700">
              <tr>
                <th className="px-4 py-3">{t.group}</th>
                <th className="px-4 py-3">{t.role}</th>
                {tierHeaders.map((tier) => (
                  <th key={tier} className="px-4 py-3">
                    {tier}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allocations.map((allocation) => (
                <tr key={allocation.groupName} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3 font-semibold">{allocation.groupName}</td>
                  <td className="px-4 py-3 font-mono text-xs">{allocation.roleType}</td>
                  {tierHeaders.map((tier) => (
                    <td key={`${allocation.groupName}-${tier}`} className="px-4 py-3">
                      {allocation.caps[tier]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-slate-700">
            {t.nextStep}
          </h2>
          <span className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1 font-mono text-xs">
            {supabase ? t.supabaseReady : t.supabaseMissing}
          </span>
        </header>

        {!supabase ? (
          <p className="mt-4 text-sm text-slate-700">{t.supabaseHint}</p>
        ) : (
          <>
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <article className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
                <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-slate-700">
                  {t.authTitle}
                </h3>
                <p className="mt-3 text-sm">
                  {currentUser ? `${t.signedInAs}: ${currentUser.email ?? currentUser.id}` : t.noSession}
                </p>
                <form className="mt-3 flex flex-col gap-3" onSubmit={handleSendOtp}>
                  <label className="text-xs font-semibold uppercase tracking-wide">{t.email}</label>
                  <input
                    className={inputClass}
                    type="email"
                    required
                    value={authEmail}
                    onChange={(event) => setAuthEmail(event.target.value)}
                    placeholder="team@accessos.com"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button className={buttonClass} type="submit" disabled={authBusy}>
                      {authBusy ? t.sendingOtp : t.sendOtp}
                    </button>
                    <button
                      className={buttonClass}
                      type="button"
                      onClick={handleSignOut}
                      disabled={authBusy || !currentUser}
                    >
                      {t.signOut}
                    </button>
                  </div>
                  {authMessage ? <p className="text-sm text-[var(--alert)]">{authMessage}</p> : null}
                </form>
              </article>

              <article className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
                <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-slate-700">
                  {t.eventsCrud}
                </h3>
                <form className="mt-3 flex flex-col gap-3" onSubmit={handleCreateEvent}>
                  <label className="text-xs font-semibold uppercase tracking-wide">{t.orgId}</label>
                  <input
                    className={inputClass}
                    type="text"
                    value={orgId}
                    onChange={(event) => setOrgId(event.target.value)}
                    placeholder="uuid"
                    required
                  />
                  <label className="text-xs font-semibold uppercase tracking-wide">{t.eventName}</label>
                  <input
                    className={inputClass}
                    type="text"
                    value={eventName}
                    onChange={(event) => setEventName(event.target.value)}
                    placeholder="Viernes / Friday: Main Room"
                    required
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide">{t.startsAt}</label>
                      <input
                        className={inputClass}
                        type="datetime-local"
                        value={startsAt}
                        onChange={(event) => setStartsAt(event.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide">{t.endsAt}</label>
                      <input
                        className={inputClass}
                        type="datetime-local"
                        value={endsAt}
                        onChange={(event) => setEndsAt(event.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <label className="text-xs font-semibold uppercase tracking-wide">
                    {t.capacityOptional}
                  </label>
                  <input
                    className={inputClass}
                    type="number"
                    value={capacityInput}
                    min={1}
                    onChange={(event) => setCapacityInput(event.target.value)}
                  />
                  <button
                    className={buttonClass}
                    type="submit"
                    disabled={eventBusy || !currentUser}
                  >
                    {eventBusy ? t.creatingEvent : t.createEvent}
                  </button>
                  {eventMessage ? <p className="text-sm text-[var(--alert)]">{eventMessage}</p> : null}
                </form>
              </article>
            </div>

            <article className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-slate-700">
                  {t.eventList}
                </h3>
                <button className={buttonClass} type="button" onClick={() => void refreshEvents()}>
                  {t.refresh}
                </button>
              </div>
              <p className="mt-3 text-sm text-slate-700">{t.rlsNote}</p>
              {eventsError ? <p className="mt-2 text-sm text-[var(--alert)]">{eventsError}</p> : null}
              {eventsBusy ? <p className="mt-3 text-sm">{t.loadingEvents}</p> : null}
              {!eventsBusy && events.length === 0 ? <p className="mt-3 text-sm">{t.noEvents}</p> : null}
              {!eventsBusy && events.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {events.map((event) => (
                    <li
                      key={event.id}
                      className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
                    >
                      <p className="font-semibold">{event.name}</p>
                      <p className="text-xs text-slate-600">
                        {formatDateTime(event.starts_at, locale)} - {formatDateTime(event.ends_at, locale)}
                      </p>
                      <p className="font-mono text-xs text-slate-600">
                        {t.capacity}: {event.capacity ?? "-"}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          </>
        )}
      </section>
    </main>
  );
}

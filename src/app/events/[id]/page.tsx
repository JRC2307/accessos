"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { getEventById, type EventDetail } from "@/lib/supabase/events";
import { createZone, deleteZone, listZones, type ZoneRecord } from "@/lib/supabase/zones";
import {
  ensureStandardAccessTiers,
  orderStandardTiers,
  STANDARD_TIER_NAMES,
  type TierRecord,
} from "@/lib/supabase/tiers";
import {
  listTierZoneMap,
  replaceTierZones,
  type TierZoneMapRecord,
} from "@/lib/supabase/tier-zone-map";
import {
  createStakeholderGroup,
  listStakeholderGroups,
  type StakeholderGroupRecord,
  type StakeholderRoleType,
} from "@/lib/supabase/stakeholders";
import {
  createAllocation,
  listAllocations,
  updateAllocation,
  type AllocationRecord,
} from "@/lib/supabase/allocations";
import {
  createGuest,
  listGuests,
  type GuestRecord,
} from "@/lib/supabase/guests";
import { ensureGuestDefaults } from "@/lib/supabase/guest-defaults";
import { markGuestEntered } from "@/lib/supabase/checkins";
import { usePreferences } from "@/lib/ui/preferences";
import { PreferencesPill } from "@/components/PreferencesPill";

type SetupStep =
  | "zones"
  | "tiers"
  | "mapping"
  | "stakeholders"
  | "allocations"
  | "guests";
type TierZoneMapByTier = Record<string, string[]>;

type Locale = "es" | "en";

const stakeholderRoleOptions: StakeholderRoleType[] = [
  "BOOKER",
  "TOUR_MANAGER",
  "PROMOTER",
  "VENUE_OPS",
  "STAGE_MANAGER",
];

const copy = {
  es: {
    title: "Evento",
    back: "Eventos",
    logout: "Cerrar sesion",
    setupTitle: "Setup del evento",
    setupIntro:
      "Configura la operacion en orden: zonas, niveles, mapeo y cupos por stakeholder.",
    stepZones: "Zonas",
    stepTiers: "Niveles",
    stepMapping: "Mapa",
    stepStakeholders: "Stakeholders",
    stepAllocations: "Asignaciones",
    stepGuests: "Invitados",
    zonesEmpty: "Aun no hay zonas.",
    tiersEmpty: "Aun no hay niveles.",
    stakeholdersEmpty: "Aun no hay stakeholders.",
    addZone: "Agregar zona",
    zoneName: "Nombre de zona",
    zoneCapacity: "Capacidad",
    delete: "Eliminar",
    mapTitle: "Mapa nivel → zona",
    mapHint: "Marca las zonas permitidas por nivel.",
    mapEmpty: "Crea zonas y niveles antes de mapear.",
    stakeholderName: "Nombre del grupo",
    stakeholderRole: "Rol",
    addStakeholder: "Agregar stakeholder",
    allocationsTitle: "Cupos por stakeholder",
    allocationsHint:
      "Define cupos por nivel. Los cambios se guardan al salir del campo.",
    allocationsEmpty: "Crea niveles y stakeholders antes de asignar cupos.",
    capUsed: "Usados",
    invalidCapacity: "La capacidad debe ser un numero mayor a 0.",
    invalidPriority: "La prioridad debe ser un numero entre 0 y 10.",
    setupSnapshot: "Resumen de setup",
    summaryZones: "Zonas",
    summaryTiers: "Niveles",
    summaryStakeholders: "Stakeholders",
    guestsTitle: "Invitados",
    guestsIntro: "Agrega invitados y marca su entrada manual.",
    guestSearch: "Buscar invitados",
    guestName: "Nombre completo",
    guestPhone: "Telefono",
    guestNotes: "Notas",
    guestPriority: "Prioridad (0-10)",
    addGuest: "Agregar invitado",
    guestsEmpty: "Aun no hay invitados.",
    guestsNoMatch: "No hay invitados con este filtro.",
    guestStatus: "Estado",
    guestAddedBy: "Agregado por",
    guestTier: "Permiso",
    guestActions: "Acciones",
    guestCheckIn: "Marcar entrada",
    guestCheckedIn: "Ingresado",
    guestDefaultsError: "No se pudieron crear los defaults de invitados.",
    guestLogWarning: "Entrada guardada sin registro.",
    unknown: "Desconocido",
    menuLabel: "Preferencias",
    language: "Idioma",
    theme: "Tema",
    spanish: "ES",
    english: "EN",
    light: "Claro",
    dark: "Oscuro",
    loading: "Cargando...",
  },
  en: {
    title: "Event",
    back: "Events",
    logout: "Sign out",
    setupTitle: "Event setup",
    setupIntro:
      "Configure the flow in order: zones, tiers, mapping, and stakeholder caps.",
    stepZones: "Zones",
    stepTiers: "Tiers",
    stepMapping: "Mapping",
    stepStakeholders: "Stakeholders",
    stepAllocations: "Allocations",
    stepGuests: "Guests",
    zonesEmpty: "No zones yet.",
    tiersEmpty: "No tiers yet.",
    stakeholdersEmpty: "No stakeholders yet.",
    addZone: "Add zone",
    zoneName: "Zone name",
    zoneCapacity: "Capacity",
    delete: "Delete",
    mapTitle: "Tier → Zone map",
    mapHint: "Select the allowed zones for each tier.",
    mapEmpty: "Create zones and tiers before mapping.",
    stakeholderName: "Group name",
    stakeholderRole: "Role",
    addStakeholder: "Add stakeholder",
    allocationsTitle: "Stakeholder caps",
    allocationsHint: "Define caps per tier. Changes save on field blur.",
    allocationsEmpty: "Create tiers and stakeholders before assigning caps.",
    capUsed: "Used",
    invalidCapacity: "Capacity must be a number greater than 0.",
    invalidPriority: "Priority must be a number between 0 and 10.",
    setupSnapshot: "Setup snapshot",
    summaryZones: "Zones",
    summaryTiers: "Tiers",
    summaryStakeholders: "Stakeholders",
    guestsTitle: "Guests",
    guestsIntro: "Add guests and mark entry manually.",
    guestSearch: "Search guests",
    guestName: "Full name",
    guestPhone: "Phone",
    guestNotes: "Notes",
    guestPriority: "Priority (0-10)",
    addGuest: "Add guest",
    guestsEmpty: "No guests yet.",
    guestsNoMatch: "No guests match this filter.",
    guestStatus: "Status",
    guestAddedBy: "Added by",
    guestTier: "Access",
    guestActions: "Actions",
    guestCheckIn: "Mark entered",
    guestCheckedIn: "Checked in",
    guestDefaultsError: "Unable to create guest defaults.",
    guestLogWarning: "Entry saved without log.",
    unknown: "Unknown",
    menuLabel: "Preferences",
    language: "Language",
    theme: "Theme",
    spanish: "ES",
    english: "EN",
    light: "Light",
    dark: "Dark",
    loading: "Loading...",
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

function buildTierZoneMap(records: TierZoneMapRecord[]): TierZoneMapByTier {
  return records.reduce<TierZoneMapByTier>((acc, record) => {
    const existing = acc[record.access_tier_id] ?? [];
    acc[record.access_tier_id] = [...existing, record.zone_id];
    return acc;
  }, {});
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { locale, setLocale, theme, setTheme } = usePreferences();
  const t = copy[locale];

  const [eventDetail, setEventDetail] = useState<EventDetail | null>(null);
  const [setupStep, setSetupStep] = useState<SetupStep>("zones");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [zones, setZones] = useState<ZoneRecord[]>([]);
  const [tiers, setTiers] = useState<TierRecord[]>([]);
  const [tierZoneMap, setTierZoneMap] = useState<TierZoneMapByTier>({});
  const [stakeholders, setStakeholders] = useState<StakeholderGroupRecord[]>([]);
  const [allocations, setAllocations] = useState<AllocationRecord[]>([]);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupBusy, setSetupBusy] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [guestWarning, setGuestWarning] = useState<string | null>(null);
  const [guestBusy, setGuestBusy] = useState(false);
  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [guestQuery, setGuestQuery] = useState("");

  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneCapacity, setNewZoneCapacity] = useState("");
  const [newStakeholderName, setNewStakeholderName] = useState("");
  const [newStakeholderRole, setNewStakeholderRole] = useState<StakeholderRoleType>("BOOKER");
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestPhone, setNewGuestPhone] = useState("");
  const [newGuestNotes, setNewGuestNotes] = useState("");
  const [newGuestPriority, setNewGuestPriority] = useState("");
  const [newGuestTierId, setNewGuestTierId] = useState("");

  const refreshSetup = useCallback(
    async (eventId: string) => {
      if (!supabase) {
        return;
      }
      setSetupBusy(true);
      setSetupError(null);

      const [zonesRes, tiersRes, mapRes, stakeholdersRes, allocationsRes] = await Promise.all([
        listZones(supabase, eventId),
        ensureStandardAccessTiers(supabase, eventId),
        listTierZoneMap(supabase, eventId),
        listStakeholderGroups(supabase, eventId),
        listAllocations(supabase, eventId),
      ]);

      setZones(zonesRes.data);
      const standardTiers = tiersRes.data.filter((tier) =>
        STANDARD_TIER_NAMES.includes(tier.name),
      );
      const orderedTiers = orderStandardTiers(standardTiers);
      setTiers(orderedTiers);
      setTierZoneMap(buildTierZoneMap(mapRes.data));
      setStakeholders(stakeholdersRes.data);
      setAllocations(allocationsRes.data);
      setSetupError(
        zonesRes.error || tiersRes.error || mapRes.error || stakeholdersRes.error || allocationsRes.error,
      );
      if (!newGuestTierId) {
        const coverTier = orderedTiers.find((tier) => tier.name === "Cover");
        if (coverTier) {
          setNewGuestTierId(coverTier.id);
        } else if (orderedTiers[0]) {
          setNewGuestTierId(orderedTiers[0].id);
        }
      }
      setSetupBusy(false);
    },
    [newGuestTierId, supabase],
  );

  const refreshGuests = useCallback(
    async (eventId: string, query?: string) => {
      if (!supabase) {
        return;
      }
      setGuestBusy(true);
      setGuestError(null);
      setGuestWarning(null);

      const guestsRes = await listGuests(supabase, eventId, query);
      setGuests(guestsRes.data);
      setGuestError(guestsRes.error);
      setGuestBusy(false);
    },
    [supabase],
  );

  useEffect(() => {
    async function load() {
      if (!supabase) {
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.replace("/login");
        return;
      }
      setCurrentUserId(userData.user.id);

      const { data, error } = await getEventById(supabase, id);
      if (error || !data) {
        setSetupError(error ?? "Not found");
        return;
      }

      setEventDetail(data);
      await refreshSetup(id);
      await refreshGuests(id);
    }

    void load();
  }, [id, refreshGuests, refreshSetup, router, supabase]);

  useEffect(() => {
    if (!id) {
      return;
    }
    const timer = setTimeout(() => {
      void refreshGuests(id, guestQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [guestQuery, id, refreshGuests]);

  async function handleLogout() {
    if (!supabase) {
      return;
    }
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function handleCreateZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !id) {
      return;
    }
    if (!newZoneName.trim()) {
      return;
    }

    let capacity: number | null = null;
    if (newZoneCapacity.trim()) {
      const parsed = Number(newZoneCapacity);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setSetupError(t.invalidCapacity);
        return;
      }
      capacity = parsed;
    }

    const { error } = await createZone(supabase, id, newZoneName.trim(), capacity);
    if (error) {
      setSetupError(error);
      return;
    }

    setNewZoneName("");
    setNewZoneCapacity("");
    await refreshSetup(id);
  }

  async function handleCreateStakeholder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !id) {
      return;
    }
    if (!newStakeholderName.trim()) {
      return;
    }

    const { error } = await createStakeholderGroup(
      supabase,
      id,
      newStakeholderName.trim(),
      newStakeholderRole,
    );
    if (error) {
      setSetupError(error);
      return;
    }

    setNewStakeholderName("");
    await refreshSetup(id);
  }

  async function handleCreateGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !id || !currentUserId) {
      return;
    }
    if (!newGuestName.trim()) {
      return;
    }
    setGuestError(null);
    setGuestWarning(null);

    let priority: number | undefined;
    if (newGuestPriority.trim()) {
      const parsed = Number(newGuestPriority);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10) {
        setGuestError(t.invalidPriority);
        return;
      }
      priority = parsed;
    }

    const defaults = await ensureGuestDefaults(supabase, id, currentUserId);
    if (defaults.error || !defaults.data) {
      setGuestError(defaults.error ?? t.guestDefaultsError);
      return;
    }

    const accessTierId = newGuestTierId || defaults.data.accessTierId;
    const { error } = await createGuest(supabase, {
      eventId: id,
      stakeholderGroupId: defaults.data.stakeholderGroupId,
      accessTierId,
      addedByUserId: currentUserId,
      fullName: newGuestName.trim(),
      phone: newGuestPhone.trim() || undefined,
      notes: newGuestNotes.trim() || undefined,
      priority,
    });

    if (error) {
      setGuestError(error);
      return;
    }

    setNewGuestName("");
    setNewGuestPhone("");
    setNewGuestNotes("");
    setNewGuestPriority("");
    await refreshGuests(id, guestQuery);
  }

  async function handleDeleteZone(zoneId: string) {
    if (!supabase) {
      return;
    }
    await deleteZone(supabase, zoneId);
    await refreshSetup(id);
  }

  async function handleToggleTierZone(tierId: string, zoneId: string) {
    if (!supabase) {
      return;
    }

    const current = new Set(tierZoneMap[tierId] ?? []);
    if (current.has(zoneId)) {
      current.delete(zoneId);
    } else {
      current.add(zoneId);
    }

    const next = Array.from(current);
    setTierZoneMap((prev) => ({ ...prev, [tierId]: next }));

    const { error } = await replaceTierZones(supabase, tierId, next);
    if (error) {
      setSetupError(error);
      return;
    }

    await refreshSetup(id);
  }

  async function handleAllocationBlur(stakeholderId: string, tierId: string, value: string) {
    if (!supabase) {
      return;
    }

    if (!value.trim()) {
      return;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setSetupError(t.invalidCapacity);
      return;
    }

    const existing = allocations.find(
      (allocation) =>
        allocation.stakeholder_group_id === stakeholderId && allocation.access_tier_id === tierId,
    );

    const result = existing
      ? await updateAllocation(supabase, existing.id, parsed)
      : await createAllocation(supabase, stakeholderId, tierId, parsed);

    if (result.error) {
      setSetupError(result.error);
      return;
    }

    await refreshSetup(id);
  }

  async function handleGuestCheckIn(guestId: string) {
    if (!supabase || !id || !currentUserId) {
      return;
    }
    setGuestError(null);
    setGuestWarning(null);

    const result = await markGuestEntered(supabase, {
      eventId: id,
      guestId,
      scannedByUserId: currentUserId,
    });

    if (result.error) {
      setGuestError(result.error);
      return;
    }

    if (result.warning) {
      setGuestWarning(t.guestLogWarning);
    }

    await refreshGuests(id, guestQuery);
  }

  const inputClass =
    "w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]";
  const buttonClass =
    "rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold transition hover:border-[var(--accent)]";
  const subtleButtonClass =
    "rounded-full border border-transparent bg-transparent px-3 py-1 text-xs font-semibold text-slate-400 transition hover:text-[var(--foreground)]";
  const activeTabClass =
    "rounded-full border border-[var(--accent)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold";
  const tabClass =
    "rounded-full border border-[var(--line)] bg-transparent px-4 py-2 text-xs font-semibold text-slate-400 transition hover:text-[var(--foreground)]";

  const summary = {
    zones: zones.length,
    tiers: tiers.length,
    stakeholders: stakeholders.length,
  };

  const renderAddedBy = (guest: GuestRecord) => {
    if (guest.added_by_display_name?.trim()) {
      return guest.added_by_display_name;
    }
    if (guest.added_by_user_id) {
      return `${guest.added_by_user_id.slice(0, 8)}…`;
    }
    return t.unknown;
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--accent-contrast)]">
            AccessOS
          </p>
          <h1 className="mt-4 text-4xl font-semibold">
            {eventDetail?.name ?? t.title}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {eventDetail
              ? `${formatDateTime(eventDetail.starts_at, locale)} - ${formatDateTime(
                  eventDetail.ends_at,
                  locale,
                )}${eventDetail.venue_name ? ` · ${eventDetail.venue_name}` : ""}`
              : t.loading}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold"
            type="button"
            onClick={() => router.push("/events")}
          >
            {t.back}
          </button>
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

      <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
              {t.setupTitle}
            </h2>
            <p className="mt-2 text-sm text-slate-500">{t.setupIntro}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            className={setupStep === "zones" ? activeTabClass : tabClass}
            type="button"
            onClick={() => setSetupStep("zones")}
          >
            {t.stepZones}
          </button>
          <button
            className={setupStep === "tiers" ? activeTabClass : tabClass}
            type="button"
            onClick={() => setSetupStep("tiers")}
          >
            {t.stepTiers}
          </button>
          <button
            className={setupStep === "mapping" ? activeTabClass : tabClass}
            type="button"
            onClick={() => setSetupStep("mapping")}
          >
            {t.stepMapping}
          </button>
          <button
            className={setupStep === "stakeholders" ? activeTabClass : tabClass}
            type="button"
            onClick={() => setSetupStep("stakeholders")}
          >
            {t.stepStakeholders}
          </button>
          <button
            className={setupStep === "allocations" ? activeTabClass : tabClass}
            type="button"
            onClick={() => setSetupStep("allocations")}
          >
            {t.stepAllocations}
          </button>
          <button
            className={setupStep === "guests" ? activeTabClass : tabClass}
            type="button"
            onClick={() => setSetupStep("guests")}
          >
            {t.stepGuests}
          </button>
        </div>

        {setupError ? <p className="mt-4 text-sm text-[var(--alert)]">{setupError}</p> : null}
        {setupBusy ? <p className="mt-4 text-sm text-slate-400">{t.loading}</p> : null}

        <div className="mt-6 space-y-6">
          {setupStep === "zones" ? (
            <div className="space-y-4">
              <form
                className="grid gap-3 md:grid-cols-[1.4fr_0.8fr_auto]"
                onSubmit={handleCreateZone}
              >
                <input
                  className={inputClass}
                  placeholder={t.zoneName}
                  value={newZoneName}
                  onChange={(event) => setNewZoneName(event.target.value)}
                  required
                />
                <input
                  className={inputClass}
                  placeholder={t.zoneCapacity}
                  type="number"
                  value={newZoneCapacity}
                  onChange={(event) => setNewZoneCapacity(event.target.value)}
                />
                <button className={buttonClass} type="submit">
                  {t.addZone}
                </button>
              </form>
              {zones.length === 0 ? <p className="text-sm">{t.zonesEmpty}</p> : null}
              <div className="grid gap-3">
                {zones.map((zone) => (
                  <div
                    key={zone.id}
                    className="flex items-center justify-between rounded-2xl border border-[var(--line)] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">{zone.name}</p>
                      <p className="text-xs text-slate-500">
                        {t.zoneCapacity}: {zone.capacity ?? "-"}
                      </p>
                    </div>
                    <button
                      className={subtleButtonClass}
                      type="button"
                      onClick={() => void handleDeleteZone(zone.id)}
                    >
                      {t.delete}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {setupStep === "tiers" ? (
            <div className="space-y-4">
              {tiers.length === 0 ? <p className="text-sm">{t.tiersEmpty}</p> : null}
              <div className="grid gap-3">
                {tiers.map((tier) => (
                  <div
                    key={tier.id}
                    className="flex items-center justify-between rounded-2xl border border-[var(--line)] px-4 py-3"
                  >
                    <p className="text-sm font-semibold">{tier.name}</p>
                    <p className="text-xs text-slate-500">{t.guestTier}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {setupStep === "mapping" ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">{t.mapTitle}</h3>
                <p className="text-xs text-slate-500">{t.mapHint}</p>
              </div>
              {zones.length === 0 || tiers.length === 0 ? (
                <p className="text-sm">{t.mapEmpty}</p>
              ) : (
                <div className="space-y-4">
                  {tiers.map((tier) => (
                    <div key={tier.id} className="rounded-2xl border border-[var(--line)] p-4">
                      <p className="text-sm font-semibold">{tier.name}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {zones.map((zone) => {
                          const checked = (tierZoneMap[tier.id] ?? []).includes(zone.id);
                          return (
                            <label
                              key={zone.id}
                              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition ${
                                checked
                                  ? "border-[var(--accent)] bg-[var(--surface)]"
                                  : "border-[var(--line)] bg-transparent"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => void handleToggleTierZone(tier.id, zone.id)}
                              />
                              {zone.name}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {setupStep === "stakeholders" ? (
            <div className="space-y-4">
              <form
                className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
                onSubmit={handleCreateStakeholder}
              >
                <input
                  className={inputClass}
                  placeholder={t.stakeholderName}
                  value={newStakeholderName}
                  onChange={(event) => setNewStakeholderName(event.target.value)}
                  required
                />
                <select
                  className={inputClass}
                  value={newStakeholderRole}
                  onChange={(event) =>
                    setNewStakeholderRole(event.target.value as StakeholderRoleType)
                  }
                >
                  {stakeholderRoleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <button className={buttonClass} type="submit">
                  {t.addStakeholder}
                </button>
              </form>
              {stakeholders.length === 0 ? <p className="text-sm">{t.stakeholdersEmpty}</p> : null}
              <div className="grid gap-3">
                {stakeholders.map((group) => (
                  <div key={group.id} className="rounded-2xl border border-[var(--line)] px-4 py-3">
                    <p className="text-sm font-semibold">{group.name}</p>
                    <p className="text-xs text-slate-500">{group.role_type}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {setupStep === "allocations" ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">{t.allocationsTitle}</h3>
                <p className="text-xs text-slate-500">{t.allocationsHint}</p>
              </div>
              {stakeholders.length === 0 || tiers.length === 0 ? (
                <p className="text-sm">{t.allocationsEmpty}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                      <tr>
                        <th className="px-3 py-2">{t.stakeholderName}</th>
                        {tiers.map((tier) => (
                          <th key={tier.id} className="px-3 py-2">
                            {tier.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stakeholders.map((group) => (
                        <tr key={group.id} className="border-t border-[var(--line)]">
                          <td className="px-3 py-3">
                            <div>
                              <p className="text-sm font-semibold">{group.name}</p>
                              <p className="text-[10px] text-slate-500">{group.role_type}</p>
                            </div>
                          </td>
                          {tiers.map((tier) => {
                            const existing = allocations.find(
                              (allocation) =>
                                allocation.stakeholder_group_id === group.id &&
                                allocation.access_tier_id === tier.id,
                            );
                            return (
                              <td key={tier.id} className="px-3 py-3">
                                <input
                                  className={inputClass}
                                  defaultValue={existing?.cap_total ?? ""}
                                  placeholder="0"
                                  type="number"
                                  min={0}
                                  onBlur={(event) =>
                                    void handleAllocationBlur(group.id, tier.id, event.target.value)
                                  }
                                />
                                {existing ? (
                                  <p className="mt-1 text-[10px] text-slate-500">
                                    {t.capUsed}: {existing.cap_used}
                                  </p>
                                ) : null}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          {setupStep === "guests" ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">{t.guestsTitle}</h3>
                <p className="text-xs text-slate-500">{t.guestsIntro}</p>
              </div>

              <input
                className={inputClass}
                placeholder={t.guestSearch}
                value={guestQuery}
                onChange={(event) => setGuestQuery(event.target.value)}
              />

              <form
                className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_0.6fr_0.8fr_auto]"
                onSubmit={handleCreateGuest}
              >
                <input
                  className={inputClass}
                  placeholder={t.guestName}
                  value={newGuestName}
                  onChange={(event) => setNewGuestName(event.target.value)}
                  required
                />
                <input
                  className={inputClass}
                  placeholder={t.guestPhone}
                  value={newGuestPhone}
                  onChange={(event) => setNewGuestPhone(event.target.value)}
                />
                <input
                  className={inputClass}
                  placeholder={t.guestNotes}
                  value={newGuestNotes}
                  onChange={(event) => setNewGuestNotes(event.target.value)}
                />
                <input
                  className={inputClass}
                  placeholder={t.guestPriority}
                  type="number"
                  min={0}
                  max={10}
                  value={newGuestPriority}
                  onChange={(event) => setNewGuestPriority(event.target.value)}
                />
                <select
                  className={inputClass}
                  value={newGuestTierId}
                  onChange={(event) => setNewGuestTierId(event.target.value)}
                >
                  {tiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name}
                    </option>
                  ))}
                </select>
                <button className={buttonClass} type="submit">
                  {t.addGuest}
                </button>
              </form>

              {guestError ? <p className="text-sm text-[var(--alert)]">{guestError}</p> : null}
              {guestWarning ? (
                <p className="text-sm text-[var(--accent-contrast)]">{guestWarning}</p>
              ) : null}
              {guestBusy ? <p className="text-sm text-slate-400">{t.loading}</p> : null}

              {guests.length === 0 ? (
                <p className="text-sm">{guestQuery ? t.guestsNoMatch : t.guestsEmpty}</p>
              ) : (
                <div className="grid gap-3">
                  {guests.map((guest) => {
                    const checkedIn = guest.state === "CHECKED_IN";
                    const tierName = tiers.find((tier) => tier.id === guest.access_tier_id)?.name;
                    return (
                      <div
                        key={guest.id}
                        className="rounded-2xl border border-[var(--line)] px-4 py-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{guest.full_name}</p>
                            <p className="text-xs text-slate-500">
                              {guest.phone ?? "-"} · {guest.notes ?? "-"}
                            </p>
                            <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                              {t.guestTier}: {tierName ?? "-"} · {t.guestAddedBy}: {renderAddedBy(guest)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.12em] ${
                                checkedIn
                                  ? "border-emerald-400 text-emerald-300"
                                  : "border-[var(--line)] text-slate-400"
                              }`}
                            >
                              {checkedIn ? t.guestCheckedIn : guest.state}
                            </span>
                            <button
                              className={subtleButtonClass}
                              type="button"
                              onClick={() => void handleGuestCheckIn(guest.id)}
                              disabled={checkedIn}
                            >
                              {checkedIn ? t.guestCheckedIn : t.guestCheckIn}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
          {t.setupSnapshot}
        </h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--line)] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
              {t.summaryZones}
            </p>
            <p className="mt-2 text-2xl font-semibold">{summary.zones}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
              {t.summaryTiers}
            </p>
            <p className="mt-2 text-2xl font-semibold">{summary.tiers}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
              {t.summaryStakeholders}
            </p>
            <p className="mt-2 text-2xl font-semibold">{summary.stakeholders}</p>
          </div>
        </div>
      </section>
    </main>
  );
}

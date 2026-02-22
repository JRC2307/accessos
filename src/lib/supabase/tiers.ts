import type { SupabaseClient } from "@supabase/supabase-js";

export interface TierRecord {
  id: string;
  event_id: string;
  name: string;
}

export async function listTiers(
  supabase: SupabaseClient,
  eventId: string,
): Promise<{ data: TierRecord[]; error: string | null }> {
  const { data, error } = await supabase
    .from("access_tiers")
    .select("id,event_id,name")
    .eq("event_id", eventId)
    .order("name", { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as TierRecord[]) ?? [], error: null };
}

export async function createTier(
  supabase: SupabaseClient,
  eventId: string,
  name: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("access_tiers").insert({
    event_id: eventId,
    name,
  });

  return { error: error?.message ?? null };
}

export async function deleteTier(
  supabase: SupabaseClient,
  id: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("access_tiers").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export const STANDARD_TIER_NAMES = ["All Access", "Cover", "Cover + Mesa", "Empleados"];

export function orderStandardTiers(tiers: TierRecord[]): TierRecord[] {
  const order = new Map(STANDARD_TIER_NAMES.map((name, index) => [name, index]));
  return [...tiers].sort((a, b) => {
    const aIndex = order.get(a.name) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = order.get(b.name) ?? Number.MAX_SAFE_INTEGER;
    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }
    return a.name.localeCompare(b.name);
  });
}

export async function ensureStandardAccessTiers(
  supabase: SupabaseClient,
  eventId: string,
): Promise<{ data: TierRecord[]; error: string | null }> {
  const { data: existing, error: fetchError } = await supabase
    .from("access_tiers")
    .select("id,event_id,name")
    .eq("event_id", eventId);

  if (fetchError) {
    return { data: [], error: fetchError.message };
  }

  const rows = (existing as TierRecord[] | null) ?? [];
  const existingNames = new Set(rows.map((tier) => tier.name));
  const missing = STANDARD_TIER_NAMES.filter((name) => !existingNames.has(name));

  if (missing.length > 0) {
    const { error: insertError } = await supabase.from("access_tiers").insert(
      missing.map((name) => ({ event_id: eventId, name })),
    );
    if (insertError) {
      return { data: rows, error: insertError.message };
    }
  }

  const refreshed = await supabase
    .from("access_tiers")
    .select("id,event_id,name")
    .eq("event_id", eventId)
    .order("name", { ascending: true });

  if (refreshed.error) {
    return { data: rows, error: refreshed.error.message };
  }

  return { data: (refreshed.data as TierRecord[]) ?? [], error: null };
}

import type { SupabaseClient } from "@supabase/supabase-js";

export interface TierZoneMapRecord {
  access_tier_id: string;
  zone_id: string;
}

export async function listTierZoneMap(
  supabase: SupabaseClient,
  eventId: string,
): Promise<{ data: TierZoneMapRecord[]; error: string | null }> {
  const { data, error } = await supabase
    .from("tier_zone_map")
    .select("access_tier_id,zone_id,access_tiers!inner(event_id)")
    .eq("access_tiers.event_id", eventId);

  if (error) {
    return { data: [], error: error.message };
  }

  const rows = (data as Array<TierZoneMapRecord & { access_tiers: { event_id: string } }> | null) ?? [];
  return {
    data: rows.map((row) => ({
      access_tier_id: row.access_tier_id,
      zone_id: row.zone_id,
    })),
    error: null,
  };
}

export async function replaceTierZones(
  supabase: SupabaseClient,
  accessTierId: string,
  zoneIds: string[],
): Promise<{ error: string | null }> {
  const { error: deleteError } = await supabase
    .from("tier_zone_map")
    .delete()
    .eq("access_tier_id", accessTierId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  if (zoneIds.length === 0) {
    return { error: null };
  }

  const payload = zoneIds.map((zoneId) => ({
    access_tier_id: accessTierId,
    zone_id: zoneId,
  }));

  const { error: insertError } = await supabase.from("tier_zone_map").insert(payload);
  return { error: insertError?.message ?? null };
}

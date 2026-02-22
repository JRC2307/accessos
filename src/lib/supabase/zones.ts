import type { SupabaseClient } from "@supabase/supabase-js";

export interface ZoneRecord {
  id: string;
  event_id: string;
  name: string;
  capacity: number | null;
}

export async function listZones(
  supabase: SupabaseClient,
  eventId: string,
): Promise<{ data: ZoneRecord[]; error: string | null }> {
  const { data, error } = await supabase
    .from("zones")
    .select("id,event_id,name,capacity")
    .eq("event_id", eventId)
    .order("name", { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as ZoneRecord[]) ?? [], error: null };
}

export async function createZone(
  supabase: SupabaseClient,
  eventId: string,
  name: string,
  capacity: number | null,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("zones").insert({
    event_id: eventId,
    name,
    capacity,
  });

  return { error: error?.message ?? null };
}

export async function deleteZone(
  supabase: SupabaseClient,
  id: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("zones").delete().eq("id", id);
  return { error: error?.message ?? null };
}

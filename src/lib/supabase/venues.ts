import type { SupabaseClient } from "@supabase/supabase-js";

export interface VenueRecord {
  id: string;
  org_id: string;
  name: string;
}

export async function createVenue(
  supabase: SupabaseClient,
  orgId: string,
  name: string,
): Promise<{ data: VenueRecord | null; error: string | null }> {
  const { data, error } = await supabase
    .from("venues")
    .insert({ org_id: orgId, name })
    .select("id,org_id,name")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: (data as VenueRecord) ?? null, error: null };
}

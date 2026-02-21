import type { SupabaseClient } from "@supabase/supabase-js";

export interface EventRecord {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  capacity: number | null;
  created_at: string;
}

export interface EventDraft {
  orgId: string;
  name: string;
  startsAt: string;
  endsAt: string;
  capacity: number | null;
}

function toIsoDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date input.");
  }

  return date.toISOString();
}

export async function listEvents(
  supabase: SupabaseClient,
): Promise<{ data: EventRecord[]; error: string | null }> {
  const { data, error } = await supabase
    .from("events")
    .select("id,name,starts_at,ends_at,capacity,created_at")
    .order("starts_at", { ascending: false })
    .limit(30);

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as EventRecord[]) ?? [], error: null };
}

export async function createEvent(
  supabase: SupabaseClient,
  draft: EventDraft,
): Promise<{ error: string | null }> {
  const payload = {
    org_id: draft.orgId,
    name: draft.name,
    starts_at: toIsoDate(draft.startsAt),
    ends_at: toIsoDate(draft.endsAt),
    capacity: draft.capacity,
  };

  const { error } = await supabase.from("events").insert(payload);

  return { error: error?.message ?? null };
}

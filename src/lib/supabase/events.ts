import type { SupabaseClient } from "@supabase/supabase-js";

export interface EventRecord {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  capacity: number | null;
  created_at: string;
  venue_name: string | null;
}

export interface EventDetail {
  id: string;
  org_id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  capacity: number | null;
  venue_name: string | null;
}

export interface EventDraft {
  orgId: string;
  venueId: string | null;
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
    .select("id,name,starts_at,ends_at,capacity,created_at,venues(name)")
    .order("starts_at", { ascending: false })
    .limit(30);

  if (error) {
    return { data: [], error: error.message };
  }

  const rows =
    (data as
      | Array<
          EventRecord & {
            venues: Array<{ name: string }> | null;
          }
        >
      | null) ?? [];

  return {
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      capacity: row.capacity,
      created_at: row.created_at,
      venue_name: row.venues?.[0]?.name ?? null,
    })),
    error: null,
  };
}

export async function createEvent(
  supabase: SupabaseClient,
  draft: EventDraft,
): Promise<{ error: string | null }> {
  const payload = {
    org_id: draft.orgId,
    venue_id: draft.venueId,
    name: draft.name,
    starts_at: toIsoDate(draft.startsAt),
    ends_at: toIsoDate(draft.endsAt),
    capacity: draft.capacity,
  };

  const { error } = await supabase.from("events").insert(payload);

  return { error: error?.message ?? null };
}

export async function getEventById(
  supabase: SupabaseClient,
  id: string,
): Promise<{ data: EventDetail | null; error: string | null }> {
  const { data, error } = await supabase
    .from("events")
    .select("id,org_id,name,starts_at,ends_at,capacity,venues(name)")
    .eq("id", id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  const row = data as {
    id: string;
    org_id: string;
    name: string;
    starts_at: string;
    ends_at: string;
    capacity: number | null;
    venues: Array<{ name: string }> | null;
  };

  return {
    data: {
      id: row.id,
      org_id: row.org_id,
      name: row.name,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      capacity: row.capacity,
      venue_name: row.venues?.[0]?.name ?? null,
    },
    error: null,
  };
}

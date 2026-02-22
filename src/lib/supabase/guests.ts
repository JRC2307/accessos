import type { SupabaseClient } from "@supabase/supabase-js";

export type GuestState = "INVITED" | "CHECKED_IN" | "DENIED" | "REVOKED" | string;

export interface GuestRecord {
  id: string;
  event_id: string;
  stakeholder_group_id: string;
  access_tier_id: string;
  added_by_user_id: string;
  added_by_display_name: string | null;
  full_name: string;
  phone: string | null;
  notes: string | null;
  priority: number;
  state: GuestState;
  created_at: string;
  updated_at: string;
}

export interface CreateGuestInput {
  eventId: string;
  stakeholderGroupId: string;
  accessTierId: string;
  addedByUserId: string;
  fullName: string;
  phone?: string;
  notes?: string;
  priority?: number;
}

type GuestRow = Omit<GuestRecord, "added_by_display_name"> & {
  added_by?: { display_name: string | null } | null;
};

export async function listGuests(
  supabase: SupabaseClient,
  eventId: string,
  query?: string,
): Promise<{ data: GuestRecord[]; error: string | null }> {
  let request = supabase
    .from("guests")
    .select(
      "id,event_id,stakeholder_group_id,access_tier_id,added_by_user_id,full_name,phone,notes,priority,state,created_at,updated_at,added_by:users!guests_added_by_user_id_fkey(display_name)",
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (query && query.trim()) {
    const term = `%${query.trim()}%`;
    request = request.or(
      `full_name.ilike.${term},phone.ilike.${term},notes.ilike.${term}`,
    );
  }

  const { data, error } = await request;

  if (error) {
    return { data: [], error: error.message };
  }

  const rows = (data as GuestRow[] | null) ?? [];

  return {
    data: rows.map(({ added_by, ...rest }) => ({
      ...rest,
      added_by_display_name: added_by?.display_name ?? null,
    })),
    error: null,
  };
}

export async function createGuest(
  supabase: SupabaseClient,
  payload: CreateGuestInput,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("guests").insert({
    event_id: payload.eventId,
    stakeholder_group_id: payload.stakeholderGroupId,
    access_tier_id: payload.accessTierId,
    added_by_user_id: payload.addedByUserId,
    full_name: payload.fullName,
    phone: payload.phone ?? null,
    notes: payload.notes ?? null,
    priority: payload.priority ?? 0,
  });

  return { error: error?.message ?? null };
}

export async function updateGuestState(
  supabase: SupabaseClient,
  guestId: string,
  state: GuestState,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("guests").update({ state }).eq("id", guestId);
  return { error: error?.message ?? null };
}

export async function deleteGuest(
  supabase: SupabaseClient,
  guestId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("guests").delete().eq("id", guestId);
  return { error: error?.message ?? null };
}

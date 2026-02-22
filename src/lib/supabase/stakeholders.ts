import type { SupabaseClient } from "@supabase/supabase-js";

export type StakeholderRoleType =
  | "BOOKER"
  | "TOUR_MANAGER"
  | "PROMOTER"
  | "VENUE_OPS"
  | "STAGE_MANAGER";

export interface StakeholderGroupRecord {
  id: string;
  event_id: string;
  name: string;
  role_type: StakeholderRoleType;
  owner_user_id: string | null;
}

export async function listStakeholderGroups(
  supabase: SupabaseClient,
  eventId: string,
): Promise<{ data: StakeholderGroupRecord[]; error: string | null }> {
  const { data, error } = await supabase
    .from("stakeholder_groups")
    .select("id,event_id,name,role_type,owner_user_id")
    .eq("event_id", eventId)
    .order("name", { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as StakeholderGroupRecord[]) ?? [], error: null };
}

export async function createStakeholderGroup(
  supabase: SupabaseClient,
  eventId: string,
  name: string,
  roleType: StakeholderRoleType,
  ownerUserId?: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("stakeholder_groups").insert({
    event_id: eventId,
    name,
    role_type: roleType,
    owner_user_id: ownerUserId ?? null,
  });

  return { error: error?.message ?? null };
}

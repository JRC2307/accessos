import type { SupabaseClient } from "@supabase/supabase-js";

export interface AllocationRecord {
  id: string;
  stakeholder_group_id: string;
  access_tier_id: string;
  cap_total: number;
  cap_used: number;
}

export async function listAllocations(
  supabase: SupabaseClient,
  eventId: string,
): Promise<{ data: AllocationRecord[]; error: string | null }> {
  const { data, error } = await supabase
    .from("allocations")
    .select("id,stakeholder_group_id,access_tier_id,cap_total,cap_used,stakeholder_groups!inner(event_id)")
    .eq("stakeholder_groups.event_id", eventId);

  if (error) {
    return { data: [], error: error.message };
  }

  const rows =
    (data as
      | Array<AllocationRecord & { stakeholder_groups: Array<{ event_id: string }> }>
      | null) ?? [];

  return {
    data: rows.map((row) => ({
      id: row.id,
      stakeholder_group_id: row.stakeholder_group_id,
      access_tier_id: row.access_tier_id,
      cap_total: row.cap_total,
      cap_used: row.cap_used,
    })),
    error: null,
  };
}

export async function createAllocation(
  supabase: SupabaseClient,
  stakeholderGroupId: string,
  accessTierId: string,
  capTotal: number,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("allocations").insert({
    stakeholder_group_id: stakeholderGroupId,
    access_tier_id: accessTierId,
    cap_total: capTotal,
  });

  return { error: error?.message ?? null };
}

export async function updateAllocation(
  supabase: SupabaseClient,
  allocationId: string,
  capTotal: number,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("allocations")
    .update({ cap_total: capTotal })
    .eq("id", allocationId);

  return { error: error?.message ?? null };
}

import type { SupabaseClient } from "@supabase/supabase-js";

export interface OrgRecord {
  id: string;
  name: string;
  kind: string;
}

export async function listUserOrgs(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ data: OrgRecord[]; error: string | null }> {
  const { data, error } = await supabase
    .from("memberships")
    .select("org_id,organizations(id,name,kind)")
    .eq("user_id", userId);

  if (error) {
    return { data: [], error: error.message };
  }

  const rows =
    (data as Array<{ org_id: string; organizations: OrgRecord | null }> | null) ?? [];

  return {
    data: rows
      .map((row) => row.organizations)
      .filter((org): org is OrgRecord => Boolean(org)),
    error: null,
  };
}

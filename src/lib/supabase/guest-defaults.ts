import type { SupabaseClient } from "@supabase/supabase-js";
import { STANDARD_TIER_NAMES } from "@/lib/supabase/tiers";

interface GuestDefaultsRow {
  stakeholder_group_id: string;
  access_tier_id: string;
}

export async function ensureGuestDefaults(
  supabase: SupabaseClient,
  eventId: string,
  userId: string,
): Promise<{ data: { stakeholderGroupId: string; accessTierId: string } | null; error: string | null }> {
  const { data: rpcData, error: rpcError } = await supabase.rpc("ensure_guest_defaults", {
    _event_id: eventId,
    _owner_user_id: userId,
  });

  const rpcRow = Array.isArray(rpcData)
    ? (rpcData[0] as GuestDefaultsRow | undefined)
    : (rpcData as GuestDefaultsRow | null);

  if (!rpcError && rpcRow?.stakeholder_group_id && rpcRow?.access_tier_id) {
    return {
      data: {
        stakeholderGroupId: rpcRow.stakeholder_group_id,
        accessTierId: rpcRow.access_tier_id,
      },
      error: null,
    };
  }

  const { data: sgData, error: sgError } = await supabase
    .from("stakeholder_groups")
    .select("id")
    .eq("event_id", eventId)
    .eq("name", "DEFAULT_GUEST_LIST")
    .maybeSingle();

  if (sgError) {
    return { data: null, error: sgError.message };
  }

  let stakeholderGroupId = sgData?.id ?? null;
  if (!stakeholderGroupId) {
    const { data: sgInsert, error: sgInsertError } = await supabase
      .from("stakeholder_groups")
      .insert({
        event_id: eventId,
        name: "DEFAULT_GUEST_LIST",
        role_type: "VENUE_OPS",
        owner_user_id: userId,
      })
      .select("id")
      .single();

    if (sgInsertError || !sgInsert) {
      return { data: null, error: sgInsertError?.message ?? "Unable to create guest group." };
    }

    stakeholderGroupId = sgInsert.id;
  }

  const { data: tierRows, error: tierError } = await supabase
    .from("access_tiers")
    .select("id,name")
    .eq("event_id", eventId);

  if (tierError) {
    return { data: null, error: tierError.message };
  }

  const existingTiers = (tierRows as Array<{ id: string; name: string }> | null) ?? [];
  const existingNames = new Set(existingTiers.map((tier) => tier.name));
  const missingNames = STANDARD_TIER_NAMES.filter((name) => !existingNames.has(name));

  if (missingNames.length > 0) {
    const { data: tierInsert, error: tierInsertError } = await supabase
      .from("access_tiers")
      .insert(
        missingNames.map((name) => ({
          event_id: eventId,
          name,
        })),
      )
      .select("id,name");

    if (tierInsertError || !tierInsert) {
      return { data: null, error: tierInsertError?.message ?? "Unable to create access tiers." };
    }

    existingTiers.push(...tierInsert);
  }

  const accessTierId =
    existingTiers.find((tier) => tier.name === "Cover")?.id ?? existingTiers[0]?.id ?? null;

  if (!accessTierId) {
    return { data: null, error: "Unable to resolve access tier." };
  }

  const { data: allocData, error: allocError } = await supabase
    .from("allocations")
    .select("id")
    .eq("stakeholder_group_id", stakeholderGroupId)
    .eq("access_tier_id", accessTierId)
    .maybeSingle();

  if (allocError) {
    return { data: null, error: allocError.message };
  }

  if (!allocData?.id) {
    const { error: allocInsertError } = await supabase.from("allocations").insert({
      stakeholder_group_id: stakeholderGroupId,
      access_tier_id: accessTierId,
      cap_total: 10000,
    });

    if (allocInsertError) {
      return { data: null, error: allocInsertError.message };
    }
  }

  return {
    data: { stakeholderGroupId, accessTierId },
    error: null,
  };
}

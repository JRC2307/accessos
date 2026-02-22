import type { SupabaseClient } from "@supabase/supabase-js";

interface MarkGuestEnteredInput {
  eventId: string;
  guestId: string;
  scannedByUserId: string;
}

export async function markGuestEntered(
  supabase: SupabaseClient,
  payload: MarkGuestEnteredInput,
): Promise<{ error: string | null; warning: string | null }> {
  const { error: updateError } = await supabase
    .from("guests")
    .update({ state: "CHECKED_IN" })
    .eq("id", payload.guestId);

  if (updateError) {
    return { error: updateError.message, warning: null };
  }

  const { error: logError } = await supabase.from("scan_logs").insert({
    event_id: payload.eventId,
    guest_id: payload.guestId,
    result: "ALLOWED",
    reason: "MANUAL_CHECK_IN",
    scanned_by_user_id: payload.scannedByUserId,
  });

  if (logError) {
    return { error: null, warning: logError.message };
  }

  return { error: null, warning: null };
}

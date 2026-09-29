import { guestContinuation, type GuestVisit } from "./guest-state";

/** Recheck with the newly signed-in identity; never replay an old context. */
export async function restoreGuestView({
  serverUrl,
  state,
  isCurrentSession,
  readLedger,
  restore,
  unavailable,
}: {
  serverUrl: string;
  state: string;
  isCurrentSession: () => boolean;
  readLedger: (ledgerId: string) => Promise<{ id: string }>;
  restore: (visit: GuestVisit) => void;
  unavailable: (error: unknown) => void;
}): Promise<boolean> {
  const visit = guestContinuation(serverUrl, state);
  if (!visit?.ledgerId) return false;
  const current = () =>
    isCurrentSession() && guestContinuation(serverUrl, state) === visit;
  try {
    const ledger = await readLedger(visit.ledgerId);
    if (!current()) return true;
    if (ledger.id !== visit.ledgerId) throw new Error("Example is unavailable");
    restore(visit);
  } catch (error) {
    if (current()) unavailable(error);
  }
  return true;
}

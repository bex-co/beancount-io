/**
 * Binding a pushed detail route to the ledger it was opened for.
 *
 * `openAppLinkTarget` selects the link's ledger and then `router.replace`s only
 * the *current* history entry, so detail entries opened for the previous ledger
 * stay alive behind it. A native Back revives one of them, and a screen that
 * reads its subject (account, entry hash, payee, commit SHA) from the route but
 * its ledger from the ambient selection would then show — or query — the old
 * subject under the new ledger.
 *
 * So every in-app push of a ledger-scoped detail route carries a `ledger`
 * param, and the screen resolves it here before mounting anything that reads
 * or writes. A mismatch renders an unavailable state and issues no request.
 */
export type RouteLedgerBinding =
  | { status: "ready"; ledgerId: string }
  /** The route belongs to a ledger that is no longer selected. */
  | { status: "mismatch"; routeLedgerId: string; selectedLedgerId: string };

/** First value of an expo-router search param (repeated params arrive as arrays). */
export const firstRouteParam = (value?: string | string[]): string => {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }
  return typeof value === "string" ? value : "";
};

/**
 * Resolve a route's `ledger` param against the selected ledger.
 *
 * A missing param is treated as "this ledger": links written before the param
 * existed (and hand-typed deep links) still work, and the in-app navigations
 * that can actually be revived across a ledger switch all pass it.
 */
export function bindRouteLedger(
  routeLedger: string | string[] | undefined,
  selectedLedgerId: string,
): RouteLedgerBinding {
  const routeLedgerId = firstRouteParam(routeLedger);
  if (routeLedgerId && routeLedgerId !== selectedLedgerId) {
    return { status: "mismatch", routeLedgerId, selectedLedgerId };
  }
  return { status: "ready", ledgerId: selectedLedgerId };
}

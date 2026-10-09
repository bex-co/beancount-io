import { bindRouteLedger, firstRouteParam } from "../../common/route-ledger";

/**
 * What an account-detail route entry resolves to.
 *
 * `router.replace` only rewrites the *current* history entry, so an app link
 * that switches ledgers leaves older stack entries — including account-detail
 * entries for the previous ledger — alive behind it. Tapping Back revives one of
 * those, and a screen that reads the account from the route while taking the
 * ledger from the ambient selection would then query the old account under the
 * new ledger.
 *
 * So the ledger is bound to the route: every link to `/account-detail` carries a
 * `ledger` param, and the screen only queries when that param matches the
 * selected ledger (see `common/route-ledger`).
 */
export type AccountDetailTarget =
  | { status: "ready"; account: string; ledgerId: string }
  /** No account in the route — nothing to show. */
  | { status: "missing" }
  /** The route belongs to a ledger that is no longer selected. */
  | { status: "mismatch"; routeLedgerId: string; selectedLedgerId: string };

/**
 * Resolve the route params against the selected ledger.
 *
 * A missing `ledger` param is treated as "this ledger": links written before the
 * param existed (and any hand-typed deep link) still work, and the in-app
 * navigations that can actually be revived across a ledger switch all pass it.
 */
export function selectAccountDetailTarget(args: {
  account?: string | string[];
  ledger?: string | string[];
  selectedLedgerId: string;
}): AccountDetailTarget {
  const account = firstRouteParam(args.account);
  if (!account) {
    return { status: "missing" };
  }
  const binding = bindRouteLedger(args.ledger, args.selectedLedgerId);
  if (binding.status === "mismatch") {
    return binding;
  }
  return { status: "ready", account, ledgerId: binding.ledgerId };
}

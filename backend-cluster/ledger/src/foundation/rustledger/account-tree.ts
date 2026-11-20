import BigNumber from "bignumber.js";
import type { DirectiveJson, PostingJson } from "@rustledger/wasm";
import type { PriceMap } from "./price-map";
import {
  FlowLots,
  isFlowAccount,
  LotInventory,
  parseConversion,
} from "./lot-inventory";

const Amount = BigNumber.clone({
  DECIMAL_PLACES: 28,
  ROUNDING_MODE: BigNumber.ROUND_HALF_EVEN,
});

const compareCodePoints = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

/**
 * A serialised account-tree node — structurally identical to fava's
 * `SerializableTreeNodePublic` (minus the optional `cost` fields, which fava
 * only emits for at-cost hierarchies). `balance` is an account's own posting
 * sum per currency; `balance_children` rolls up the subtree.
 */
export interface AccountTreeNode {
  account: string;
  balance: Record<string, string>;
  balance_children: Record<string, string>;
  children: AccountTreeNode[];
  has_txns: boolean;
}

function parentOf(account: string): string {
  const idx = account.lastIndexOf(":");
  return idx === -1 ? "" : account.slice(0, idx);
}

/** All currencies appearing in posting units across the ledger. */
export function ledgerCurrencies(directives: DirectiveJson[]): Set<string> {
  const currencies = new Set<string>();
  directives.forEach((directive) => {
    if (directive.type !== "transaction") return;
    directive.postings.forEach((posting) => {
      if (posting.units) currencies.add(posting.units.currency);
    });
  });
  return currencies;
}

/** Whether any posting carries a cost lot (held-at-cost positions). */
export function hasCostPostings(directives: DirectiveJson[]): boolean {
  return directives.some(
    (directive) =>
      directive.type === "transaction" &&
      directive.postings.some((posting) => posting.cost !== undefined),
  );
}

interface MutableNode {
  account: string;
  balance: LotInventory;
  balanceChildren: LotInventory;
  children: Set<string>;
  hasTxns: boolean;
}

/**
 * Build the full account tree from directives, netting transaction-posting COST
 * LOTS per account and rolling them up to ancestors. `Open` directives seed
 * empty accounts (`has_txns=false`). Cost lots are preserved so the tree can be
 * valued `at_cost` / `at_value` / in a currency (see {@link accountHierarchy}).
 * With `flows`, income and expenses accounts are kept by day and settled under
 * its target ({@link FlowLots}): each posting valued on its own date. Returns
 * the target that reads the settled balances.
 */
function buildAccountTree(
  directives: DirectiveJson[],
  target: string,
  priceMap: PriceMap,
  flowRoots: readonly string[],
): { nodes: Map<string, MutableNode>; readAs: string } {
  const nodes = new Map<string, MutableNode>();

  const ensure = (account: string): MutableNode => {
    let node = nodes.get(account);
    if (!node) {
      node = {
        account,
        balance: new LotInventory(),
        balanceChildren: new LotInventory(),
        children: new Set(),
        hasTxns: false,
      };
      nodes.set(account, node);
      if (account !== "") {
        const parent = ensure(parentOf(account));
        parent.children.add(account);
      }
    }
    return node;
  };

  ensure("");

  // Seed opened accounts, then accumulate posting lots per account.
  const accountFlows = new Map<string, FlowLots>();
  directives.forEach((directive) => {
    if (directive.type === "open") {
      ensure(directive.account);
    }
    if (directive.type !== "transaction") return;
    directive.postings.forEach((posting) => {
      if (!posting.units) return;
      let lots = accountFlows.get(posting.account);
      if (!lots) {
        lots = new FlowLots(
          target,
          priceMap,
          isFlowAccount(posting.account, flowRoots),
        );
        accountFlows.set(posting.account, lots);
      }
      lots.addPosting(directive.date, posting);
    });
  });
  let readAs = target;
  const accountLots = new Map<string, LotInventory>();
  accountFlows.forEach((lots, account) => {
    const settled = lots.settle();
    accountLots.set(account, settled.inventory);
    if (isFlowAccount(account, flowRoots)) readAs = settled.readAs;
  });

  // Insert each account's balance and roll up to ancestors.
  [...accountLots.entries()]
    .sort((a, b) => compareCodePoints(a[0], b[0]))
    .forEach(([account, lots]) => {
      const node = ensure(account);
      node.hasTxns = true;
      node.balance.merge(lots);
      node.balanceChildren.merge(lots);
      let ancestor = parentOf(account);
      for (;;) {
        ensure(ancestor).balanceChildren.merge(lots);
        if (ancestor === "") break;
        ancestor = parentOf(ancestor);
      }
    });

  return { nodes, readAs };
}

/** Value a node's lot inventory under `target`, drop zeros, and stringify. */
function serialiseInventory(
  balance: LotInventory,
  target: string,
  priceMap: PriceMap,
  date: string | undefined,
): Record<string, string> {
  const converted = balance.reduceScaled(
    parseConversion(target),
    priceMap,
    date,
  );
  const out: Record<string, string> = {};
  // Plain decimals at the written scale: `toString()` sent `5e-7` and
  // dropped trailing zeros (w21/125).
  converted.forEach(({ value, scale }, currency) => {
    if (!value.isZero()) out[currency] = value.toFixed(scale);
  });
  return out;
}

/** Serialise the subtree rooted at `account` into fava's tree-node shape. */
function serialiseSubtree(
  nodes: Map<string, MutableNode>,
  account: string,
  target: string,
  priceMap: PriceMap,
  date: string | undefined,
): AccountTreeNode {
  const node = nodes.get(account) ?? {
    account,
    balance: new LotInventory(),
    balanceChildren: new LotInventory(),
    children: new Set<string>(),
    hasTxns: false,
  };
  const children = [...node.children]
    .sort(compareCodePoints)
    .map((child) => serialiseSubtree(nodes, child, target, priceMap, date));
  return {
    account,
    balance: serialiseInventory(node.balance, target, priceMap, date),
    balance_children: serialiseInventory(
      node.balanceChildren,
      target,
      priceMap,
      date,
    ),
    children,
    has_txns: node.hasTxns,
  };
}

/**
 * Build + serialise the account hierarchy rooted at `rootAccount`, valuing each
 * node's cost-lot inventory under `target` (a currency code, or `units` /
 * `at_cost` / `at_value`) against `priceMap`. Prices are those on or before
 * `date`, the time filter's last day (fava's `serialise_with_context` passes
 * `g.filtered.end_date`), and the latest ones when there is no time filter.
 *
 * `flowRoots` names the ledger's income and expenses roots. A tree rooted in
 * one values each posting on its own date instead, as the interval totals
 * beside it do (w1/m49), so a later quote does not revalue an earlier
 * month's spending.
 */
export function accountHierarchy(
  directives: DirectiveJson[],
  rootAccount: string,
  target: string,
  priceMap: PriceMap,
  date?: string,
  { flowRoots = [] }: { flowRoots?: readonly string[] } = {},
): AccountTreeNode {
  // Only a flow subtree is valued by day, and only its own root's postings:
  // a tree spanning the whole ledger reads every node under one target.
  const { nodes, readAs } = buildAccountTree(
    directives,
    target,
    priceMap,
    isFlowAccount(rootAccount, flowRoots) ? [rootAccount.split(":", 1)[0]] : [],
  );
  return serialiseSubtree(nodes, rootAccount, readAs, priceMap, date);
}

type ScaledSums = Map<string, { value: BigNumber; scale: number }>;

/** Net `value` into `sums[currency]`, keeping the widest scale. */
function addScaled(
  sums: ScaledSums,
  currency: string,
  value: BigNumber,
  scale: number,
): void {
  const sum = sums.get(currency);
  sums.set(currency, {
    value: sum ? sum.value.plus(value) : value,
    scale: Math.max(sum?.scale ?? 0, scale),
  });
}

/** Stringify `sums` at their scales, dropping the currencies that net. */
function nonZero(sums: ScaledSums): Record<string, string> {
  const out: Record<string, string> = {};
  sums.forEach(({ value, scale }, currency) => {
    if (!value.isZero()) out[currency] = value.toFixed(scale);
  });
  return out;
}

/**
 * Whether a price, not a booked cost, weighs one of a transaction's legs: a
 * currency exchange. A price on a costed posting does not set its weight (the
 * booked cost does), so only a price-weighted leg counts. `bea`'s
 * `priced_exchange` (w5/1078).
 */
function pricedExchange(postings: readonly PostingJson[]): boolean {
  return postings.some(
    (posting) =>
      posting.price !== undefined &&
      posting.cost === undefined &&
      posting.units !== undefined &&
      posting.price.currency !== posting.units.currency,
  );
}

/**
 * The rounding Beancount's tolerance accepted in `directives`, valued under
 * `target`: the at-cost remainder of every transaction no price weighs, negated
 * so it nets them. Two `3.333 USD` legs against `-6.67 USD` leave 0.004 USD.
 */
function acceptedRounding(
  directives: readonly DirectiveJson[],
  target: string,
  priceMap: PriceMap,
  date: string | undefined,
): ScaledSums {
  const booked = new LotInventory();
  for (const directive of directives) {
    if (directive.type !== "transaction") continue;
    if (pricedExchange(directive.postings)) continue;
    directive.postings.forEach((posting) => booked.addPosting(posting));
  }
  const left = new LotInventory();
  booked
    .reduceScaled({ kind: "at_cost" }, priceMap, date)
    .forEach(({ value, scale }, currency) => {
      if (value.isZero()) return;
      left.addPosting({
        account: "",
        units: { number: value.negated().toFixed(scale), currency },
      });
    });
  return left.reduceScaled(parseConversion(target), priceMap, date);
}

/** A valued trial balance's two lines, which together net its five roots. */
export interface TrialBalanceLines {
  valuation_adjustment: Record<string, string>;
  rounding_residual: Record<string, string>;
}

/**
 * What a valued trial balance's five roots leave unbalanced, negated, so the
 * roots plus these lines sum to zero in every currency, split as
 * `bea report trial-balance` splits it (w1/287, w1/291, w1/304):
 *
 * - `rounding_residual`: the rounding Beancount's tolerance accepted, the
 *   at-cost remainder of each transaction no price weighs, valued at `date`.
 *   It is the same residual with the trees read at cost, less what priced
 *   exchanges leave there, so a ledger with nothing to value gives it the
 *   whole residual, digit for digit.
 * - `valuation_adjustment`: the rest, what valuing moves: a holding's
 *   unrealized gain, a currency's translation and, at cost, the conversion a
 *   priced exchange leaves.
 *
 * `directives` is the stream the roots were built from. Under a time filter
 * its opening entries net the earlier transactions at cost, so the rounding
 * starts at the period's first day. Currencies that net drop out, so books
 * that already balance read `{}` on both lines.
 *
 * Null when `target` is a currency and a root still holds a commodity the
 * conversion could not value: the residual would pass units off as an
 * adjustment. The caller withholds it under `units`, where nothing is valued.
 */
export function trialBalanceLines(
  roots: readonly AccountTreeNode[],
  directives: readonly DirectiveJson[],
  target: string,
  priceMap: PriceMap,
  date: string | undefined,
): TrialBalanceLines | null {
  const currencyTarget = target !== "at_cost" && target !== "at_value";
  const residual: ScaledSums = new Map();
  for (const root of roots) {
    for (const [currency, number] of Object.entries(root.balance_children)) {
      const value = new Amount(number);
      if (value.isZero()) continue;
      if (currencyTarget && currency !== target) return null;
      const dot = number.indexOf(".");
      const scale = dot === -1 ? 0 : number.length - dot - 1;
      addScaled(residual, currency, value.negated(), scale);
    }
  }
  const rounding = acceptedRounding(directives, target, priceMap, date);
  const valuation: ScaledSums = new Map(residual);
  rounding.forEach(({ value, scale }, currency) =>
    addScaled(valuation, currency, value.negated(), scale),
  );
  return {
    valuation_adjustment: nonZero(valuation),
    rounding_residual: nonZero(rounding),
  };
}

/** Per-account own (non-cumulative) units balance, zero-dropped + stringified. */
export function accountOwnUnitBalances(
  directives: DirectiveJson[],
): Map<string, Record<string, string>> {
  const scaleOf = (source: string): number => {
    const dot = source.indexOf(".");
    if (dot === -1) return 0;
    const exponent = source.search(/[eE]/u);
    return (exponent === -1 ? source.length : exponent) - dot - 1;
  };
  const sums = new Map<
    string,
    Map<string, { value: BigNumber; scale: number }>
  >();
  directives.forEach((directive) => {
    if (directive.type !== "transaction") return;
    directive.postings.forEach((posting) => {
      if (!posting.units) return;
      let acct = sums.get(posting.account);
      if (!acct) {
        acct = new Map();
        sums.set(posting.account, acct);
      }
      const existing = acct.get(posting.units.currency);
      const value = new Amount(posting.units.number);
      acct.set(posting.units.currency, {
        value: existing ? existing.value.plus(value) : value,
        scale: Math.max(existing?.scale ?? 0, scaleOf(posting.units.number)),
      });
    });
  });
  const out = new Map<string, Record<string, string>>();
  sums.forEach((currencies, account) => {
    const record: Record<string, string> = {};
    currencies.forEach(({ value, scale }, currency) => {
      if (!value.isZero()) record[currency] = value.toFixed(scale);
    });
    out.set(account, record);
  });
  return out;
}

/**
 * Latest date of any directive referencing each account (transaction postings +
 * account-level directives). Mirrors fava's `get_last_entry`; assumes
 * date-sorted directives (rustledger output is), so the last occurrence wins.
 */
export function accountLastEntryDates(
  directives: DirectiveJson[],
): Map<string, string> {
  const last = new Map<string, string>();
  const touch = (account: string, date: string): void => {
    const existing = last.get(account);
    if (existing === undefined || date >= existing) last.set(account, date);
  };
  directives.forEach((directive) => {
    switch (directive.type) {
      case "transaction":
        directive.postings.forEach((posting) =>
          touch(posting.account, directive.date),
        );
        break;
      case "open":
      case "close":
      case "balance":
      case "note":
      case "document":
        touch(directive.account, directive.date);
        break;
      case "pad":
        touch(directive.account, directive.date);
        touch(directive.source_account, directive.date);
        break;
      default:
        break;
    }
  });
  return last;
}

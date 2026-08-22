import BigNumber from "bignumber.js";
import type { DirectiveJson } from "@rustledger/wasm";
import type { PriceMap } from "./price-map";
import { LotInventory, parseConversion } from "./lot-inventory";

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
 */
export function buildAccountTree(
  directives: DirectiveJson[],
): Map<string, MutableNode> {
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
  const accountLots = new Map<string, LotInventory>();
  directives.forEach((directive) => {
    if (directive.type === "open") {
      ensure(directive.account);
    }
    if (directive.type !== "transaction") return;
    directive.postings.forEach((posting) => {
      if (!posting.units) return;
      let lots = accountLots.get(posting.account);
      if (!lots) {
        lots = new LotInventory();
        accountLots.set(posting.account, lots);
      }
      lots.addPosting(posting);
    });
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

  return nodes;
}

/** Value a node's lot inventory under `target`, drop zeros, and stringify. */
function serialiseInventory(
  balance: LotInventory,
  target: string,
  priceMap: PriceMap,
  date: string | undefined,
): Record<string, string> {
  const converted = balance.reduce(parseConversion(target), priceMap, date);
  const out: Record<string, string> = {};
  converted.forEach((value, currency) => {
    if (!value.isZero()) out[currency] = value.toString();
  });
  return out;
}

/** Serialise the subtree rooted at `account` into fava's tree-node shape. */
export function serialiseSubtree(
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
 * `at_cost` / `at_value`) against `priceMap`. Tree balances are valued at the
 * latest price (`date` omitted), matching fava's `ledger.prices`.
 */
export function accountHierarchy(
  directives: DirectiveJson[],
  rootAccount: string,
  target: string,
  priceMap: PriceMap,
  date?: string,
): AccountTreeNode {
  return serialiseSubtree(
    buildAccountTree(directives),
    rootAccount,
    target,
    priceMap,
    date,
  );
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

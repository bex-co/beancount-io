import { TrialBalanceQuery } from "@/generated-graphql/graphql";
import { resolveCurrencyBalance } from "../../common/balance-util";
import {
  BalanceDisplay,
  BalanceMap,
  selectBalanceDisplay,
} from "../../common/balance-display";
import {
  selectValuation,
  valueBasisOf,
  type ManagedSource,
  type PricePair,
} from "../../common/valuation";
import {
  AccountCategory,
  CATEGORY_KEYS,
  CategoryKey,
  selectAccountTreeFromRoot,
} from "./select-account-list";

/** One root of the trial balance, as the query returns it. */
type TrialBalanceRoot =
  TrialBalanceQuery["getLedgerTrialBalance"]["assetsHierarchyData"];

/** A node anywhere in a root's tree; `children` is an untyped JSON scalar. */
type TrialBalanceNode = {
  account: string;
  balanceChildren: BalanceMap;
  children?: unknown;
};

/** Maps each category onto the field the trial balance returns it under. */
const ROOT_FIELD: Record<
  CategoryKey,
  keyof TrialBalanceQuery["getLedgerTrialBalance"]
> = {
  assets: "assetsHierarchyData",
  liabilities: "liabilitiesHierarchyData",
  equity: "equityHierarchyData",
  income: "incomeHierarchyData",
  expenses: "expensesHierarchyData",
};

const ROOT_PREFIX: Record<CategoryKey, string> = {
  assets: "Assets",
  liabilities: "Liabilities",
  equity: "Equity",
  income: "Income",
  expenses: "Expenses",
};

function rootOf(
  data: TrialBalanceQuery | undefined,
  key: CategoryKey,
): TrialBalanceRoot | undefined {
  return data?.getLedgerTrialBalance?.[ROOT_FIELD[key]] as
    TrialBalanceRoot | undefined;
}

/** `node` and every node beneath it, depth first. */
function treeNodes(
  node: TrialBalanceNode,
  out: TrialBalanceNode[] = [],
): TrialBalanceNode[] {
  out.push(node);
  for (const child of (node.children as TrialBalanceNode[] | null) ?? []) {
    treeNodes(child, out);
  }
  return out;
}

/**
 * The five root categories in conventional order, each with its total and account
 * tree — the row model behind the Accounts tab's balance table.
 *
 * Reads the **trial balance** rather than `accountHierarchy`, because only the
 * former takes a `conversion` argument. `accountHierarchy` returns raw
 * per-currency balances, so `balance_children.USD` is just the cash: a ledger
 * holding VBMPX and ITOT reported Assets of $2,677.28 against a true $96,156.71.
 * The trial balance converts every commodity into the requested currency first.
 *
 * Balances are shown exactly as the ledger holds them — Liabilities, Equity and
 * Income negative. Holdings are valued at market, the same basis as Home, so
 * the five sum to zero only when market and cost agree; the difference is the
 * unrealized gain no account books. A category the ledger doesn't use (zero
 * total, no rows) is omitted.
 */
export function selectTrialBalanceCategories(
  currency: string,
  data?: TrialBalanceQuery,
  accountNames: readonly string[] = [],
): AccountCategory[] {
  const trialBalance = data?.getLedgerTrialBalance;
  if (!currency || !trialBalance) {
    return [];
  }

  return CATEGORY_KEYS.map((key) => {
    const root = rootOf(data, key);
    return {
      key,
      account: root?.account ?? "",
      value: resolveCurrencyBalance(root?.balanceChildren, currency),
      // The Accounts view is the one caller that wants zero-balance accounts —
      // they are grafted into the hierarchy at their real level rather than
      // appended to the category after its ancestors are compressed — and the
      // one that counts unconverted holdings as part of a balance.
      children: selectAccountTreeFromRoot(currency, root, 1, {
        accounts: accountNames,
        rootAccount: root?.account || ROOT_PREFIX[key],
        wholeBalance: true,
      }),
    };
  }).filter((category) => category.value !== 0 || category.children.length > 0);
}

/**
 * One account's balance in the trial balance — what its Accounts row shows —
 * or undefined when the account is not in it (or the read has not landed).
 */
export function selectTrialBalanceAccount(
  data: TrialBalanceQuery | undefined,
  account: string,
): BalanceMap {
  for (const key of CATEGORY_KEYS) {
    const root = rootOf(data, key);
    const node = root
      ? treeNodes(root).find((candidate) => candidate.account === account)
      : undefined;
    if (node) return node.balanceChildren;
  }
  return undefined;
}

/**
 * How each Accounts row's balance reads (see `selectBalanceDisplay`), keyed the
 * way `flattenRows` keys rows: the category key for a root ("assets"), the full
 * account beneath it. `valued` is the market read the rows show; `units` is a
 * `units` read of the same trial balance — until it lands, commodities held at
 * cost stay money figures. `prices` says which basis each commodity's value was
 * read at, and each root, like a Home page, carries what it discloses about its
 * basis (see `selectValuation`). The tree values at the latest price, so no
 * date bounds the price lookup.
 *
 * A folded chain row takes its deepest account, whose balance the whole chain
 * shares, so looking that account up gives the row's figure.
 */
export function selectTrialBalanceDisplays(
  currency: string,
  valued: TrialBalanceQuery | undefined,
  units: TrialBalanceQuery | undefined,
  prices: readonly PricePair[] | undefined,
  today: string,
  managed?: readonly ManagedSource[],
): Map<string, BalanceDisplay> {
  const displays = new Map<string, BalanceDisplay>();
  if (!currency || !valued?.getLedgerTrialBalance) {
    return displays;
  }
  const basisOf = valueBasisOf(prices, currency);

  for (const key of CATEGORY_KEYS) {
    const root = rootOf(valued, key);
    if (!root) continue;
    const unitsRoot = rootOf(units, key);
    const rowKey = (node: TrialBalanceNode, top: TrialBalanceNode) =>
      node === top ? key : node.account;
    const unitsByRow = new Map<string, BalanceMap>(
      unitsRoot
        ? treeNodes(unitsRoot).map((node) => [
            rowKey(node, unitsRoot),
            node.balanceChildren,
          ])
        : [],
    );
    for (const node of treeNodes(root)) {
      const row = rowKey(node, root);
      const display = selectBalanceDisplay(
        node.balanceChildren,
        unitsByRow.get(row),
        currency,
        basisOf,
      );
      displays.set(
        row,
        node === root && display.kind === "money"
          ? {
              ...display,
              valuation: selectValuation({
                market: node.balanceChildren,
                units: unitsByRow.get(row),
                currency,
                today,
                prices,
                managed,
              }),
            }
          : display,
      );
    }
  }
  return displays;
}

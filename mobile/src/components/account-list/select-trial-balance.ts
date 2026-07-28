import { TrialBalanceQuery } from "@/generated-graphql/graphql";
import { resolveCurrencyBalance } from "../../common/balance-util";
import {
  AccountCategory,
  CATEGORY_KEYS,
  CategoryKey,
  selectAccountTreeFromRoot,
} from "./select-account-list";

/** One root of the trial balance, as the query returns it. */
type TrialBalanceRoot =
  TrialBalanceQuery["getLedgerTrialBalance"]["assetsHierarchyData"];

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

function collectAccountNames(nodes: AccountCategory["children"]): Set<string> {
  const names = new Set<string>();
  const visit = (items: AccountCategory["children"]) => {
    for (const item of items) {
      names.add(item.account);
      visit(item.children);
    }
  };
  visit(nodes);
  return names;
}

/**
 * Trial-balance trees omit zero-balance leaves. Merge ledger metadata names back
 * in so a newly opened account is visible before its first transaction.
 */
function appendZeroBalanceAccounts(
  category: AccountCategory,
  accountNames: readonly string[],
): AccountCategory {
  const root = category.account || ROOT_PREFIX[category.key];
  const existing = collectAccountNames(category.children);
  const renderedAccounts = Array.from(existing);
  const missing = accountNames
    .filter(
      (account) =>
        account.startsWith(`${root}:`) &&
        !renderedAccounts.some(
          (rendered) =>
            rendered === account || rendered.startsWith(`${account}:`),
        ),
    )
    .map((account) => ({
      account,
      name: account.slice(root.length + 1),
      value: 0,
      children: [],
    }));

  return missing.length > 0
    ? {
        ...category,
        account: root,
        children: [...category.children, ...missing],
      }
    : category;
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
 * Income negative — so the five sum to zero and the tab agrees with the web
 * dashboard. A category the ledger doesn't use (zero total, no rows) is omitted.
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
    const root = trialBalance[ROOT_FIELD[key]] as TrialBalanceRoot | undefined;
    return appendZeroBalanceAccounts(
      {
        key,
        account: root?.account ?? "",
        value: resolveCurrencyBalance(root?.balanceChildren, currency),
        children: selectAccountTreeFromRoot(currency, root),
      },
      accountNames,
    );
  }).filter((category) => category.value !== 0 || category.children.length > 0);
}

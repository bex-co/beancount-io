import { LedgerMeta } from "@/generated-graphql/graphql";
import { SEGMENT_SEPARATOR } from "./account-util";

export interface AccountSection {
  /** Root account type — `Assets` for `Assets:Bank:Checking`. */
  title: string;
  /** Accounts under that root, in the order the caller supplied them. */
  data: string[];
}

export function getAccountsAndCurrency(data: LedgerMeta | undefined) {
  let assets: string[] = [];
  let expenses: string[] = [];
  let currencies: string[] = [];

  if (data) {
    const assetsName = data.options.name_assets;
    const expensesName = data.options.name_expenses;
    const incomeName = data.options.name_income;
    const liabilityName = data.options.name_liabilities;
    const equity = data.options.name_equity;

    // Factory function to create order getter with custom ordering
    const createOrderGetter = (orderMap: Record<string, number>) => {
      return (name: string): number => {
        for (const [accountType, order] of Object.entries(orderMap)) {
          if (name.startsWith(accountType)) {
            return order;
          }
        }
        return 5; // Default order for unknown types
      };
    };

    // Order for "from" accounts (sources of funds)
    const fromOrderMap: Record<string, number> = {
      [assetsName]: 0,
      [liabilityName]: 1,
      [incomeName]: 2,
      [expensesName]: 3,
      [equity]: 4,
    };

    // Order for "to" accounts (destinations of funds)
    const toOrderMap: Record<string, number> = {
      [expensesName]: 0,
      [assetsName]: 1,
      [incomeName]: 2,
      [liabilityName]: 3,
      [equity]: 4,
    };

    const getFromOrder = createOrderGetter(fromOrderMap);
    const getToOrder = createOrderGetter(toOrderMap);

    const fromInOrder = (a: string, b: string) =>
      getFromOrder(a) - getFromOrder(b);
    const toInOrder = (a: string, b: string) => getToOrder(a) - getToOrder(b);

    assets = [...data.accounts].sort(fromInOrder);
    expenses = [...data.accounts].sort(toInOrder);
    currencies = data.options.operating_currency;
  }
  return { assets, expenses, currencies };
}

/**
 * Group accounts by root segment for a SectionList, preserving the caller's
 * ordering both across roots (first seen wins) and within each root.
 */
export function groupAccountsByRoot(accounts: string[]): AccountSection[] {
  const sections: AccountSection[] = [];
  for (const account of accounts) {
    const title = account.split(SEGMENT_SEPARATOR)[0];
    const section = sections.find((candidate) => candidate.title === title);
    if (section) {
      section.data.push(account);
    } else {
      sections.push({ title, data: [account] });
    }
  }
  return sections;
}

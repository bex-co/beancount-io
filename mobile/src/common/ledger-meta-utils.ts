import { LedgerMeta } from "@/generated-graphql/graphql";

export interface OptionTab {
  title: string;
  options: string[];
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

export function handleOptions(options: string[]) {
  const optionTabs: OptionTab[] = [{ title: "All", options }];
  options.forEach((val) => {
    const prefix = val.split(":")[0];
    const index = optionTabs.findIndex((opt) => opt.title === prefix);
    if (index === -1) {
      optionTabs.push({ title: prefix, options: [val] });
    } else {
      optionTabs[index].options.push(val);
    }
  });
  return optionTabs;
}

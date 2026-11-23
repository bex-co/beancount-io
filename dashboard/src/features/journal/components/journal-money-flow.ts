import type { JournalTransaction } from "@/common/types/journal";
import { makeAccountMatcher } from "@/common/lib/beancount/transaction-summary";
import { accountMatchesJournalSelection } from "../lib/derive-account-units";
import type { JournalRegister, JournalTableItem } from "./journal-register";

export type MoneyFlow = {
  accounts: string[];
  directed: boolean;
  more: number;
};

/** Names the first distinct source and destination, or lists the accounts when a direction is unavailable. */
export function moneyFlow(
  transaction: JournalTransaction,
  scope?: {
    accountFilter: string;
    change: number | undefined;
    register?: JournalRegister;
    registerChange?: JournalTableItem["change"];
  },
): MoneyFlow | null {
  const postings = transaction.postings ?? [];
  const touched = [...new Set(postings.map((posting) => posting.account))];
  if (touched.length === 0) return null;
  const show = (accounts: string[], directed = false): MoneyFlow => ({
    accounts,
    directed,
    more: touched.length - accounts.length,
  });
  if (touched.length === 1) return show(touched);

  const from = new Set<string>();
  const to = new Set<string>();
  for (const posting of postings) {
    const side = Number(posting.units?.number) < 0 ? from : to;
    side.add(posting.account);
  }

  if (scope?.register || scope?.accountFilter) {
    const { register } = scope;
    const matches = register
      ? (account: string) =>
          accountMatchesJournalSelection(
            account,
            register.account,
            register.withChildren,
          )
      : makeAccountMatcher(scope.accountFilter);
    const selected = touched.find(matches);
    const outside = touched.find((account) => !matches(account));
    if (selected && outside) {
      // Follow the first displayed change when the row holds multiple units.
      const change =
        register && scope.registerChange
          ? Object.values(scope.registerChange)
              .map(Number)
              .find((value) => value > 0 || value < 0)
          : scope.change;
      if (change) {
        const incoming = change > 0;
        const scopedSide = incoming ? to : from;
        const otherSide = incoming ? from : to;
        const scopedAccount = [...scopedSide].find(matches);
        const other = [...otherSide].find((account) => !matches(account));
        if (scopedAccount && other) {
          return show(
            incoming ? [other, scopedAccount] : [scopedAccount, other],
            true,
          );
        }
      }
      return show([selected, outside]);
    }
  }

  const [firstFrom] = from;
  const toAccount = [...to].find((account) => account !== firstFrom);
  if (firstFrom && toAccount) return show([firstFrom, toAccount], true);
  const [firstTo] = to;
  const fromAccount = [...from].find((account) => account !== firstTo);
  if (fromAccount && firstTo) return show([fromAccount, firstTo], true);
  return show(touched.slice(0, 2));
}

/**
 * The shortest suffix that distinguishes each account in this group.
 * Compare paths at the same depth so every colliding leaf is qualified.
 */
export function shortAccountNames(accounts: readonly string[]): string[] {
  const paths = accounts.map((account) => account.split(":"));
  return paths.map((path, index) => {
    const account = accounts[index];
    for (let count = 1; count < path.length; count++) {
      const suffix = path.slice(-count).join(":");
      const matchesAnother = paths.some(
        (other, otherIndex) =>
          accounts[otherIndex] !== account &&
          other.slice(-count).join(":") === suffix,
      );
      if (!matchesAnother) return suffix;
    }
    return account;
  });
}

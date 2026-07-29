import type { GetLedgerQuery } from "@/graphql/definitions";

export function getAccountJournalWithChildren(
  ledgerData: GetLedgerQuery["getLedger"] | null | undefined,
): boolean {
  return ledgerData?.favaOptions?.accountJournalIncludeChildren ?? true;
}

export function getShowAccountsWithZeroBalance(
  ledgerData: GetLedgerQuery["getLedger"] | null | undefined,
): boolean {
  return ledgerData?.favaOptions?.showAccountsWithZeroBalance ?? true;
}

export function getShowAccountsWithZeroTransactions(
  ledgerData: GetLedgerQuery["getLedger"] | null | undefined,
): boolean {
  return ledgerData?.favaOptions?.showAccountsWithZeroTransactions ?? true;
}

export function getInvertIncomeLiabilitiesEquity(
  ledgerData: GetLedgerQuery["getLedger"] | null | undefined,
): boolean {
  return ledgerData?.favaOptions?.invertIncomeLiabilitiesEquity ?? false;
}

export function getCollapsePatterns(
  ledgerData: GetLedgerQuery["getLedger"] | null | undefined,
): string[] {
  return ledgerData?.favaOptions?.collapsePattern ?? [];
}

export function getShowClosedAccounts(
  ledgerData: GetLedgerQuery["getLedger"] | null | undefined,
): boolean {
  return ledgerData?.favaOptions?.showClosedAccounts ?? false;
}

export function getUpcomingEventsDays(
  ledgerData: GetLedgerQuery["getLedger"] | null | undefined,
): number {
  return ledgerData?.favaOptions?.upcomingEvents ?? 7;
}

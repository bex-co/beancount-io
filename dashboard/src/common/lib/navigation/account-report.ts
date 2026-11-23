/** Linkable account reports include the ledger's accounts and their ancestors. */
export function accountReportPredicate(accounts: readonly string[] = []) {
  const names = new Set(accounts);
  for (const account of accounts) {
    for (
      let end = account.lastIndexOf(":");
      end > 0;
      end = account.lastIndexOf(":", end - 1)
    ) {
      names.add(account.slice(0, end));
    }
  }
  return (account: string) => names.has(account);
}

/**
 * The line the Budget panel shows when there are no budgets: a guest is asked to
 * sign in, a writer to set a target, and a reader of someone's ledger is told
 * what is so, with nothing to tap (w21/868).
 */
export function budgetPanelEmptyKey(
  guest: boolean,
  canWrite: boolean,
): "budgetPanelEmptyGuest" | "budgetPanelEmpty" | "budgetPanelEmptyReader" {
  if (guest) return "budgetPanelEmptyGuest";
  return canWrite ? "budgetPanelEmpty" : "budgetPanelEmptyReader";
}

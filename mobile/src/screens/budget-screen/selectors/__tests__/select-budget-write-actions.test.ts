import { selectBudgetEntryActions } from "../select-budget-write-actions";

describe("selectBudgetEntryActions", () => {
  test("should offer delete to a collaborator with write access", () => {
    expect(selectBudgetEntryActions(true, false)).toEqual({
      showDelete: true,
      deleteDisabled: false,
    });
  });

  test("should hide delete from a read-only collaborator", () => {
    expect(selectBudgetEntryActions(false, false)).toEqual({
      showDelete: false,
      deleteDisabled: true,
    });
  });

  test("should hide delete while access is still unresolved", () => {
    // `useLedgerAccess` reports canWrite false until the ledger's permissions
    // come back, so the trash cannot flash enabled during the load.
    expect(selectBudgetEntryActions(false, false).showDelete).toBe(false);
  });

  test("should disable a writer's delete while one is in flight", () => {
    expect(selectBudgetEntryActions(true, true)).toEqual({
      showDelete: true,
      deleteDisabled: true,
    });
  });
});

import { PlaidAccountPostgresModel } from "../plaid-account-model/postgres-impl";
import { PlaidItemPostgresModel } from "../plaid-item-model/postgres-impl";
import { PlaidTransactionPostgresModel } from "../plaid-transaction-model/postgres-impl";

function mutationDb() {
  const returning = jest.fn();
  const where = jest.fn(() => ({ returning }));
  const set = jest.fn(() => ({ where }));
  return {
    returning,
    where,
    set,
    db: {
      update: jest.fn(() => ({ set })),
      delete: jest.fn(() => ({ where })),
    } as never,
  };
}

describe("Plaid bound mutation models", () => {
  it("requires item id, user id, and ledger id for an item update", async () => {
    const query = mutationDb();
    query.returning.mockResolvedValue([{ id: "pitm_1" }]);

    await expect(
      new PlaidItemPostgresModel().updateForBinding(
        query.db,
        "pitm_1",
        { userId: "usr_1", ledgerRepoId: 42 },
        { status: "active" },
      ),
    ).resolves.toBe(true);

    expect(query.where).toHaveBeenCalledTimes(1);
    expect(query.returning).toHaveBeenCalledTimes(1);
  });

  it("reports a stale item/user/ledger delete predicate instead of succeeding", async () => {
    const query = mutationDb();
    query.returning.mockResolvedValue([]);

    await expect(
      new PlaidItemPostgresModel().deleteForBinding(query.db, "pitm_1", {
        userId: "usr_other",
        ledgerRepoId: 99,
      }),
    ).resolves.toBe(false);
  });

  it("binds account updates and deletes to their parent item", async () => {
    const update = mutationDb();
    update.returning.mockResolvedValue([{ id: "pacc_1" }]);
    const remove = mutationDb();
    remove.returning.mockResolvedValue([]);
    const model = new PlaidAccountPostgresModel();

    await expect(
      model.updateForItem(update.db, "pacc_1", "pitm_1", {
        ledgerAccount: "Assets:Bank",
      }),
    ).resolves.toBe(true);
    await expect(
      model.deleteForItem(remove.db, "pacc_1", "pitm_other"),
    ).resolves.toBe(false);
  });

  it("binds transaction updates, deletes, and batches to authorized accounts", async () => {
    const update = mutationDb();
    update.returning.mockResolvedValue([{ id: "ptxn_1" }]);
    const remove = mutationDb();
    remove.returning.mockResolvedValue([{ id: "ptxn_1" }]);
    const markBatch = mutationDb();
    markBatch.returning.mockResolvedValue([{ id: "ptxn_1" }]);
    const deleteBatch = mutationDb();
    deleteBatch.returning.mockResolvedValue([]);
    const model = new PlaidTransactionPostgresModel();

    await expect(
      model.updateForAccount(update.db, "ptxn_1", "pacc_1", {
        name: "Updated",
      }),
    ).resolves.toBe(true);
    await expect(
      model.deleteForAccount(remove.db, "ptxn_1", "pacc_1"),
    ).resolves.toBe(true);
    await expect(
      model.markAsSyncedForAccounts(
        markBatch.db,
        ["ptxn_1", "ptxn_other"],
        ["pacc_1"],
        "hash",
      ),
    ).resolves.toBe(1);
    await expect(
      model.deleteManyForAccounts(deleteBatch.db, ["ptxn_1"], ["pacc_other"]),
    ).resolves.toBe(0);
  });

  it("does not issue an unbounded transaction batch when either id set is empty", async () => {
    const query = mutationDb();
    const model = new PlaidTransactionPostgresModel();

    await expect(
      model.markAsSyncedForAccounts(query.db, [], ["pacc_1"], "hash"),
    ).resolves.toBe(0);
    await expect(
      model.deleteManyForAccounts(query.db, ["ptxn_1"], []),
    ).resolves.toBe(0);
    expect(
      (query.db as never as { update: jest.Mock }).update,
    ).not.toHaveBeenCalled();
    expect(
      (query.db as never as { delete: jest.Mock }).delete,
    ).not.toHaveBeenCalled();
  });
});

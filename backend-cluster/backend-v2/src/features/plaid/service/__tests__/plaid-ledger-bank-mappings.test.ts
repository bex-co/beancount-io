import { PlaidLedgerBankMappings } from "../plaid-ledger-bank-mappings";
import type { Identity } from "@/server/api/identity";

/** w1/m43/t003 — every member's mappings on the ledger, named only for their owner. */

const ALICE: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.write"]),
};

function fixture() {
  const items = [
    { id: "pi_alice", userId: "usr_alice", institutionName: "Chase" },
    { id: "pi_bob", userId: "usr_bob", institutionName: "Wells" },
  ];
  const accounts: Record<string, unknown[]> = {
    pi_alice: [
      {
        id: "pacc_a1",
        accountName: "Checking",
        mask: "1234",
        ledgerAccount: "Assets:Bank:Checking",
      },
      {
        id: "pacc_a2",
        accountName: "Savings",
        mask: undefined,
        ledgerAccount: undefined,
      },
    ],
    pi_bob: [
      {
        id: "pacc_b1",
        accountName: "Joint",
        mask: "9876",
        ledgerAccount: "Assets:Bank:Checking:Joint",
      },
    ],
  };
  const updates: unknown[] = [];
  const models = {
    plaidItem: {
      getByLedgerRepoId: jest.fn(async (_db: unknown, repoId: number) =>
        repoId === 42 ? items : [],
      ),
    },
    plaidAccount: {
      getByItemId: jest.fn(
        async (_db: unknown, itemId: string) => accounts[itemId] ?? [],
      ),
      updateForItem: jest.fn(async (_db: unknown, ...args: unknown[]) => {
        updates.push(args);
        return true;
      }),
    },
  };
  const db = {
    transaction: jest.fn(async (run: (tx: unknown) => Promise<void>) =>
      run("tx"),
    ),
  };
  const favaClientFactory = {
    getPublicApiClient: jest.fn(async () => ({
      ledgers: {
        getLedger: jest.fn(async () => ({
          data: { success: true, data: { id: 42 } },
        })),
      },
    })),
  };
  const mappings = new PlaidLedgerBankMappings(
    favaClientFactory as never,
    models as never,
    db as never,
  );
  return { mappings, models, db, updates };
}

describe("PlaidLedgerBankMappings", () => {
  it("lists every member's mapped accounts on the ledger, naming only the caller's", async () => {
    const { mappings } = fixture();
    await expect(
      mappings.list({ ledgerId: "alice/main", identity: ALICE }),
    ).resolves.toEqual([
      {
        id: "pacc_a1",
        plaidItemId: "pi_alice",
        ledgerAccount: "Assets:Bank:Checking",
        name: "Chase Checking ••1234",
      },
      {
        id: "pacc_b1",
        plaidItemId: "pi_bob",
        ledgerAccount: "Assets:Bank:Checking:Joint",
        name: null,
      },
    ]);
  });

  it("updates every mapping in one transaction", async () => {
    const { mappings, db, updates } = fixture();
    await mappings.remap([
      {
        id: "pacc_a1",
        plaidItemId: "pi_alice",
        ledgerAccount: "Assets:Bank:Main",
      },
      {
        id: "pacc_b1",
        plaidItemId: "pi_bob",
        ledgerAccount: "Assets:Bank:Main:Joint",
      },
    ]);
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(updates).toEqual([
      ["pacc_a1", "pi_alice", { ledgerAccount: "Assets:Bank:Main" }],
      ["pacc_b1", "pi_bob", { ledgerAccount: "Assets:Bank:Main:Joint" }],
    ]);
  });
});

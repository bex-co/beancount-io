import "reflect-metadata";

jest.mock("@/shared/logger", () => ({
  logger: {
    child: () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }),
  },
}));
jest.mock("@/features/ledger/utils/authorize-ledger", () => ({
  authorizeLedger: jest.fn().mockResolvedValue({ ledgerRepoId: 42 }),
}));
jest.mock("../../utils/encryption", () => ({
  decryptToken: () => "access-token",
  encryptToken: (t: string) => t,
}));

import { PlaidItemService } from "../plaid-item-service";
import type { Identity } from "@/server/api/identity";

const identity: Identity = {
  userId: "usr_1",
  method: "oauth",
  scopes: new Set(["ledger.admin"]),
  tokenId: "tok_1",
};

/**
 * w3/m8 — `dry_run` promises that nothing changes.
 *
 * A preview that quietly wrote would keep every wire-level test green while
 * severing a customer's bank connection, so the assertion here is on the
 * mutating collaborators: they must not be touched at all. Asserting the
 * *return value* would not catch it — a write followed by a preview-shaped
 * response looks identical from outside.
 */
describe("unlink dry_run changes nothing", () => {
  const item = {
    id: "pitm_1",
    itemId: "item_1",
    userId: "usr_1",
    ledgerRepoId: 42,
    institutionName: "Test Bank",
    accessToken: "enc",
    status: "active",
  };

  function build() {
    const plaidItem = {
      getById: jest.fn().mockResolvedValue(item),
      delete: jest.fn(),
    };
    const plaidAccount = {
      getByItemId: jest.fn().mockResolvedValue([
        {
          id: "pacc_1",
          accountName: "Checking",
          ledgerAccount: "Assets:Bank",
        },
      ]),
    };
    const plaidClient = { removeItem: jest.fn() };
    const service = new PlaidItemService(
      plaidClient as never,
      {} as never,
      { plaidItem, plaidAccount } as never,
      {} as never,
      {} as never,
      {
        authorizeOrThrow: jest.fn().mockResolvedValue({ allowed: true }),
      } as never,
    );
    return { service, plaidItem, plaidClient };
  }

  it("neither deletes the item nor tells the bank to remove it", async () => {
    const { service, plaidItem, plaidClient } = build();

    const result = await service.unlinkItem(
      identity,
      "pitm_1",
      "alice/main",
      true,
    );

    expect(plaidItem.delete).not.toHaveBeenCalled();
    expect(plaidClient.removeItem).not.toHaveBeenCalled();
    expect(result).toMatchObject({ dryRun: true, wouldUnlink: true });
  });

  it("reports the blast radius it would have caused", async () => {
    const { service } = build();

    const result = await service.unlinkItem(
      identity,
      "pitm_1",
      "alice/main",
      true,
    );

    expect(result).toMatchObject({
      institutionName: "Test Bank",
      accountsSevered: 1,
    });
  });

  it("without the flag it really does unlink — the preview is not the default", async () => {
    const { service, plaidItem, plaidClient } = build();

    await service.unlinkItem(identity, "pitm_1", "alice/main");

    expect(plaidItem.delete).toHaveBeenCalledWith(expect.anything(), "pitm_1");
    expect(plaidClient.removeItem).toHaveBeenCalled();
  });

  /**
   * A preview must still refuse what the real call would refuse, or it becomes
   * a way to probe other people's ledgers.
   */
  it("still refuses an item that belongs to another ledger", async () => {
    const { service, plaidItem } = build();
    plaidItem.getById.mockResolvedValue({ ...item, ledgerRepoId: 999 });

    await expect(
      service.unlinkItem(identity, "pitm_1", "alice/main", true),
    ).rejects.toThrow(/Unauthorized/);
  });
});

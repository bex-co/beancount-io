import { reconcileAccounts } from "../reconcile-accounts";
import { BadUserInputError } from "@/shared/errors";

const mockPlaidAccountModel = {
  getByItemId: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
};

const mockDb: any = {
  transaction: jest.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
    cb(mockDb),
  ),
};

const mockPlaidClient = {
  getAccounts: jest.fn(),
};

function deps() {
  return {
    plaidClient: mockPlaidClient as any,
    models: { plaidAccount: mockPlaidAccountModel } as any,
    db: mockDb,
  };
}

function remote(accountId: string) {
  return {
    accountId,
    name: `Account ${accountId}`,
    type: "depository",
    subtype: "checking",
    mask: "0000",
  };
}

function local(accountId: string) {
  const now = new Date();
  return {
    id: `pacc_${accountId}`,
    plaidItemId: "pitm_1",
    accountId,
    accountName: `Account ${accountId}`,
    accountType: "depository",
    accountSubtype: "checking",
    mask: "0000",
    ledgerAccount: "Assets:Checking",
    currency: "USD",
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };
}

const params = {
  itemId: "pitm_1",
  accessToken: "access-token",
};

describe("reconcileAccounts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.transaction.mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>) => cb(mockDb),
    );
    mockPlaidAccountModel.create.mockImplementation(
      async (_db: unknown, input: { accountId: string }) =>
        local(input.accountId),
    );
  });

  it("creates rows for accounts Plaid newly shares", async () => {
    mockPlaidClient.getAccounts.mockResolvedValue([
      remote("acc_1"),
      remote("acc_2"),
    ]);
    mockPlaidAccountModel.getByItemId.mockResolvedValue([local("acc_1")]);

    const result = await reconcileAccounts(deps(), {
      ...params,
      allowDeletes: true,
    });

    expect(mockPlaidAccountModel.create).toHaveBeenCalledTimes(1);
    expect(mockPlaidAccountModel.create).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({ plaidItemId: "pitm_1", accountId: "acc_2" }),
    );
    expect(result.addedAccounts).toHaveLength(1);
    expect(result.removedCount).toBe(0);
  });

  it("deletes accounts Plaid no longer shares when deletes are allowed", async () => {
    mockPlaidClient.getAccounts.mockResolvedValue([remote("acc_1")]);
    mockPlaidAccountModel.getByItemId.mockResolvedValue([
      local("acc_1"),
      local("acc_2"),
    ]);

    const result = await reconcileAccounts(deps(), {
      ...params,
      allowDeletes: true,
    });

    expect(mockPlaidAccountModel.delete).toHaveBeenCalledTimes(1);
    expect(mockPlaidAccountModel.delete).toHaveBeenCalledWith(
      mockDb,
      "pacc_acc_2",
    );
    expect(result.removedCount).toBe(1);
    expect(result.staleCount).toBe(1);
  });

  it("never deletes when deletes are not allowed, but still reports staleness", async () => {
    mockPlaidClient.getAccounts.mockResolvedValue([remote("acc_1")]);
    mockPlaidAccountModel.getByItemId.mockResolvedValue([
      local("acc_1"),
      local("acc_2"),
    ]);

    const result = await reconcileAccounts(deps(), {
      ...params,
      allowDeletes: false,
    });

    expect(mockPlaidAccountModel.delete).not.toHaveBeenCalled();
    expect(result.removedCount).toBe(0);
    expect(result.staleCount).toBe(1);
  });

  it("still adds accounts when deletes are not allowed", async () => {
    mockPlaidClient.getAccounts.mockResolvedValue([
      remote("acc_1"),
      remote("acc_2"),
    ]);
    mockPlaidAccountModel.getByItemId.mockResolvedValue([local("acc_1")]);

    const result = await reconcileAccounts(deps(), {
      ...params,
      allowDeletes: false,
    });

    expect(mockPlaidAccountModel.create).toHaveBeenCalledTimes(1);
    expect(mockPlaidAccountModel.delete).not.toHaveBeenCalled();
    expect(result.addedAccounts).toHaveLength(1);
  });

  it("writes nothing when both sides already agree", async () => {
    mockPlaidClient.getAccounts.mockResolvedValue([remote("acc_1")]);
    mockPlaidAccountModel.getByItemId.mockResolvedValue([local("acc_1")]);

    const result = await reconcileAccounts(deps(), {
      ...params,
      allowDeletes: true,
    });

    expect(mockDb.transaction).not.toHaveBeenCalled();
    expect(mockPlaidAccountModel.create).not.toHaveBeenCalled();
    expect(mockPlaidAccountModel.delete).not.toHaveBeenCalled();
    expect(result).toEqual({
      addedAccounts: [],
      removedCount: 0,
      staleCount: 0,
    });
  });

  it("refuses to touch anything when Plaid returns no accounts at all", async () => {
    mockPlaidClient.getAccounts.mockResolvedValue([]);
    mockPlaidAccountModel.getByItemId.mockResolvedValue([
      local("acc_1"),
      local("acc_2"),
    ]);

    await expect(
      reconcileAccounts(deps(), { ...params, allowDeletes: true }),
    ).rejects.toThrow(BadUserInputError);

    expect(mockPlaidAccountModel.delete).not.toHaveBeenCalled();
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it("allows an empty response when nothing is stored yet", async () => {
    mockPlaidClient.getAccounts.mockResolvedValue([]);
    mockPlaidAccountModel.getByItemId.mockResolvedValue([]);

    const result = await reconcileAccounts(deps(), {
      ...params,
      allowDeletes: true,
    });

    expect(result.addedAccounts).toEqual([]);
    expect(result.removedCount).toBe(0);
  });

  it("skips a colliding account id instead of aborting the whole reconcile", async () => {
    mockPlaidClient.getAccounts.mockResolvedValue([
      remote("acc_1"),
      remote("acc_2"),
    ]);
    mockPlaidAccountModel.getByItemId.mockResolvedValue([]);
    mockPlaidAccountModel.create
      .mockRejectedValueOnce(Object.assign(new Error("duplicate"), {
        code: "23505",
      }))
      .mockImplementationOnce(async (_db: unknown, input: { accountId: string }) =>
        local(input.accountId),
      );

    const result = await reconcileAccounts(deps(), {
      ...params,
      allowDeletes: true,
    });

    expect(result.addedAccounts).toHaveLength(1);
    expect(result.addedAccounts[0].accountId).toBe("acc_2");
  });

  it("propagates a non-unique-violation write failure", async () => {
    mockPlaidClient.getAccounts.mockResolvedValue([remote("acc_1")]);
    mockPlaidAccountModel.getByItemId.mockResolvedValue([]);
    mockPlaidAccountModel.create.mockRejectedValue(new Error("connection lost"));

    await expect(
      reconcileAccounts(deps(), { ...params, allowDeletes: true }),
    ).rejects.toThrow("connection lost");
  });
});

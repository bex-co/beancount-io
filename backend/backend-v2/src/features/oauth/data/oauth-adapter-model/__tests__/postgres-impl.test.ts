import {
  PostgresAdapter,
  createPostgresAdapterFactory,
  deleteExpiredOauthAdapterRecords,
} from "../postgres-impl";

const mockDb = {
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue([]),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
} as any;

describe("PostgresAdapter", () => {
  let adapter: PostgresAdapter;

  beforeEach(() => {
    adapter = new PostgresAdapter(mockDb, "AccessToken");
    jest.clearAllMocks();
    mockDb.limit.mockResolvedValue([]);
  });

  describe("upsert", () => {
    it("sets an expiresAt in the future when expiresIn is given", async () => {
      await adapter.upsert(
        "tok_1",
        { grantId: "grant_1", uid: "uid_1", userCode: "code_1" },
        3600,
      );

      expect(mockDb.insert).toHaveBeenCalled();
      const values = mockDb.values.mock.calls[0][0];
      expect(values.model).toBe("AccessToken");
      expect(values.id).toBe("tok_1");
      expect(values.grantId).toBe("grant_1");
      expect(values.uid).toBe("uid_1");
      expect(values.userCode).toBe("code_1");
      expect(values.expiresAt).toBeInstanceOf(Date);
      expect(values.expiresAt.getTime()).toBeGreaterThan(Date.now());

      expect(mockDb.onConflictDoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.any(Array),
          set: expect.objectContaining({ expiresAt: values.expiresAt }),
        }),
      );
    });

    it("stores a null expiresAt when expiresIn is falsy (no TTL)", async () => {
      await adapter.upsert("client_1", {}, 0);

      const values = mockDb.values.mock.calls[0][0];
      expect(values.expiresAt).toBeNull();
      expect(values.grantId).toBeNull();
      expect(values.uid).toBeNull();
      expect(values.userCode).toBeNull();
    });
  });

  describe("find", () => {
    it("returns the payload when a row is found", async () => {
      const payload = { accountId: "acc_1" };
      mockDb.limit.mockResolvedValue([{ payload }]);

      const result = await adapter.find("tok_1");

      expect(result).toBe(payload);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });

    it("returns undefined when no row is found (missing or expired)", async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await adapter.find("missing");

      expect(result).toBeUndefined();
    });
  });

  describe("findByUserCode / findByUid", () => {
    it("returns the payload for findByUserCode", async () => {
      const payload = { userCode: "code_1" };
      mockDb.limit.mockResolvedValue([{ payload }]);

      const result = await adapter.findByUserCode("code_1");

      expect(result).toBe(payload);
    });

    it("returns the payload for findByUid", async () => {
      const payload = { uid: "uid_1" };
      mockDb.limit.mockResolvedValue([{ payload }]);

      const result = await adapter.findByUid("uid_1");

      expect(result).toBe(payload);
    });
  });

  describe("consume", () => {
    it("issues an atomic update without reading the row first", async () => {
      await adapter.consume("tok_1");

      expect(mockDb.select).not.toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe("destroy", () => {
    it("deletes the row scoped by model and id", async () => {
      await adapter.destroy("tok_1");

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe("revokeByGrantId", () => {
    it("deletes rows scoped by model and grantId", async () => {
      await adapter.revokeByGrantId("grant_1");

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });
  });
});

describe("createPostgresAdapterFactory", () => {
  it("builds a PostgresAdapter bound to the given db and model name", () => {
    const factory = createPostgresAdapterFactory(mockDb);
    const adapter = factory("Session") as PostgresAdapter;

    expect(adapter).toBeInstanceOf(PostgresAdapter);
    expect(adapter.model).toBe("Session");
  });
});

describe("deleteExpiredOauthAdapterRecords", () => {
  it("deletes rows past their expiry", async () => {
    await deleteExpiredOauthAdapterRecords(mockDb);

    expect(mockDb.delete).toHaveBeenCalled();
    expect(mockDb.where).toHaveBeenCalled();
  });
});

import { PgDialect } from "drizzle-orm/pg-core";
import { ApiKeyPostgresModel } from "../postgres-impl";

const mockDb = {
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  returning: jest.fn(),
} as any;

describe("ApiKeyPostgresModel", () => {
  beforeEach(() => jest.clearAllMocks());

  it("binds an idempotent revocation update to both key id and owner", async () => {
    const revokedAt = new Date("2026-08-29T00:00:00.000Z");
    mockDb.returning.mockResolvedValue([
      {
        id: "akey_1",
        userId: "usr_1",
        name: "CI",
        keyDigest: "digest",
        keyPrefix: "bcio_public",
        scopes: ["ledger.read"],
        ledgerScope: null,
        lastUsedAt: null,
        expiresAt: null,
        revokedAt,
        createdAt: revokedAt,
        updatedAt: revokedAt,
      },
    ]);

    await expect(
      new ApiKeyPostgresModel().revoke(
        mockDb,
        "akey_1",
        "usr_1",
        revokedAt,
      ),
    ).resolves.toMatchObject({ id: "akey_1", userId: "usr_1", revokedAt });

    const predicate = mockDb.where.mock.calls[0][0];
    const predicateQuery = new PgDialect().sqlToQuery(predicate);
    expect(predicateQuery.sql.toLowerCase()).toContain("and");
    expect(predicateQuery.params).toEqual(["akey_1", "usr_1"]);

    const update = mockDb.set.mock.calls[0][0];
    const revokedAtQuery = new PgDialect().sqlToQuery(update.revokedAt);
    expect(revokedAtQuery.sql.toLowerCase()).toContain("coalesce");
    expect(revokedAtQuery.params).toEqual([revokedAt]);
  });
});

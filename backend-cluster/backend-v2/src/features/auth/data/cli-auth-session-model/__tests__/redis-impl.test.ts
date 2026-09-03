import "reflect-metadata";
import { CliAuthSessionRedisModel } from "../redis-impl";
import type { CliAuthSession } from "../types";

/**
 * A tiny in-memory stand-in for the Redis store, because the point of these
 * tests is the three-way addressing (id, device digest, user code) rather than
 * the individual cache calls it is built from.
 */
function createFakeCache() {
  const values = new Map<string, unknown>();
  return {
    values,
    set: jest.fn(async (key: string, value: unknown) => {
      values.set(key, value);
    }),
    get: jest.fn(async (key: string) => values.get(key) ?? null),
    del: jest.fn(async (key: string) => {
      values.delete(key);
    }),
  };
}

const input = {
  deviceCodeDigest: "digest-abc",
  userCode: "BCDF-GHJK",
  client: { name: "beancount-cli", deviceLabel: "tian-mbp" },
};

describe("CliAuthSessionRedisModel", () => {
  let cache: ReturnType<typeof createFakeCache>;
  let model: CliAuthSessionRedisModel;

  beforeEach(() => {
    cache = createFakeCache();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model = new CliAuthSessionRedisModel({ cache: cache as any });
  });

  describe("createSession", () => {
    it("stores the record once and addresses it by both codes", async () => {
      const created = await model.createSession(input);

      expect(created.id).toMatch(/^clis_/);
      expect(created.status).toBe("pending");
      await expect(model.findById(created.id)).resolves.toMatchObject({
        id: created.id,
      });
      await expect(
        model.findByDeviceCodeDigest("digest-abc"),
      ).resolves.toMatchObject({ id: created.id });
      await expect(model.findByUserCode("BCDF-GHJK")).resolves.toMatchObject({
        id: created.id,
      });
    });

    it("gives each session its own id", async () => {
      const first = await model.createSession(input);
      const second = await model.createSession({
        ...input,
        userCode: "MNPQ-RSTV",
      });

      expect(first.id).not.toBe(second.id);
    });

    it("answers nothing for codes it never issued", async () => {
      await model.createSession(input);

      await expect(
        model.findByDeviceCodeDigest("digest-other"),
      ).resolves.toBeNull();
      await expect(model.findByUserCode("MNPQ-RSTV")).resolves.toBeNull();
    });
  });

  describe("authorize", () => {
    it("records the token and who approved, visible through every lookup", async () => {
      const created = await model.createSession(input);

      await model.authorize(
        created.id,
        "jwt-token",
        "2026-02-01T00:00:00.000Z",
        "user-1",
      );

      const byDevice = await model.findByDeviceCodeDigest("digest-abc");
      expect(byDevice).toMatchObject({
        status: "authorized",
        token: "jwt-token",
        approvedByUserId: "user-1",
      });
      // One record, three addresses: the browser's view cannot go stale.
      await expect(model.findByUserCode("BCDF-GHJK")).resolves.toMatchObject({
        status: "authorized",
      });
    });

    it("is a no-op for a session that has already expired out of the store", async () => {
      await expect(
        model.authorize(
          "clis_gone",
          "jwt-token",
          "2026-02-01T00:00:00.000Z",
          "user-1",
        ),
      ).resolves.toBeUndefined();
      await expect(model.findById("clis_gone")).resolves.toBeNull();
    });
  });

  describe("consume", () => {
    it("returns the token once and leaves nothing behind to redeem", async () => {
      const created = await model.createSession(input);
      await model.authorize(
        created.id,
        "jwt-token",
        "2026-02-01T00:00:00.000Z",
        "user-1",
      );

      const consumed = await model.consume(created.id);

      expect(consumed?.token).toBe("jwt-token");
      const after = (await model.findById(created.id)) as CliAuthSession;
      expect(after.status).toBe("consumed");
      expect(after.token).toBeUndefined();
      expect(after.expireAt).toBeUndefined();
    });

    it("retires the user code with the session", async () => {
      const created = await model.createSession(input);
      await model.authorize(
        created.id,
        "jwt-token",
        "2026-02-01T00:00:00.000Z",
        "user-1",
      );

      await model.consume(created.id);

      await expect(model.findByUserCode("BCDF-GHJK")).resolves.toBeNull();
    });
  });

  describe("deny", () => {
    it("marks the session denied without minting anything", async () => {
      const created = await model.createSession(input);

      await model.deny(created.id);

      const denied = await model.findByDeviceCodeDigest("digest-abc");
      expect(denied?.status).toBe("denied");
      expect(denied?.token).toBeUndefined();
    });
  });
});

import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerPublicKeyService } from "@/features/ledger/service/ledger-public-key-service";
import { LedgerPublicKeyQueryResolver } from "@/features/ledger/api/resolvers/ledger-public-key-resolver.query";
import { LedgerPublicKeyMutationResolver } from "@/features/ledger/api/resolvers/ledger-public-key-resolver.mutation";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
  AUTHORIZATION_ACTIONS,
} from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import { NotFoundError, ConflictError } from "@/shared/errors";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.admin"]),
  tokenId: "tok_public_keys",
};
const key = {
  id: 1,
  fingerprint: "SHA256:fixture",
  key: "ssh-ed25519 fixture-public-key",
  title: "Laptop café",
  created_at: "2026-09-01",
  last_used_at: "2026-09-02",
};
const expected = {
  id: 1,
  fingerprint: key.fingerprint,
  key: key.key,
  title: key.title,
  createdAt: key.created_at,
  lastUsedAt: key.last_used_at,
};
const fields = "id fingerprint key title createdAt lastUsedAt";
const envelope = (data: unknown) => ({ data: { success: true, data } });
let resolvers: Map<unknown, object>;
let schemaPromise: ReturnType<typeof buildSchema> | undefined;
// MCP withholds SSH-key management by directory policy (ADR 019, 2026-10-09
// amendment); `mcp-tool-list.test.ts` proves it.
type Surface = "rest" | "gql";
const surfaces: Surface[] = ["rest", "gql"];
async function fixture(caller = identity) {
  const records = new Map([
    [1, { ...key, owner: "usr_alice", readOnly: false }],
    [2, { ...key, id: 2, owner: "usr_bob", readOnly: true }],
  ]);
  let nextId = 3;
  const getRecord = (userId: string, keyId: number) => {
    const record = records.get(keyId);
    if (!record || record.owner !== userId)
      throw new NotFoundError("Public key", String(keyId));
    return record;
  };
  const list = jest.fn(
    async (userId: string, opts: { page?: number; limit?: number }) => {
      const all = [...records.values()].filter((r) => r.owner === userId);
      const page = opts.page ?? 1,
        limit = opts.limit ?? 10;
      return envelope(all.slice((page - 1) * limit, page * limit));
    },
  );
  const get = jest.fn(async (userId: string, keyId: number) =>
    envelope(getRecord(userId, keyId)),
  );
  const create = jest.fn(
    async (
      userId: string,
      input: { key: string; title: string; read_only?: boolean },
    ) => {
      if ([...records.values()].some((r) => r.key === input.key))
        throw new ConflictError("Public key", "Key already exists");
      const record = {
        ...key,
        id: nextId++,
        key: input.key,
        title: input.title,
        owner: userId,
        readOnly: input.read_only ?? false,
      };
      records.set(record.id, record);
      return envelope(record);
    },
  );
  const remove = jest.fn(async (userId: string, keyId: number) => {
    getRecord(userId, keyId);
    records.delete(keyId);
    return envelope(null);
  });
  const getApiContext = jest.fn(async (userId: string) => ({
    favaApiClient: {
      keys: {
        listPublicKeys: (opts: { page?: number; limit?: number }) =>
          list(userId, opts),
        getPublicKey: (keyId: number) => get(userId, keyId),
        createPublicKey: (input: {
          key: string;
          title: string;
          read_only?: boolean;
        }) => create(userId, input),
        deletePublicKey: (keyId: number) => remove(userId, keyId),
      },
    },
  }));
  const evaluator = new SourceBackedRelationshipEvaluator(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  const authorization = new AuthorizationService(evaluator, jest.fn());
  const authorize = jest.spyOn(authorization, "authorizeOrThrow");
  const service = new LedgerPublicKeyService(
    { getApiContext } as never,
    authorization,
  );
  resolvers = new Map<unknown, object>([
    [LedgerPublicKeyQueryResolver, new LedgerPublicKeyQueryResolver(service)],
    [
      LedgerPublicKeyMutationResolver,
      new LedgerPublicKeyMutationResolver(service),
    ],
  ]);
  schemaPromise ??= buildSchema({
    resolvers: [LedgerPublicKeyQueryResolver, LedgerPublicKeyMutationResolver],
    container: { get: (ctor) => resolvers.get(ctor) },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
  const schema = await schemaPromise;
  const rest = await startV1TestServer(
    { services: { ledgerPublicKey: service } } as unknown as AppLayers,
    config,
    { apiKeys: false },
  );
  rest.setIdentity(caller);
  const request = (suffix = "", method = "GET", body?: unknown) =>
    fetch(`${rest.url}/api-gateway/v1/public-keys${suffix}`, {
      method,
      ...(body !== undefined && {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    });
  const gql = (source: string) =>
    graphql({
      schema,
      source,
      contextValue: { identity: caller, getCurrentIdentity: () => caller },
    });
  return {
    records,
    getApiContext,
    list,
    get,
    create,
    remove,
    authorize,
    request,
    gql,
    write: async (
      surface: Surface,
      operation: "create" | "delete",
      input: Record<string, unknown>,
    ) => {
      if (surface === "rest") {
        const r = await request(
          operation === "create" ? "" : `/${input.keyId}`,
          operation === "create" ? "POST" : "DELETE",
          operation === "create" ? input : undefined,
        );
        return { failed: !r.ok, data: await r.json() };
      }
      const field =
        operation === "create" ? "createPublicKey" : "deletePublicKey";
      const args = Object.entries(input)
        .map(([k, v]) => `${k}:${JSON.stringify(v)}`)
        .join(",");
      const r = await gql(
        `mutation{${field}(${args}){${operation === "create" ? fields : "id"}}}`,
      );
      return { failed: Boolean(r.errors), data: r.data?.[field] };
    },
    close: async () => {
      await rest.close();
    },
  };
}
describe("SSH public keys through actual adapters and exact-self authorization", () => {
  it.each([identity, { ...identity, ledgerScope: "someone/books" }])(
    "reads the caller's keys, independent of a ledger pin",
    async (caller) => {
      const f = await fixture(caller);
      try {
        expect(await (await f.request()).json()).toEqual([expected]);
        const g = await f.gql(`{listPublicKeys{${fields}}}`);
        expect(g.errors).toBeUndefined();
        expect(g.data?.listPublicKeys).toEqual([expected]);
        expect(await (await f.request("/1")).json()).toEqual(expected);
        const one = await f.gql(`{getPublicKey(keyId:1){${fields}}}`);
        expect(one.errors).toBeUndefined();
        expect(one.data?.getPublicKey).toEqual(expected);
        expect(
          f.authorize.mock.calls.every(
            ([v]) => v.resource === "user:usr_alice",
          ),
        ).toBe(true);
        expect(
          f.getApiContext.mock.calls.every(([id]) => id === "usr_alice"),
        ).toBe(true);
      } finally {
        await f.close();
      }
    },
  );
  it("preserves pagination and empty pages", async () => {
    const f = await fixture();
    try {
      expect(await (await f.request("?page=2&limit=1")).json()).toEqual([]);
      const g = await f.gql(`{listPublicKeys(page:2,limit:1){${fields}}}`);
      expect(g.errors).toBeUndefined();
      expect(g.data?.listPublicKeys).toEqual([]);
      expect(
        f.list.mock.calls.every(
          ([id, opts]) =>
            id === "usr_alice" && opts.page === 2 && opts.limit === 1,
        ),
      ).toBe(true);
    } finally {
      await f.close();
    }
  });
  it.each(surfaces)(
    "persists creation, readOnly values, uniqueness, and deletion via %s",
    async (surface) => {
      const f = await fixture({ ...identity, ledgerScope: "someone/books" });
      try {
        for (const readOnly of [undefined, false, true, null]) {
          const input = {
            key: `ssh-ed25519 fixture-${String(readOnly)}`,
            title: "CI café",
            ...(readOnly !== undefined && { readOnly }),
          };
          const result = await f.write(surface, "create", input);
          expect(result.failed).toBe(false);
          const data = result.data as { id: number };
          expect(data).toEqual({
            ...expected,
            id: data.id,
            key: input.key,
            title: input.title,
          });
          expect(f.records.get(data.id)?.readOnly).toBe(readOnly ?? false);
          expect((await f.write(surface, "create", input)).failed).toBe(true);
          expect(await f.write(surface, "delete", { keyId: data.id })).toEqual({
            failed: false,
            data: { id: data.id },
          });
          expect(f.records.has(data.id)).toBe(false);
          expect(
            (await f.write(surface, "delete", { keyId: data.id })).failed,
          ).toBe(true);
        }
        expect(new Set(f.authorize.mock.calls.map(([v]) => v.action))).toEqual(
          new Set([
            AUTHORIZATION_ACTIONS.USER_PUBLIC_KEYS_CREATE,
            AUTHORIZATION_ACTIONS.USER_PUBLIC_KEYS_DELETE,
          ]),
        );
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "denies cross-user key deletion via %s",
    async (surface) => {
      const f = await fixture();
      try {
        expect((await f.write(surface, "delete", { keyId: 2 })).failed).toBe(
          true,
        );
        expect(f.records.get(2)?.owner).toBe("usr_bob");
        expect((await f.request("/2")).status).toBe(404);
        expect(
          (await f.gql(`{getPublicKey(keyId:2){${fields}}}`)).errors,
        ).toHaveLength(1);
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "refuses every operation before upstream work without admin scope via %s",
    async (surface) => {
      const f = await fixture({
        ...identity,
        scopes: new Set(["ledger.read"]),
      });
      try {
        expect(
          (
            await f.write(surface, "create", {
              key: "ssh-ed25519 fixture-new",
              title: "new",
            })
          ).failed,
        ).toBe(true);
        expect((await f.write(surface, "delete", { keyId: 1 })).failed).toBe(
          true,
        );
        if (surface === "rest") {
          expect((await f.request()).status).toBe(403);
          expect((await f.request("/1")).status).toBe(403);
        }
        if (surface === "gql") {
          expect(
            (await f.gql(`{listPublicKeys{${fields}}}`)).errors,
          ).toHaveLength(1);
          expect(
            (await f.gql(`{getPublicKey(keyId:1){${fields}}}`)).errors,
          ).toHaveLength(1);
        }
        expect(f.getApiContext).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "refuses a non-integer or non-positive key id before upstream work via %s",
    async (surface) => {
      const f = await fixture();
      try {
        for (const keyId of [1.5, 0, -1]) {
          expect((await f.write(surface, "delete", { keyId })).failed).toBe(
            true,
          );
          if (surface === "rest")
            expect((await f.request(`/${keyId}`)).status).toBe(400);
          if (surface === "gql") {
            const g = await f.gql(`{getPublicKey(keyId:${keyId}){id}}`);
            expect(g.errors).toHaveLength(1);
          }
        }
        expect(f.records.has(1)).toBe(true);
        expect(f.get).not.toHaveBeenCalled();
        expect(f.remove).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it("rejects a caller-supplied user selector on REST without mutation", async () => {
    const f = await fixture();
    try {
      expect(
        (
          await f.request("", "POST", {
            key: "ssh-ed25519 fixture",
            title: "test",
            userId: "usr_bob",
          })
        ).status,
      ).toBe(400);
      expect(f.create).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});

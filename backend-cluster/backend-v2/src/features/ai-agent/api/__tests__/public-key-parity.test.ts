import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
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
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import { NotFoundError, ConflictError } from "@/shared/errors";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";
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
type Surface = "rest" | "mcp" | "gql";
const surfaces: Surface[] = ["rest", "mcp", "gql"];
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
  const server = assembleMcpRegistry(
    {
      identity: caller,
      publicKeyService: service,
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "public-key-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
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
  const read = async (path: string) => {
    const r = await client.readResource({ uri: `beancount://account/${path}` });
    const c = r.contents[0];
    if (!("text" in c)) throw new Error("Expected JSON");
    return JSON.parse(c.text);
  };
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
    read,
    client,
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
      if (surface === "mcp") {
        const r = await client.callTool({
          name: "managePublicKeys",
          arguments: { operation, ...input },
        });
        return {
          failed: r.isError === true,
          data: (r.structuredContent as { result?: unknown } | undefined)
            ?.result,
        };
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
      await client.close();
      await server.close();
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
        expect(await f.read("public-keys")).toEqual([expected]);
        const g = await f.gql(`{listPublicKeys{${fields}}}`);
        expect(g.errors).toBeUndefined();
        expect(g.data?.listPublicKeys).toEqual([expected]);
        expect(await (await f.request("/1")).json()).toEqual(expected);
        expect(await f.read("public-key?keyId=1")).toEqual(expected);
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
      expect(await f.read("public-keys?page=2&limit=1")).toEqual([]);
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
        await expect(f.read("public-key?keyId=2")).rejects.toThrow();
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
        if (surface === "mcp") {
          await expect(f.read("public-keys")).rejects.toThrow();
          await expect(f.read("public-key?keyId=1")).rejects.toThrow();
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
  it("rejects selectors, unknown branches, and unsupported previews without mutation", async () => {
    const f = await fixture();
    try {
      for (const args of [
        { operation: "unknown" },
        { operation: "create" },
        { operation: "delete" },
        { operation: "delete", keyId: 1, title: "extra" },
        { operation: "delete", keyId: 1, userId: "usr_bob" },
        { operation: "delete", keyId: 1, ledger: "alice/books" },
        { operation: "delete", keyId: 1, dry_run: true },
      ])
        expect(
          (
            await f.client.callTool({
              name: "managePublicKeys",
              arguments: args,
            })
          ).isError,
        ).toBe(true);
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
      expect(f.remove).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});

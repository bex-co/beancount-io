import { requestPlatform } from "@/server/api/request-platform";
import "reflect-metadata";
import { request } from "node:http";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
jest.mock("@/features/plaid/utils/encryption", () => ({
  decryptToken: () => "fixture-bank-token",
}));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { LedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import { LedgerMutationResolver } from "@/features/ledger/api/resolvers/ledger-resolver.mutation";
import { LedgerQueryResolver } from "@/features/ledger/api/resolvers/ledger-resolver.query";
import {
  defaultLedgerTemplate,
  ledgerWithMultipleFilesTemplate,
} from "@/features/ledger/utils/ledger-template";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
  AUTHORIZATION_ACTIONS,
} from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { formatError } from "@/server/graphql/format-error";
import { FavaApiError } from "@/foundation/fava";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";
const config = {
  api: { scopeEnforcement: "enforce" },
  gitea: { hostname: "example.com", externalHttpPort: 443, sshPort: 22 },
} as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.admin"]),
  tokenId: "tok_lifecycle",
};
const seed = {
  id: 42,
  name: "main",
  full_name: "alice/main",
  empty: false,
  private: true,
  size: 42,
  created_at: "2026-01-01",
  updated_at: "2026-09-01",
  description: "books",
  permissions: { admin: true, pull: true, push: true },
};
const fields =
  "id name fullName sshUrl httpUrl empty private size createdAt updatedAt description permissions{admin pull push}";
const envelope = (data: unknown) => ({ data: { success: true, data } });
let resolvers: Map<unknown, object>;
let schemaPromise: ReturnType<typeof buildSchema> | undefined;
type Surface = "rest" | "mcp" | "gql";
const surfaces: Surface[] = ["rest", "mcp", "gql"];
async function fixture(caller = identity, appId?: string) {
  const headers: Record<string, string> = appId ? { "x-app-id": appId } : {};
  const platform = requestPlatform(headers);
  const records = new Map<string, typeof seed>([["alice/main", { ...seed }]]);
  const existingContent =
    '2026-01-01 * "Existing entry"\n  Assets:Cash  25 USD\n  Equity:Initial  -25 USD\n';
  const files = new Map<string, Record<string, string>>([
    ["alice/main", { "main.bean": existingContent }],
  ]);
  let bankRows = [{ id: "fixture_item", accessToken: "fixture-encrypted" }];
  const events: string[] = [];
  const repoGet = jest.fn(async (owner: string, name: string) => {
    const r = records.get(`${owner}/${name}`);
    if (!r) throw { status: 404 };
    return { data: r };
  });
  const getUserByUsername = jest.fn(async () => ({ id: identity.userId }));
  const adminGet = jest.fn(async (owner: string, name: string) =>
    envelope(records.get(`${owner}/${name}`)),
  );
  const collaboratorPermission = jest.fn(async () =>
    envelope({ permission: null }),
  );
  const evaluator = new SourceBackedRelationshipEvaluator(
    {} as never,
    {
      user: {
        getUserByUsername,
        getById: async () => ({ ledger_username: "bob" }),
      },
    } as never,
    { getUserApiClient: async () => ({ repos: { repoGet } }) } as never,
    {
      getApiContext: async () => ({
        favaApiClient: {
          collaborators: {
            getLedgerCollaboratorPermission: collaboratorPermission,
          },
        },
      }),
      getAdminClient: () => ({
        ledgers: { getLedger: adminGet },
      }),
    } as never,
  );
  const authorization = new AuthorizationService(evaluator, jest.fn());
  const authorize = jest.spyOn(authorization, "authorizeOrThrow");
  const list = jest.fn(async () => envelope([...records.values()]));
  const create = jest.fn(
    async (input: {
      name: string;
      description?: string | null;
      private?: boolean | null;
      files: Record<string, string>;
    }) => {
      const value = {
        ...seed,
        id: 43,
        name: input.name,
        full_name: `alice/${input.name}`,
        description: input.description ?? "",
        private: input.private ?? false,
      };
      records.set(value.full_name, value);
      files.set(value.full_name, { ...input.files });
      return envelope(value);
    },
  );
  const update = jest.fn(
    async (
      owner: string,
      name: string,
      input: {
        name?: string | null;
        description?: string | null;
        private?: boolean | null;
      },
    ) => {
      const id = `${owner}/${name}`;
      const old = records.get(id)!;
      const value = {
        ...old,
        name: input.name ?? old.name,
        description: input.description ?? old.description,
        private: input.private ?? old.private,
      };
      value.full_name = `${owner}/${value.name}`;
      records.delete(id);
      records.set(value.full_name, value);
      return envelope(value);
    },
  );
  const get = jest.fn(async (owner: string, name: string) =>
    envelope(records.get(`${owner}/${name}`)),
  );
  const remove = jest.fn(async (owner: string, name: string) => {
    events.push("repository-delete");
    records.delete(`${owner}/${name}`);
    return envelope(null);
  });
  const readFile = (owner: string, name: string, path: string) => {
    const content = files.get(`${owner}/${name}`)?.[path];
    if (content === undefined) throw { status: 404 };
    return {
      name: path.split("/").at(-1),
      path,
      type: "file",
      sha: "fixture-blob",
      size: Buffer.byteLength(content),
      content: Buffer.from(content).toString("base64"),
      encoding: "base64",
    };
  };
  const ledgers = {
    listLedgers: list,
    createLedger: create,
    updateLedger: update,
    getLedger: get,
    deleteLedger: remove,
    getLedgerFile: async (
      owner: string,
      name: string,
      { path }: { path: string },
    ) => envelope(readFile(owner, name, path)),
    getLedgerFilesContent: async (
      owner: string,
      name: string,
      { files: paths }: { files: string[] },
    ) => envelope(paths.map((path) => readFile(owner, name, path))),
  };
  const getApiContext = jest.fn(async () => ({ favaApiClient: { ledgers } }));
  const getPublicApiClient = jest.fn(async () => ({ ledgers }));
  const subscriptions = jest.fn(async () => [{ status: "active" }]);
  const deleteBankRows = jest.fn(async () => {
    events.push("local-bank-delete");
    bankRows = [];
  });
  const removeItem = jest.fn(async () => {
    events.push("bank-revoke");
  });
  const db = {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const prior = bankRows;
      try {
        return await fn({});
      } catch (error) {
        bankRows = prior;
        throw error;
      }
    },
  };
  const models = {
    user: { getById: async () => ({ ledger_username: "alice" }) },
    paidCustomer: {
      findByUserIdWithActivePeriod: async () => null,
      findByUserId: async () => [],
    },
    plaidItem: {
      getByLedgerRepoId: async () => bankRows,
      deleteByLedgerRepoId: deleteBankRows,
    },
  };
  const workflow = new LedgerWorkflow(
    { getApiContext, getPublicApiClient } as never,
    {} as never,
    { removeItem } as never,
    { listSubscriptions: subscriptions } as never,
    {} as never,
    models as never,
    db as never,
    config,
    authorization,
  );
  const services = {
    ledgerRepo: new LedgerRepoService(
      { getPublicApiClient } as never,
      authorization,
    ),
  };
  resolvers = new Map<unknown, object>([
    [LedgerMutationResolver, new LedgerMutationResolver(workflow)],
    [LedgerQueryResolver, new LedgerQueryResolver(workflow)],
  ]);
  schemaPromise ??= buildSchema({
    resolvers: [LedgerMutationResolver, LedgerQueryResolver],
    container: { get: (ctor) => resolvers.get(ctor) },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
  const schema = await schemaPromise;
  const rest = await startV1TestServer(
    { workflows: { ledger: workflow }, services } as unknown as AppLayers,
    config,
    { apiKeys: false },
  );
  rest.setIdentity(caller);
  const server = assembleMcpRegistry(
    {
      identity: caller,
      platform,
      ledgerWorkflow: workflow,
      services,
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "lifecycle-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    records,
    events,
    bankRows: () => bankRows,
    create,
    update,
    remove,
    removeItem,
    get,
    subscriptions,
    deleteBankRows,
    authorize,
    getApiContext,
    getPublicApiClient,
    repoGet,
    getUserByUsername,
    adminGet,
    collaboratorPermission,
    client,
    files,
    existingContent,
    readFile: async (surface: Surface, ledgerId: string, path: string) => {
      if (surface === "rest") {
        const response = await fetch(
          `${rest.url}/api-gateway/v1/ledgers/${ledgerId}/files/${path}`,
        );
        expect(response.status).toBe(200);
        return ((await response.json()) as { content: string }).content;
      }
      if (surface === "mcp") {
        const response = await client.readResource({
          uri: `beancount://${ledgerId}/files/${path}`,
        });
        const content = response.contents[0];
        if (!("text" in content)) throw new Error("Expected file text");
        return content.text;
      }
      const response = await graphql({
        schema,
        source: `{getLedgerFile(ledgerId:${JSON.stringify(ledgerId)},path:${JSON.stringify(path)}){content encoding}}`,
        contextValue: { identity: caller },
      });
      expect(response.errors).toBeUndefined();
      const file = response.data?.getLedgerFile as {
        content: string;
        encoding: string;
      };
      return file.encoding === "base64"
        ? Buffer.from(file.content, "base64").toString("utf8")
        : file.content;
    },
    call: async (
      surface: Surface,
      operation: "create" | "read" | "update" | "delete",
      input: Record<string, unknown> = {},
      target: string | readonly [owner: string, name: string] = "alice/main",
    ) => {
      const parts =
        typeof target === "string"
          ? [
              target.slice(0, target.indexOf("/")),
              target.slice(target.indexOf("/") + 1),
            ]
          : target;
      const ledgerId = parts.join("/");
      if (surface === "rest") {
        const suffix =
          operation === "create"
            ? ""
            : `/${parts.map(encodeURIComponent).join("/")}`;
        // Send the exact path: fetch normalizes dot segments before Koa can
        // reject them, hiding the boundary behavior these tests exercise.
        return new Promise<{
          failed: boolean;
          data: unknown;
          status: number;
          error?: { code: string; message: string };
        }>((resolve, reject) => {
          const r = request(
            rest.url,
            {
              path: `/api-gateway/v1/ledgers${suffix}`,
              method: {
                create: "POST",
                read: "GET",
                update: "PUT",
                delete: "DELETE",
              }[operation],
              headers: { "Content-Type": "application/json", ...headers },
            },
            (response) => {
              let text = "";
              response.setEncoding("utf8");
              response.on("data", (chunk: string) => {
                text += chunk;
              });
              response.on("end", () => {
                const status = response.statusCode!;
                try {
                  const data = JSON.parse(text);
                  resolve({
                    failed: status >= 400,
                    data,
                    status,
                    error: data.error,
                  });
                } catch (error) {
                  reject(error);
                }
              });
            },
          );
          r.on("error", reject);
          r.end(
            operation === "create" || operation === "update"
              ? JSON.stringify(input)
              : undefined,
          );
        });
      }
      if (surface === "mcp") {
        if (operation === "read") {
          try {
            const response = await client.readResource({
              uri: `beancount://${parts.map(encodeURIComponent).join("/")}/metadata`,
            });
            const content = response.contents[0];
            if (!("text" in content)) throw new Error("Expected metadata text");
            return {
              failed: false,
              data: JSON.parse(content.text),
              error: undefined,
            };
          } catch (error) {
            const failure = error as {
              data?: { code: string; message: string };
              message: string;
            };
            return { failed: true, data: undefined, error: failure.data };
          }
        }
        const r = await client.callTool({
          name: "manageLedgers",
          arguments: {
            operation,
            ...(operation !== "create" && { ledger: ledgerId }),
            ...input,
          },
        });
        return {
          failed: r.isError === true,
          data: (r.structuredContent as { result?: unknown } | undefined)
            ?.result,
          error: (
            r.structuredContent as
              | { error?: { code: string; message: string } }
              | undefined
          )?.error,
        };
      }
      const args = { ...(operation !== "create" && { ledgerId }), ...input };
      const formatted = Object.entries(args)
        .map(
          ([k, v]) =>
            `${k}:${k === "template" && v !== null ? v : JSON.stringify(v)}`,
        )
        .join(",");
      const field = operation === "read" ? "getLedger" : `${operation}Ledger`;
      const r = await graphql({
        schema,
        source: `${operation === "read" ? "query" : "mutation"}{${field}(${formatted}){${operation === "delete" ? "ledgerId" : fields}}}`,
        contextValue: {
          identity: caller,
          getCurrentIdentity: () => caller,
          platform,
        },
      });
      const error = r.errors?.[0];
      const formattedError = error && formatError(error.toJSON(), error);
      return {
        failed: Boolean(r.errors),
        data: r.data?.[field],
        error: formattedError && {
          code: formattedError.extensions?.code,
          message: formattedError.message,
        },
      };
    },
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}
function expected(name: string, description: string, privateValue: boolean) {
  return {
    id: `alice/${name}`,
    name,
    fullName: `alice/${name}`,
    sshUrl: `ssh://git@example.com:22/alice/${name}.git`,
    httpUrl: `https://example.com/alice/${name}.git`,
    empty: false,
    private: privateValue,
    size: 42,
    createdAt: seed.created_at,
    updatedAt: seed.updated_at,
    description,
    permissions: seed.permissions,
  };
}
describe("ledger lifecycle through actual adapters and workflow", () => {
  describe.each(surfaces)("ledger denial contract via %s", (surface) => {
    it.each(["missing", "inaccessible"] as const)(
      "conceals %s ledgers identically for reads and deletion",
      async (state) => {
        const f = await fixture({ ...identity, userId: "usr_bob" });
        f.repoGet.mockRejectedValue({ status: 404 });
        if (state === "missing") {
          f.records.delete("alice/main");
          f.adminGet.mockRejectedValue(new FavaApiError("Not found", 404));
        }
        try {
          const deletion = await f.call(surface, "delete");
          const read = await f.call(surface, "read");
          for (const response of [deletion, read]) {
            expect(response.failed).toBe(true);
            expect(response.error).toMatchObject({
              code: "NOT_FOUND",
              message: "Ledger not found",
            });
            if ("status" in response) expect(response.status).toBe(404);
          }
          expect(f.get).not.toHaveBeenCalled();
          expect(f.getPublicApiClient).not.toHaveBeenCalled();
          expect(f.getApiContext).not.toHaveBeenCalled();
          expect(f.remove).not.toHaveBeenCalled();
          if (state === "inaccessible")
            expect(f.collaboratorPermission).toHaveBeenCalledWith(
              "alice",
              "main",
              "bob",
            );
        } finally {
          await f.close();
        }
      },
    );
    it("keeps credential denials distinct from missing ledgers", async () => {
      const f = await fixture({ ...identity, scopes: new Set() });
      try {
        const response = await f.call(surface, "read");
        expect(response.failed).toBe(true);
        expect(response.error?.code).toBe("FORBIDDEN");
        if ("status" in response) expect(response.status).toBe(403);
        expect(f.adminGet).not.toHaveBeenCalled();
        expect(f.get).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });
    it("keeps authorization source outages distinct from missing ledgers", async () => {
      const f = await fixture();
      f.adminGet.mockRejectedValue(new Error("source unavailable"));
      try {
        const response = await f.call(surface, "read");
        expect(response.failed).toBe(true);
        expect(response.error?.code).toBe("SERVICE_UNAVAILABLE");
        if ("status" in response) expect(response.status).toBe(503);
        expect(f.get).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });
  });
  it.each(surfaces)(
    "denies the owner a malformed privacy probe before reading ledger content via %s",
    async (surface) => {
      const f = await fixture();
      f.adminGet.mockResolvedValueOnce(envelope({ id: seed.id }));
      try {
        const response = await f.call(surface, "read");
        expect(response.failed).toBe(true);
        expect(response.error?.code).toBe("NOT_FOUND");
        if ("status" in response) expect(response.status).toBe(404);
        expect(f.authorize).toHaveBeenCalledTimes(1);
        expect(f.getUserByUsername).toHaveBeenCalledTimes(1);
        expect(f.adminGet).toHaveBeenCalledTimes(1);
        expect(f.adminGet).toHaveBeenCalledWith("alice", "main");
        expect(f.getApiContext).not.toHaveBeenCalled();
        expect(f.getPublicApiClient).not.toHaveBeenCalled();
        expect(f.get).not.toHaveBeenCalled();
        expect(f.repoGet).not.toHaveBeenCalled();
        expect(f.update).not.toHaveBeenCalled();
        expect(f.remove).not.toHaveBeenCalled();
        expect(f.records.get("alice/main")).toEqual(seed);
      } finally {
        await f.close();
      }
    },
  );
  describe.each(surfaces)("ledger slug validation via %s", (surface) => {
    it.each(["read", "update", "delete"] as const)(
      "rejects malformed targets before any upstream lookup during %s",
      async (operation) => {
        const f = await fixture();
        const names = [
          "main/branches",
          "main%2fbranches",
          "main%252fbranches",
          "main?x=1",
          "main#x",
          "..",
          "%2e%2e",
          "%252e%252e",
          "MAIN",
          "bad name",
          "a".repeat(101),
        ];
        const owners = [
          "alice/other",
          "alice%2fother",
          "alice%252fother",
          "alice?x=1",
          "alice#x",
          ".",
          "..",
          "bad owner",
          "alice\\other",
        ];
        const targets: (readonly [string, string])[] = [
          ...names.map((name) => ["alice", name] as const),
          ...owners.map((owner) => [owner, "main"] as const),
        ];
        try {
          for (const target of targets) {
            const response = await f.call(surface, operation, {}, target);
            expect(response.failed).toBe(true);
            // The MCP SDK parses a URL before template matching; a literal
            // '..' name removes its own segment and cannot match a resource.
            // Encoded percent signs above survive that normalization and
            // reach the shared slug validator instead.
            const unmatchedDotUri =
              surface === "mcp" && operation === "read" && target[1] === "..";
            expect(response.error?.code).toBe(
              surface === "rest"
                ? "VALIDATION_FAILED"
                : unmatchedDotUri
                  ? "NOT_FOUND"
                  : "BAD_USER_INPUT",
            );
            if (surface !== "mcp")
              expect(response.error?.message).toMatch(/slug/i);
            if ("status" in response) expect(response.status).toBe(400);
            expect(f.authorize).not.toHaveBeenCalled();
            expect(f.getUserByUsername).not.toHaveBeenCalled();
            expect(f.repoGet).not.toHaveBeenCalled();
            expect(f.adminGet).not.toHaveBeenCalled();
            expect(f.getApiContext).not.toHaveBeenCalled();
            expect(f.getPublicApiClient).not.toHaveBeenCalled();
            expect(f.get).not.toHaveBeenCalled();
            expect(f.update).not.toHaveBeenCalled();
            expect(f.remove).not.toHaveBeenCalled();
            expect(f.removeItem).not.toHaveBeenCalled();
          }
          expect(f.records.get("alice/main")).toEqual(seed);
        } finally {
          await f.close();
        }
      },
    );
    it("preserves accepted owner casing and punctuation", async () => {
      const f = await fixture();
      try {
        for (const owner of ["ALICE", "Alice.Smith", "User_123", "user-name"]) {
          const ledgerId = `${owner}/main`;
          f.records.set(ledgerId, { ...seed, full_name: ledgerId });
          for (const operation of ["read", "update", "delete"] as const) {
            const response = await f.call(surface, operation, {}, [
              owner,
              "main",
            ]);
            expect(response.failed).toBe(false);
            expect(response.data).toMatchObject(
              operation === "delete" ? { ledgerId } : { id: ledgerId },
            );
          }
          expect(f.records.has(ledgerId)).toBe(false);
        }
      } finally {
        await f.close();
      }
    });
  });
  it.each(surfaces)(
    "creates empty Starter books via %s and reads their contents on every surface",
    async (surface) => {
      const f = await fixture();
      try {
        for (const [name, template] of [
          ["default", undefined],
          ["nullable", null],
          ["starter", "STARTER"],
          ["sample", "SAMPLE"],
        ] as const) {
          const result = await f.call(surface, "create", {
            name,
            ...(template !== undefined && { template }),
          });
          expect(result.failed).toBe(false);
          const ledgerId = `alice/${name}`;
          const paths = Object.keys(f.files.get(ledgerId)!);
          if (template !== "SAMPLE") expect(paths).toEqual(["main.bean"]);
          for (const reader of surfaces) {
            const contents = await Promise.all(
              paths.map((path) => f.readFile(reader, ledgerId, path)),
            );
            const content = contents.join("\n");
            if (template === "SAMPLE") {
              expect(content).toMatch(/^\d{4}-\d{2}-\d{2} [*!] /m);
              expect(paths.length).toBeGreaterThan(1);
            } else {
              expect(content).toContain('option "operating_currency" "USD"');
              expect(content).toContain("1970-01-01 open Assets:Cash");
              expect(content).toContain("1970-01-01 open Equity:Initial");
              // Only account-opening directives: no transactions, balance
              // assertions, pads, or prices can introduce demonstration money.
              const directives = content
                .split("\n")
                .filter((line) => /^\d{4}-\d{2}-\d{2}\s/.test(line));
              expect(directives.length).toBeGreaterThan(20);
              expect(
                directives.every((line) => /^\S+ open \S+$/.test(line)),
              ).toBe(true);
            }
            expect(await f.readFile(reader, "alice/main", "main.bean")).toBe(
              f.existingContent,
            );
          }
        }
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "creates both templates and updates repository state via %s",
    async (surface) => {
      const f = await fixture();
      try {
        for (const template of [undefined, "SAMPLE"]) {
          const name = template ? "sample" : "starter";
          const result = await f.call(surface, "create", {
            name,
            description: "café",
            private: false,
            ...(template && { template }),
          });
          expect(result.failed).toBe(false);
          expect(result.data).toEqual(expected(name, "café", false));
          expect(f.create.mock.calls.at(-1)?.[0].files).toEqual(
            template ? ledgerWithMultipleFilesTemplate : defaultLedgerTemplate,
          );
        }
        const result = await f.call(surface, "update", {
          name: "renamed",
          description: "",
          private: false,
        });
        expect(result.failed).toBe(false);
        expect(result.data).toEqual(expected("renamed", "", false));
        expect(f.records.has("alice/main")).toBe(false);
        expect(f.records.get("alice/renamed")?.private).toBe(false);
        expect(f.authorize.mock.calls.map(([v]) => v.action)).toEqual([
          AUTHORIZATION_ACTIONS.LEDGER_CREATE,
          AUTHORIZATION_ACTIONS.LEDGER_CREATE,
          AUTHORIZATION_ACTIONS.LEDGER_ADMINISTRATION_UPDATE,
        ]);
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "preserves nullable lifecycle inputs via %s",
    async (surface) => {
      const f = await fixture();
      try {
        expect(
          (
            await f.call(surface, "create", {
              name: "nullable",
              description: null,
              private: null,
              template: null,
            })
          ).failed,
        ).toBe(false);
        expect(f.create.mock.calls[0][0]).toMatchObject({
          description: null,
          private: null,
        });
        expect(
          (
            await f.call(surface, "update", {
              name: null,
              description: null,
              private: null,
            })
          ).failed,
        ).toBe(false);
        expect(f.update.mock.calls[0][2]).toEqual({
          name: null,
          description: null,
          private: null,
        });
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "deletes repository and linked-bank metadata in the existing order via %s",
    async (surface) => {
      const f = await fixture();
      try {
        const r = await f.call(surface, "delete");
        expect(r.failed).toBe(false);
        expect(r.data).toEqual({ ledgerId: "alice/main" });
        expect(f.records.size).toBe(0);
        expect(f.bankRows()).toEqual([]);
        expect(f.events).toEqual([
          "bank-revoke",
          "local-bank-delete",
          "repository-delete",
        ]);
        expect(f.removeItem).toHaveBeenCalledWith("fixture-bank-token");
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "rolls back local cleanup when repository deletion fails via %s",
    async (surface) => {
      const f = await fixture();
      f.remove.mockRejectedValue(new Error("repository unavailable"));
      try {
        expect((await f.call(surface, "delete")).failed).toBe(true);
        expect(f.records.has("alice/main")).toBe(true);
        expect(f.bankRows()).toHaveLength(1);
        expect(f.events).toEqual(["bank-revoke", "local-bank-delete"]);
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "tolerates remote bank cleanup failure as GraphQL does via %s",
    async (surface) => {
      const f = await fixture();
      f.removeItem.mockRejectedValue(new Error("bank unavailable"));
      try {
        expect((await f.call(surface, "delete")).failed).toBe(false);
        expect(f.records.size).toBe(0);
        expect(f.bankRows()).toEqual([]);
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "enforces ledger quota before creating any repository via %s",
    async (surface) => {
      const f = await fixture();
      f.subscriptions.mockResolvedValue([]);
      try {
        expect(
          (await f.call(surface, "create", { name: "over-limit" })).failed,
        ).toBe(true);
        expect(f.create).not.toHaveBeenCalled();
        expect(f.records.size).toBe(1);
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "refuses all lifecycle operations without admin authority via %s",
    async (surface) => {
      const f = await fixture({
        ...identity,
        scopes: new Set(["ledger.write"]),
      });
      try {
        for (const operation of ["create", "update", "delete"] as const)
          expect(
            (
              await f.call(
                surface,
                operation,
                operation === "create" ? { name: "denied" } : {},
              )
            ).failed,
          ).toBe(true);
        expect(f.getApiContext).not.toHaveBeenCalled();
        expect(f.getPublicApiClient).not.toHaveBeenCalled();
        expect(f.removeItem).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "keeps account creation distinct from pinned-ledger changes via %s",
    async (surface) => {
      const f = await fixture({ ...identity, ledgerScope: "other/books" });
      try {
        expect(
          (await f.call(surface, "create", { name: "account-new" })).failed,
        ).toBe(false);
        for (const operation of ["update", "delete"] as const)
          expect((await f.call(surface, operation)).failed).toBe(true);
        expect(f.update).not.toHaveBeenCalled();
        expect(f.remove).not.toHaveBeenCalled();
        expect(f.removeItem).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "rejects invalid ledger names without side effects via %s",
    async (surface) => {
      const f = await fixture();
      try {
        for (const name of ["Bad Name", "a".repeat(101), ""])
          for (const operation of ["create", "update"] as const)
            expect((await f.call(surface, operation, { name })).failed).toBe(
              true,
            );
        expect(f.create).not.toHaveBeenCalled();
        expect(f.update).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it("rejects unknown MCP branches and incompatible arguments", async () => {
    const f = await fixture();
    try {
      for (const args of [
        { operation: "invalid" },
        { operation: "create" },
        { operation: "create", name: "new", ledger: "alice/main" },
        { operation: "update", ledger: "alice/main", template: "SAMPLE" },
        { operation: "delete", ledger: "alice/main", name: "other" },
        { operation: "delete", ledger: "alice/main", dry_run: true },
      ])
        expect(
          (await f.client.callTool({ name: "manageLedgers", arguments: args }))
            .isError,
        ).toBe(true);
      expect(f.create).not.toHaveBeenCalled();
      expect(f.update).not.toHaveBeenCalled();
      expect(f.remove).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
  it.each(surfaces)(
    "refuses revoked administrative relationships and source outages via %s",
    async (surface) => {
      const f = await fixture();
      try {
        f.records.get("alice/main")!.permissions = {
          ...seed.permissions,
          admin: false,
        };
        for (const operation of ["update", "delete"] as const)
          expect((await f.call(surface, operation)).failed).toBe(true);
        f.repoGet.mockRejectedValue(new Error("repository source unavailable"));
        for (const operation of ["update", "delete"] as const)
          expect((await f.call(surface, operation)).failed).toBe(true);
        expect(f.update).not.toHaveBeenCalled();
        expect(f.remove).not.toHaveBeenCalled();
        expect(f.removeItem).not.toHaveBeenCalled();
        expect(f.getPublicApiClient).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "preserves best-effort metadata lookup during deletion via %s",
    async (surface) => {
      const f = await fixture();
      f.get.mockRejectedValue(new Error("metadata unavailable"));
      try {
        expect((await f.call(surface, "delete")).failed).toBe(false);
        expect(f.records.size).toBe(0);
        expect(f.bankRows()).toHaveLength(1);
        expect(f.removeItem).not.toHaveBeenCalled();
        expect(f.deleteBankRows).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it("uses a pinned target when the MCP mutation omits ledger", async () => {
    const f = await fixture({ ...identity, ledgerScope: "alice/main" });
    try {
      const result = await f.client.callTool({
        name: "manageLedgers",
        arguments: { operation: "update", description: "pinned" },
      });
      expect(result.isError).not.toBe(true);
      expect(f.records.get("alice/main")?.description).toBe("pinned");
    } finally {
      await f.close();
    }
  });
});

it.each(surfaces)(
  "mobile creates beyond the free ledger cap via %s without changing web limits",
  async (surface) => {
    for (const [appId, mobile] of [
      [undefined, false],
      ["unknown-app", false],
      ["beancount-mobile,unknown-app", false],
      ["BEANCOUNT-MOBILE", false],
      ["beancount-mobile", true],
      ["mobile-beancount", true],
    ] as const) {
      const f = await fixture(identity, appId);
      f.subscriptions.mockResolvedValue([]);
      try {
        const result = await f.call(surface, "create", { name: "second" });
        expect(result.failed).toBe(!mobile);
        expect(f.records.has("alice/second")).toBe(mobile);
        if (mobile) {
          expect(result.data).toEqual(expected("second", "", false));
          expect(f.files.get("alice/second")).toEqual(defaultLedgerTemplate);
        }
        expect(f.create).toHaveBeenCalledTimes(mobile ? 1 : 0);
        if (mobile) expect(f.subscriptions).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    }
  },
);
it.each(surfaces)(
  "mobile cannot create without administrative scope via %s",
  async (surface) => {
    const f = await fixture(
      { ...identity, scopes: new Set(["ledger.read"]) },
      "beancount-mobile",
    );
    try {
      expect((await f.call(surface, "create", { name: "second" })).failed).toBe(
        true,
      );
      expect(f.create).not.toHaveBeenCalled();
      expect(f.subscriptions).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  },
);

import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerCollaboratorsQueryResolver } from "@/features/ledger/api/resolvers/ledger-collaborators-resolver.query";
import { LedgerCollaboratorsMutationResolver } from "@/features/ledger/api/resolvers/ledger-collaborators-resolver.mutation";
import { LedgerCollaboratorsWorkflow } from "@/features/ledger/workflow/ledger-collaborators-workflow";
import { FavaApiError } from "@/foundation/fava";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
  AUTHORIZATION_ACTIONS,
} from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";

/**
 * The MCP tool for one manageLedgerCollaborators operation (ADR 019, 2026-10-18; w1/m38):
 * each operation is its own tool, so the call names it and drops `operation`.
 * An unknown operation names a tool that does not exist.
 */
const MCP_TOOL_FOR: Readonly<Record<string, string>> = {
  update: "setLedgerCollaborator",
  delete: "removeLedgerCollaborator",
  leave: "leaveLedger",
};
function perOperation(args: Record<string, unknown>) {
  const { operation, ...rest } = args;
  return {
    name:
      MCP_TOOL_FOR[String(operation)] ?? `no-such-tool-${String(operation)}`,
    arguments: rest,
  };
}

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const token = (
  username = "alice",
  scope = "ledger.admin",
  pin?: string,
): Identity => ({
  userId: `usr_${username}`,
  method: "oauth",
  scopes: new Set([scope]),
  tokenId: `tok_${username}_${scope}_${pin ?? "all"}`,
  ...(pin && { ledgerScope: pin }),
});
const userFields = "id login fullName email active isAdmin created lastLogin";
const user = (name: string) => ({
  id: name === "alice" ? 1 : 2,
  login: name,
  full_name: `Name ${name}`,
  email: `${name}@example.com`,
  active: true,
  is_admin: false,
  created: "2026-01-01",
  last_login: "2026-09-01",
});
const mappedUser = (name: string) => ({
  id: name === "alice" ? 1 : 2,
  login: name,
  fullName: `Name ${name}`,
  email: `${name}@example.com`,
  active: true,
  isAdmin: false,
  created: "2026-01-01",
  lastLogin: "2026-09-01",
});
const envelope = (data: unknown) => ({ data: { success: true, data } });
let resolvers: Map<unknown, object>;
let schemaPromise: ReturnType<typeof buildSchema> | undefined;
type Surface = "rest" | "mcp" | "gql";
const surfaces: Surface[] = ["rest", "mcp", "gql"];

async function fixture(
  initialIdentity = token(),
  // Make "alice" an account on Free, so her ledger's collaborator limit is 1.
  // A public ledger is readable by any signed-in user, member or not.
  { ownerOnFree = false, publicLedger = false } = {},
) {
  let identity = initialIdentity;
  const members = new Map<string, string>([
    ["bob", "admin"],
    ["café+ops", "read"],
  ]);
  const repoGet = jest.fn(
    async (caller: string, owner: string, name: string) => {
      if (owner !== "alice" || name !== "main") throw { status: 404 };
      const login = caller.slice(4);
      const member = login === owner || members.has(login);
      if (!member && !publicLedger) throw { status: 404 };
      if (!member) {
        return {
          data: {
            id: 42,
            private: false,
            permissions: { admin: false, push: false, pull: true },
          },
        };
      }
      return {
        data: {
          id: 42,
          private: true,
          permissions: {
            admin: login === owner || members.get(login) === "admin",
            push: true,
            pull: true,
          },
        },
      };
    },
  );
  const repoCheckCollaborator = jest.fn(
    async (_owner: string, _name: string, login: string) => {
      if (!members.has(login)) throw { status: 404 };
      return { data: {} };
    },
  );
  const list = jest.fn(
    async (
      _owner: string,
      _name: string,
      { page, limit }: { page: number; limit: number },
    ) =>
      envelope(
        ["alice", ...members.keys()]
          .slice((page - 1) * limit, page * limit)
          .map(user),
      ),
  );
  const permission = jest.fn(
    async (_owner: string, _name: string, login: string) => {
      if (login !== "alice" && !members.has(login))
        return { data: { success: false } };
      const value = login === "alice" ? "admin" : members.get(login);
      return envelope({
        permission: value,
        role_name: value,
        user: user(login),
      });
    },
  );
  const update = jest.fn(
    async (
      _owner: string,
      _name: string,
      login: string,
      body: { permission: string | null },
    ) => {
      members.set(login, body.permission ?? "write");
      return envelope(null);
    },
  );
  const remove = jest.fn(
    async (_owner: string, _name: string, login: string) => {
      members.delete(login);
      return envelope(null);
    },
  );
  const collaborators = {
    listLedgerCollaborators: list,
    getLedgerCollaboratorPermission: permission,
    addOrUpdateLedgerCollaborator: update,
    deleteLedgerCollaborator: remove,
  };
  const getPublicApiClient = jest.fn(async () => ({ collaborators }));
  // What a content-read check consults: the ledger's visibility, and the
  // caller's own grant, which the ledger service answers 404 without.
  const accessCollaborators = {
    getLedgerCollaboratorPermission: async (
      _owner: string,
      _name: string,
      login: string,
    ) => {
      if (!members.has(login)) {
        throw new FavaApiError("Not Found", 404, {
          success: false,
          error: "Not Found",
        });
      }
      return envelope({ permission: members.get(login) });
    },
  };
  const fava = {
    getPublicApiClient,
    getAdminClient: () => ({
      collaborators,
      ledgers: {
        getLedger: async () => envelope({ id: 42, private: !publicLedger }),
      },
    }),
    getApiContext: async (id: string) => ({
      favaUser: { username: id.slice(4) },
      favaApiClient: { collaborators: accessCollaborators },
    }),
  };
  const models = {
    user: {
      getById: async (_db: unknown, id: string) => ({
        ledger_username: id.slice(4),
      }),
      getUserByUsername: async (_db: unknown, username: string) =>
        username === "alice" ? { id: "usr_alice" } : undefined,
    },
    paidCustomer: {
      findByUserIdWithActivePeriod: async () => null,
      findByUserId: async () => [],
    },
  };
  const evaluator = new SourceBackedRelationshipEvaluator(
    {} as never,
    models as never,
    {
      getUserApiClient: async (caller: string) => ({
        repos: {
          repoGet: (owner: string, name: string) =>
            repoGet(caller, owner, name),
        },
      }),
      getAdminApiClient: () => ({ repos: { repoCheckCollaborator } }),
    } as never,
    fava as never,
  );
  const authorization = new AuthorizationService(evaluator, jest.fn());
  const authorize = jest.spyOn(authorization, "authorizeOrThrow");
  const workflow = new LedgerCollaboratorsWorkflow(
    fava as never,
    {
      listSubscriptions: async (userId: string) =>
        ownerOnFree && userId === "usr_alice"
          ? []
          : [
              {
                status: "active",
                livemode: true,
                clientId: "beancount-web-prod",
                customer: "cus_synthetic",
                items: {
                  data: [{ price: { id: "price_1RrSOGEqsEqs2tLVFnyB34qG" } }],
                },
              },
            ],
    } as never,
    authorization,
    // By default no account owns the synthetic ledger, so the acting user's
    // plan applies.
    {
      user: {
        getUserByUsername: async (_db: unknown, name: string) =>
          ownerOnFree && name === "alice" ? { id: "usr_alice" } : null,
      },
    } as never,
    {} as never,
  );
  resolvers = new Map<unknown, object>([
    [
      LedgerCollaboratorsQueryResolver,
      new LedgerCollaboratorsQueryResolver(workflow),
    ],
    [
      LedgerCollaboratorsMutationResolver,
      new LedgerCollaboratorsMutationResolver(workflow),
    ],
  ]);
  schemaPromise ??= buildSchema({
    resolvers: [
      LedgerCollaboratorsQueryResolver,
      LedgerCollaboratorsMutationResolver,
    ],
    container: { get: (ctor) => resolvers.get(ctor) },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
  const schema = await schemaPromise;
  const rest = await startV1TestServer(
    { workflows: { ledgerCollaborators: workflow } } as unknown as AppLayers,
    config,
    { apiKeys: false },
  );
  rest.setIdentity(identity);
  const context = {
    identity,
    collaboratorsWorkflow: workflow,
  } as unknown as McpRequestContext;
  const server = assembleMcpRegistry(context, config);
  const client = new Client({ name: "collaborator-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  const gql = (source: string) =>
    graphql({
      schema,
      source,
      contextValue: { identity, getCurrentIdentity: () => identity },
    });
  const request = (path: string, method = "GET", body?: unknown) =>
    fetch(`${rest.url}/api-gateway/v1/ledgers/alice/main/${path}`, {
      method,
      ...(body !== undefined && {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    });
  const read = async (path: string) => {
    const result = await client.readResource({
      uri: `beancount://alice/main/${path}`,
    });
    const content = result.contents[0];
    if (!("text" in content)) throw new Error("Expected JSON");
    return JSON.parse(content.text);
  };
  return {
    members,
    repoGet,
    repoCheckCollaborator,
    getPublicApiClient,
    list,
    permission,
    update,
    remove,
    authorize,
    client,
    gql,
    request,
    read,
    setIdentity: (next: Identity) => {
      identity = next;
      context.identity = next;
      rest.setIdentity(next);
    },
    write: async (
      surface: Surface,
      operation: "update" | "delete" | "leave",
      collaborator?: string,
      permissionValue?: string | null,
    ) => {
      const payload = {
        ...(collaborator !== undefined && { collaborator }),
        ...(permissionValue !== undefined && { permission: permissionValue }),
      };
      if (surface === "mcp") {
        const result = await client.callTool(
          perOperation({ operation, ledger: "alice/main", ...payload }),
        );
        return {
          failed: result.isError === true,
          data: (result.structuredContent as { result?: unknown } | undefined)
            ?.result,
        };
      }
      if (surface === "rest") {
        const response =
          operation === "leave"
            ? await request("leave", "POST", {})
            : await request(
                `collaborators/${encodeURIComponent(collaborator ?? "")}`,
                operation === "update" ? "PUT" : "DELETE",
                operation === "update"
                  ? { permission: permissionValue }
                  : undefined,
              );
        return { failed: !response.ok, data: await response.json() };
      }
      const field = {
        update: "addOrUpdateLedgerCollaborator",
        delete: "deleteLedgerCollaborator",
        leave: "leaveLedger",
      }[operation];
      const args = Object.entries(payload)
        .map(([key, value]) => `, ${key}: ${JSON.stringify(value)}`)
        .join("");
      const result = await gql(
        `mutation { ${field}(ledgerId: "alice/main"${args}) { success message } }`,
      );
      return { failed: Boolean(result.errors), data: result.data?.[field] };
    },
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe("collaborators through actual adapters, workflow, PDP, and relationship evaluator", () => {
  it.each([
    token(),
    token("bob"),
    token("alice", "ledger.admin", "alice/main"),
  ])(
    "lists members for an authorized owner or administrator: $userId",
    async (identity) => {
      const f = await fixture(identity);
      try {
        const expected = ["alice", "bob", "café+ops"].map((login) => ({
          ...mappedUser(login),
          permission: login === "café+ops" ? "read" : "admin",
        }));
        const response = await f.request("collaborators");
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(expected);
        expect(await f.read("collaborators")).toEqual(expected);
        const result = await f.gql(
          `{listLedgerCollaborators(ledgerId:"alice/main"){${userFields} permission}}`,
        );
        expect(result.errors).toBeUndefined();
        expect(result.data?.listLedgerCollaborators).toEqual(expected);
        expect(f.list).toHaveBeenCalledTimes(3);
        for (const args of f.list.mock.calls)
          expect(args).toEqual(["alice", "main", { page: 1, limit: 10 }]);
        expect(f.repoGet).toHaveBeenCalledTimes(3);
      } finally {
        await f.close();
      }
    },
  );
  it("preserves paging and encoded collaborator names", async () => {
    const f = await fixture();
    try {
      const expected = [{ ...mappedUser("café+ops"), permission: "read" }];
      const r = await f.request("collaborators?page=2&limit=2");
      expect(await r.json()).toEqual(expected);
      expect(await f.read("collaborators?page=2&limit=2")).toEqual(expected);
      const g = await f.gql(
        `{listLedgerCollaborators(ledgerId:"alice/main",page:2,limit:2){${userFields} permission}}`,
      );
      expect(g.errors).toBeUndefined();
      expect(g.data?.listLedgerCollaborators).toEqual(expected);
      const p = {
        permission: "read",
        roleName: "read",
        user: mappedUser("café+ops"),
      };
      expect(
        await (
          await f.request(
            "collaborators/permission?collaborator=caf%C3%A9%2Bops",
          )
        ).json(),
      ).toEqual(p);
      expect(
        await f.read("collaborators/permission?collaborator=caf%C3%A9%2Bops"),
      ).toEqual(p);
      const pg = await f.gql(
        `{getLedgerCollaboratorPermission(ledgerId:"alice/main",collaborator:"café+ops"){permission roleName user{${userFields}}}}`,
      );
      expect(pg.errors).toBeUndefined();
      expect(pg.data?.getLedgerCollaboratorPermission).toEqual(p);
    } finally {
      await f.close();
    }
  });
  it.each([
    { identity: token("alice", "ledger.read"), status: 403 },
    // A read collaborator sees the ledger, so is told why (w23/069).
    { identity: token("café+ops"), status: 403 },
    { identity: token("alice", "ledger.admin", "other/main"), status: 403 },
  ])(
    "denies insufficient scope, relationship, or ledger pin",
    async ({ identity, status }) => {
      const f = await fixture(identity);
      try {
        for (const [path, field] of [
          [
            "collaborators",
            'listLedgerCollaborators(ledgerId:"alice/main"){login}',
          ],
          [
            "collaborators/permission?collaborator=bob",
            'getLedgerCollaboratorPermission(ledgerId:"alice/main",collaborator:"bob"){permission}',
          ],
        ]) {
          expect((await f.request(path)).status).toBe(status);
          await expect(f.read(path)).rejects.toThrow();
          expect((await f.gql(`{${field}}`)).errors).toHaveLength(1);
        }
        expect(f.getPublicApiClient).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it("refuses an unavailable relationship source on every read", async () => {
    const f = await fixture();
    f.repoGet.mockRejectedValue(new Error("repository source unavailable"));
    try {
      for (const [path, field] of [
        [
          "collaborators",
          'listLedgerCollaborators(ledgerId:"alice/main"){login}',
        ],
        [
          "collaborators/permission?collaborator=bob",
          'getLedgerCollaboratorPermission(ledgerId:"alice/main",collaborator:"bob"){permission}',
        ],
      ]) {
        expect((await f.request(path)).status).toBe(503);
        await expect(f.read(path)).rejects.toThrow();
        expect((await f.gql(`{${field}}`)).errors).toHaveLength(1);
      }
      expect(f.getPublicApiClient).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
  it("preserves missing-member failure and partial permission-read behavior", async () => {
    const f = await fixture();
    try {
      expect(
        (await f.request("collaborators/permission?collaborator=missing"))
          .status,
      ).toBe(500);
      await expect(
        f.read("collaborators/permission?collaborator=missing"),
      ).rejects.toThrow();
      expect(
        (
          await f.gql(
            '{getLedgerCollaboratorPermission(ledgerId:"alice/main",collaborator:"missing"){permission}}',
          )
        ).errors,
      ).toHaveLength(1);
      f.permission.mockImplementation(async (_owner, _name, login) => {
        if (login === "bob") throw new Error("member source unavailable");
        return envelope({ permission: "read" });
      });
      const expected = ["alice", "café+ops"].map((login) => ({
        ...mappedUser(login),
        permission: "read",
      }));
      expect(await (await f.request("collaborators")).json()).toEqual(expected);
      expect(await f.read("collaborators")).toEqual(expected);
      expect(
        (
          await f.gql(
            `{listLedgerCollaborators(ledgerId:"alice/main"){${userFields} permission}}`,
          )
        ).data?.listLedgerCollaborators,
      ).toEqual(expected);
    } finally {
      await f.close();
    }
  });
  it.each(surfaces)(
    "persists update/delete and revokes subsequent access via %s",
    async (surface) => {
      const f = await fixture();
      try {
        // w23/m13/t004: commits echo the flag — dryRun on REST, dry_run on
        // MCP; this file's GraphQL selection predates the echo.
        expect(await f.write(surface, "update", "new+member", "read")).toEqual({
          failed: false,
          data: {
            success: true,
            message: "Collaborator added/updated successfully",
            ...(surface === "gql"
              ? {}
              : surface === "mcp"
                ? { dry_run: false }
                : { dryRun: false }),
          },
        });
        expect(f.members.get("new+member")).toBe("read");
        expect(
          (await f.write(surface, "update", "new+member", "admin")).failed,
        ).toBe(false);
        expect(f.members.get("new+member")).toBe("admin");
        expect(await f.write(surface, "delete", "bob")).toEqual({
          failed: false,
          data: {
            success: true,
            message: "Collaborator deleted successfully",
            ...(surface === "gql"
              ? {}
              : surface === "mcp"
                ? { dry_run: false }
                : { dryRun: false }),
          },
        });
        expect(f.members.has("bob")).toBe(false);
        expect(f.authorize.mock.calls.map(([input]) => input.action)).toEqual([
          AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_UPDATE,
          AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_UPDATE,
          AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_DELETE,
        ]);
        f.setIdentity(token("bob"));
        expect((await f.request("collaborators")).status).toBe(404);
        await expect(f.read("collaborators")).rejects.toThrow();
        expect(
          (
            await f.gql(
              '{listLedgerCollaborators(ledgerId:"alice/main"){login}}',
            )
          ).errors,
        ).toHaveLength(1);
      } finally {
        await f.close();
      }
    },
  );
  it("refuses a permission read with an empty collaborator as bad input on every surface", async () => {
    const f = await fixture();
    try {
      const rest = await f.request("collaborators/permission?collaborator=");
      expect(rest.status).toBe(400);
      await expect(
        f.read("collaborators/permission?collaborator="),
      ).rejects.toMatchObject({
        code: -32602,
        data: { code: "BAD_USER_INPUT" },
      });
      const gql = await f.gql(
        '{getLedgerCollaboratorPermission(ledgerId:"alice/main",collaborator:""){permission}}',
      );
      expect(gql.errors).toHaveLength(1);
      expect(gql.errors?.[0].originalError).toMatchObject({
        category: "BAD_USER_INPUT",
      });
      expect(f.permission).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
  it("answers a permission read for an unknown user as bad input, without upstream internals, on every surface", async () => {
    const f = await fixture();
    try {
      f.permission.mockRejectedValue(
        new Error("user does not exist [uid: 0, name: zz-ghost]"),
      );
      const rest = await f.request(
        "collaborators/permission?collaborator=zz-ghost",
      );
      expect(rest.status).toBe(400);
      expect(await rest.text()).not.toContain("uid");
      await expect(
        f.read("collaborators/permission?collaborator=zz-ghost"),
      ).rejects.toMatchObject({
        code: -32602,
        data: { code: "BAD_USER_INPUT", message: "No such user: zz-ghost" },
      });
      const gql = await f.gql(
        '{getLedgerCollaboratorPermission(ledgerId:"alice/main",collaborator:"zz-ghost"){permission}}',
      );
      expect(gql.errors).toHaveLength(1);
      expect(gql.errors?.[0].originalError).toMatchObject({
        category: "BAD_USER_INPUT",
        message: "No such user: zz-ghost",
      });
    } finally {
      await f.close();
    }
  });
  it.each(["update", "delete"] as const)(
    "refuses an empty collaborator name on %s as bad input without mutation",
    async (operation) => {
      const f = await fixture();
      try {
        const mcp = await f.client.callTool(
          perOperation({
            operation,
            ledger: "alice/main",
            collaborator: "",
            ...(operation === "update" && { permission: "read" }),
          }),
        );
        expect(mcp.isError).toBe(true);
        expect(mcp.structuredContent).toMatchObject({
          error: { code: "BAD_USER_INPUT" },
        });
        const field =
          operation === "update"
            ? 'addOrUpdateLedgerCollaborator(ledgerId: "alice/main", collaborator: "", permission: "read")'
            : 'deleteLedgerCollaborator(ledgerId: "alice/main", collaborator: "")';
        const gql = await f.gql(`mutation { ${field} { success } }`);
        expect(gql.errors).toHaveLength(1);
        expect(gql.errors?.[0].originalError).toMatchObject({
          category: "BAD_USER_INPUT",
        });
        // REST names the collaborator in the path, so an empty one is not a
        // route at all.
        expect(
          (
            await f.request(
              "collaborators/",
              operation === "update" ? "PUT" : "DELETE",
              operation === "update" ? { permission: "read" } : undefined,
            )
          ).status,
        ).toBe(405);
        expect(f.update).not.toHaveBeenCalled();
        expect(f.remove).not.toHaveBeenCalled();
        expect(f.members.size).toBe(2);
      } finally {
        await f.close();
      }
    },
  );
  it("refuses a collaborator past the ledger owner's plan as a resource-limit error on every surface, without mutation", async () => {
    // Alice is on Free (1 collaborator) and already has two; the admin adding
    // a third pays for Premium, which does not lift her ledger's limit.
    const f = await fixture(token(), { ownerOnFree: true });
    try {
      const rest = await f.request("collaborators/newcomer", "PUT", {
        permission: "read",
      });
      expect(rest.status).toBe(403);
      expect(await rest.json()).toMatchObject({
        error: { code: "RESOURCE_LIMIT_REACHED" },
      });
      const mcp = await f.client.callTool(
        perOperation({
          operation: "update",
          ledger: "alice/main",
          collaborator: "newcomer",
          permission: "read",
        }),
      );
      expect(mcp.isError).toBe(true);
      expect(mcp.structuredContent).toMatchObject({
        error: { code: "RESOURCE_LIMIT_REACHED" },
      });
      const gql = await f.gql(
        'mutation { addOrUpdateLedgerCollaborator(ledgerId: "alice/main", collaborator: "newcomer", permission: "read") { success } }',
      );
      expect(gql.errors).toHaveLength(1);
      expect(gql.errors?.[0].originalError).toMatchObject({
        category: "RESOURCE_LIMIT_REACHED",
      });
      expect(f.update).not.toHaveBeenCalled();
      expect(f.members.size).toBe(2);
    } finally {
      await f.close();
    }
  });

  // w23/025: the host no-ops a grant or removal naming the owner and still
  // reports success.
  it.each([
    ["update", "alice"],
    ["delete", "alice"],
    ["update", "ALICE"],
    ["delete", "ALICE"],
  ] as const)(
    "refuses the ledger owner as a %s target (%s) on every surface, without mutation",
    async (operation, owner) => {
      const f = await fixture();
      try {
        const rest = await f.request(
          `collaborators/${owner}`,
          operation === "update" ? "PUT" : "DELETE",
          operation === "update" ? { permission: "read" } : undefined,
        );
        expect(rest.status).toBe(403);
        expect(
          ((await rest.json()) as { error: { code: string } }).error.code,
        ).toBe("OPERATION_NOT_ALLOWED");
        const mcp = await f.client.callTool(
          perOperation({
            operation,
            ledger: "alice/main",
            collaborator: owner,
            ...(operation === "update" && { permission: "read" }),
          }),
        );
        expect(mcp.isError).toBe(true);
        expect(mcp.structuredContent).toMatchObject({
          error: {
            code: "OPERATION_NOT_ALLOWED",
            message: expect.stringContaining("owns this ledger"),
          },
        });
        const field =
          operation === "update"
            ? `addOrUpdateLedgerCollaborator(ledgerId: "alice/main", collaborator: "${owner}", permission: "read")`
            : `deleteLedgerCollaborator(ledgerId: "alice/main", collaborator: "${owner}")`;
        const gql = await f.gql(`mutation { ${field} { success } }`);
        expect(gql.errors?.[0].originalError).toMatchObject({
          category: "OPERATION_NOT_ALLOWED",
        });
        expect(f.update).not.toHaveBeenCalled();
        expect(f.remove).not.toHaveBeenCalled();
        expect(f.members.size).toBe(2);
      } finally {
        await f.close();
      }
    },
  );

  it("answers deleting an unknown user as bad input, without upstream internals, on every surface", async () => {
    const f = await fixture();
    try {
      f.remove.mockRejectedValue(
        new Error("user does not exist [uid: 0, name: zz-ghost]"),
      );
      const rest = await f.request("collaborators/zz-ghost", "DELETE");
      expect(rest.status).toBe(400);
      expect(await rest.text()).not.toContain("uid");
      const mcp = await f.client.callTool(
        perOperation({
          operation: "delete",
          ledger: "alice/main",
          collaborator: "zz-ghost",
        }),
      );
      expect(mcp.isError).toBe(true);
      expect(mcp.structuredContent).toMatchObject({
        error: { code: "BAD_USER_INPUT", message: "No such user: zz-ghost" },
      });
      const gql = await f.gql(
        'mutation { deleteLedgerCollaborator(ledgerId: "alice/main", collaborator: "zz-ghost") { success } }',
      );
      expect(gql.errors).toHaveLength(1);
      expect(gql.errors?.[0].originalError).toMatchObject({
        category: "BAD_USER_INPUT",
        message: "No such user: zz-ghost",
      });
      expect(f.members.size).toBe(2);
    } finally {
      await f.close();
    }
  });
  // w23/069: a caller who can read the ledger was told it was not found by
  // every collaborator action, and concluded it was gone.
  it.each([
    ["a public-ledger reader", token("carol"), true],
    ["a read collaborator", token("café+ops"), false],
  ] as const)(
    "tells %s that collaborators need admin access, on every surface",
    async (_caller, identity, publicLedger) => {
      const f = await fixture(identity, { publicLedger });
      const refusal = {
        code: "FORBIDDEN",
        message: expect.stringMatching(
          /collaborator.* alice\/main requires admin access to it$/,
        ),
      };
      try {
        for (const [path, field] of [
          [
            "collaborators",
            'listLedgerCollaborators(ledgerId:"alice/main"){login}',
          ],
          [
            "collaborators/permission?collaborator=bob",
            'getLedgerCollaboratorPermission(ledgerId:"alice/main",collaborator:"bob"){permission}',
          ],
        ]) {
          const rest = await f.request(path);
          expect(rest.status).toBe(403);
          expect(await rest.json()).toMatchObject({ error: refusal });
          await expect(f.read(path)).rejects.toThrow(/requires admin access/);
          const gql = await f.gql(`{${field}}`);
          expect(gql.errors?.[0].originalError).toMatchObject({
            category: "FORBIDDEN",
            message: refusal.message,
          });
        }
        for (const surface of surfaces) {
          for (const [operation, permission] of [
            ["update", "read"],
            ["delete", undefined],
          ] as const) {
            const outcome = await f.write(
              surface,
              operation,
              "bob",
              permission,
            );
            expect(outcome.failed).toBe(true);
            if (surface === "rest") {
              expect(outcome.data).toMatchObject({ error: refusal });
            }
          }
        }
        expect(f.update).not.toHaveBeenCalled();
        expect(f.remove).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it("still answers who cannot see a private ledger that it is not found", async () => {
    const f = await fixture(token("carol"));
    try {
      const rest = await f.request("collaborators");
      expect(rest.status).toBe(404);
      expect(await rest.json()).toMatchObject({
        error: { code: "NOT_FOUND", message: "Ledger not found" },
      });
      const outcome = await f.write("rest", "delete", "bob");
      expect(outcome.data).toMatchObject({
        error: { code: "NOT_FOUND", message: "Ledger not found" },
      });
    } finally {
      await f.close();
    }
  });
  // w23/063: the owner's leave answered "Ledger not found" for a ledger it
  // had just read — the concealment meant for callers who cannot see it.
  it.each(surfaces)(
    "tells a caller who can read the ledger why it cannot leave via %s",
    async (surface) => {
      const leaveError = async (f: Awaited<ReturnType<typeof fixture>>) => {
        if (surface === "mcp") {
          const result = await f.client.callTool(
            perOperation({ operation: "leave", ledger: "alice/main" }),
          );
          return (
            result.structuredContent as {
              error: { code: string; message: string };
            }
          ).error;
        }
        if (surface === "rest") {
          const response = await f.request("leave", "POST", {});
          return (
            (await response.json()) as {
              error: { code: string; message: string };
            }
          ).error;
        }
        const result = await f.gql(
          'mutation { leaveLedger(ledgerId: "alice/main") { success } }',
        );
        const error = result.errors?.[0];
        return {
          code: (error?.originalError as { category?: string }).category,
          message: error?.message,
        };
      };

      const owned = await fixture();
      try {
        expect(await leaveError(owned)).toMatchObject({
          code: "OPERATION_NOT_ALLOWED",
          message: expect.stringContaining(
            "alice owns this ledger; an owner can't leave it",
          ),
        });
      } finally {
        await owned.close();
      }

      const shared = await fixture(token("carol"), { publicLedger: true });
      try {
        expect(await leaveError(shared)).toMatchObject({
          code: "OPERATION_NOT_ALLOWED",
          message: expect.stringContaining(
            "carol is not a collaborator on this ledger",
          ),
        });
      } finally {
        await shared.close();
      }

      // Who cannot see the ledger still learns nothing about it.
      const hidden = await fixture(token("carol"));
      try {
        expect(await leaveError(hidden)).toMatchObject({
          code: "NOT_FOUND",
          message: expect.stringContaining("Ledger not found"),
        });
        expect(hidden.remove).not.toHaveBeenCalled();
      } finally {
        await hidden.close();
      }
    },
  );

  it.each(surfaces)(
    "leaves as the caller and refuses owners or stale membership via %s",
    async (surface) => {
      const f = await fixture(token("bob"));
      try {
        // w23/m13/t004: commits echo the flag — dryRun on REST, dry_run on
        // MCP; this file's GraphQL selection predates the echo.
        expect(await f.write(surface, "leave")).toEqual({
          failed: false,
          data: {
            success: true,
            message: "Removed self from repository successfully",
            ...(surface === "gql"
              ? {}
              : surface === "mcp"
                ? { dry_run: false }
                : { dryRun: false }),
          },
        });
        expect(f.members.has("bob")).toBe(false);
        expect(f.remove).toHaveBeenCalledWith("alice", "main", "bob");
        expect((await f.write(surface, "leave")).failed).toBe(true);
        f.setIdentity(token());
        expect((await f.write(surface, "leave")).failed).toBe(true);
        expect(f.remove).toHaveBeenCalledTimes(1);
        expect(
          f.authorize.mock.calls.every(
            ([input]) =>
              input.action === AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_LEAVE,
          ),
        ).toBe(true);
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "preserves omitted/null permission defaults via %s",
    async (surface) => {
      const f = await fixture();
      try {
        for (const value of [undefined, null]) {
          expect((await f.write(surface, "update", "bob", value)).failed).toBe(
            false,
          );
          expect(f.members.get("bob")).toBe("write");
        }
        expect(
          f.update.mock.calls.every((call) => call[3].permission === null),
        ).toBe(true);
      } finally {
        await f.close();
      }
    },
  );
  it("rejects unknown operations, missing branch inputs, other-ledger targets, and conflicting preview twins without mutation", async () => {
    const f = await fixture(token("alice", "ledger.admin", "alice/main"));
    try {
      for (const args of [
        { operation: "unknown" },
        { operation: "update" },
        { operation: "delete" },
        { operation: "leave", collaborator: "bob" },
        { operation: "delete", collaborator: "bob", permission: "admin" },
        { operation: "leave", ledger: "other/main" },
        // w23/m13/t004: dry_run alone is a valid preview now (covered in
        // collaborator-preview-parity); conflicting twins are still refused.
        {
          operation: "update",
          collaborator: "bob",
          dryRun: true,
          dry_run: false,
        },
      ]) {
        const result = await f.client.callTool(perOperation(args));
        expect(result.isError).toBe(true);
      }
      expect(
        (
          await f.request("collaborators/bob", "PUT", {
            permission: "write",
            dryRun: true,
            dry_run: false,
          })
        ).status,
      ).toBe(400);
      expect(f.update).not.toHaveBeenCalled();
      expect(f.remove).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
  it.each(surfaces)(
    "retains collaborator limits while allowing existing-member updates via %s",
    async (surface) => {
      const f = await fixture();
      f.members.set("one", "read");
      f.members.set("two", "read");
      f.members.set("three", "read");
      try {
        expect(
          (await f.write(surface, "update", "overflow", "read")).failed,
        ).toBe(true);
        expect(f.members.has("overflow")).toBe(false);
        expect(f.update).not.toHaveBeenCalled();
        expect((await f.write(surface, "update", "bob", "write")).failed).toBe(
          false,
        );
        expect(f.members.get("bob")).toBe("write");
        expect(f.update).toHaveBeenCalledTimes(1);
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "denies every write with insufficient scope or a different ledger pin via %s",
    async (surface) => {
      const f = await fixture();
      try {
        for (const identity of [
          token("bob", "ledger.read"),
          token("bob", "ledger.admin", "other/main"),
        ]) {
          f.setIdentity(identity);
          for (const operation of ["update", "delete", "leave"] as const) {
            expect(
              (
                await f.write(
                  surface,
                  operation,
                  operation === "leave" ? undefined : "café+ops",
                )
              ).failed,
            ).toBe(true);
          }
        }
        expect(f.update).not.toHaveBeenCalled();
        expect(f.remove).not.toHaveBeenCalled();
        expect(f.getPublicApiClient).not.toHaveBeenCalled();
        expect(f.repoGet).not.toHaveBeenCalled();
        expect(f.repoCheckCollaborator).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "refuses writes when the relationship source is unavailable via %s",
    async (surface) => {
      const f = await fixture(token("bob"));
      f.repoGet.mockRejectedValue(new Error("repository source unavailable"));
      f.repoCheckCollaborator.mockRejectedValue(
        new Error("membership source unavailable"),
      );
      try {
        for (const operation of ["update", "delete", "leave"] as const) {
          expect(
            (
              await f.write(
                surface,
                operation,
                operation === "leave" ? undefined : "café+ops",
              )
            ).failed,
          ).toBe(true);
        }
        expect(f.update).not.toHaveBeenCalled();
        expect(f.remove).not.toHaveBeenCalled();
        expect(f.getPublicApiClient).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
});

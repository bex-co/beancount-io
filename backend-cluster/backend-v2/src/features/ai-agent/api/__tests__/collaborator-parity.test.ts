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

async function fixture(initialIdentity = token()) {
  let identity = initialIdentity;
  const members = new Map<string, string>([
    ["bob", "admin"],
    ["café+ops", "read"],
  ]);
  const repoGet = jest.fn(
    async (caller: string, owner: string, name: string) => {
      if (owner !== "alice" || name !== "main") throw { status: 404 };
      const login = caller.slice(4);
      if (login !== owner && !members.has(login)) throw { status: 404 };
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
  const fava = {
    getPublicApiClient,
    getAdminClient: () => ({ collaborators }),
    getApiContext: async (id: string) => ({
      favaUser: { username: id.slice(4) },
    }),
  };
  const models = {
    user: {
      getById: async (_db: unknown, id: string) => ({
        ledger_username: id.slice(4),
      }),
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
    { listSubscriptions: async () => [{ status: "active" }] } as never,
    models as never,
    {} as never,
    authorization,
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
        const result = await client.callTool({
          name: "manageLedgerCollaborators",
          arguments: { operation, ledger: "alice/main", ...payload },
        });
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
    { identity: token("café+ops"), status: 404 },
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
        expect(await f.write(surface, "update", "new+member", "read")).toEqual({
          failed: false,
          data: {
            success: true,
            message: "Collaborator added/updated successfully",
          },
        });
        expect(f.members.get("new+member")).toBe("read");
        expect(
          (await f.write(surface, "update", "new+member", "admin")).failed,
        ).toBe(false);
        expect(f.members.get("new+member")).toBe("admin");
        expect(await f.write(surface, "delete", "bob")).toEqual({
          failed: false,
          data: { success: true, message: "Collaborator deleted successfully" },
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
  it.each(surfaces)(
    "leaves as the caller and refuses owners or stale membership via %s",
    async (surface) => {
      const f = await fixture(token("bob"));
      try {
        expect(await f.write(surface, "leave")).toEqual({
          failed: false,
          data: {
            success: true,
            message: "Removed self from repository successfully",
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
  it("rejects unknown operations, missing branch inputs, other-ledger targets, and unsupported previews without mutation", async () => {
    const f = await fixture(token("alice", "ledger.admin", "alice/main"));
    try {
      for (const args of [
        { operation: "unknown" },
        { operation: "update" },
        { operation: "delete" },
        { operation: "leave", collaborator: "bob" },
        { operation: "delete", collaborator: "bob", permission: "admin" },
        { operation: "leave", ledger: "other/main" },
        { operation: "update", collaborator: "bob", dry_run: true },
      ]) {
        const result = await f.client.callTool({
          name: "manageLedgerCollaborators",
          arguments: args,
        });
        expect(result.isError).toBe(true);
      }
      expect(
        (
          await f.request("collaborators/bob", "PUT", {
            permission: "write",
            dry_run: true,
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

import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
jest.mock("@/features/stripe/operations/get-user-tier");
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerCollaboratorsMutationResolver } from "../../../resolvers/ledger-collaborators-resolver.mutation";
import { FavaApiError } from "@/foundation/fava";
import { ForbiddenError } from "@/shared/errors";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import { LedgerCollaboratorsWorkflow } from "@/features/ledger/workflow/ledger-collaborators-workflow";
import { getUserTier } from "@/features/stripe/operations/get-user-tier";
import { SubscriptionTier } from "@/features/stripe/service/stripe";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";

(getUserTier as jest.Mock).mockResolvedValue(SubscriptionTier.GROWTH);

const config = {
  api: { scopeEnforcement: "enforce" },
  gitea: { hostName: "gitea", httpPort: 3000 },
} as unknown as AppConfig;
// Bob is an admin member acting on alice's ledger.
const identity: Identity = {
  userId: "usr_bob",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};
let resolver: LedgerCollaboratorsMutationResolver;
let schema: Awaited<ReturnType<typeof buildSchema>>;
beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [LedgerCollaboratorsMutationResolver, HealthResolver],
    container: {
      get: (target) =>
        target === LedgerCollaboratorsMutationResolver
          ? resolver
          : new HealthResolver(),
    },
    validate: true,
  });
});

type Op = "set" | "remove" | "leave";

async function fixture() {
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  const members = new Map<string, string>([
    ["bob", "admin"],
    ["carol", "read"],
  ]);
  const listSpy = jest.fn(
    async (
      _owner: string,
      _name: string,
      { page, limit }: { page: number; limit: number },
    ) =>
      envelope(
        ["alice", ...members.keys()]
          .slice((page - 1) * limit, page * limit)
          .map((login) => ({ login })),
      ),
  );
  const permissionSpy = jest.fn(
    async (_owner: string, _name: string, login: string) => {
      if (login !== "alice" && !members.has(login))
        return { data: { success: false } };
      const value = login === "alice" ? "admin" : members.get(login);
      return envelope({ permission: value, role_name: value });
    },
  );
  const updateSpy = jest.fn(
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
  const removeSpy = jest.fn(
    async (_owner: string, _name: string, login: string) => {
      members.delete(login);
      return envelope(null);
    },
  );
  const collaborators = {
    listLedgerCollaborators: listSpy,
    getLedgerCollaboratorPermission: permissionSpy,
    addOrUpdateLedgerCollaborator: updateSpy,
    deleteLedgerCollaborator: removeSpy,
  };
  const fava = {
    getPublicApiClient: async () => ({ collaborators }),
    getAdminClient: () => ({ collaborators }),
    getApiContext: async (id: string) => ({
      favaUser: { username: id.slice(4) },
    }),
  };
  const authorizeOrThrow = jest.fn(async () => ({ allowed: true }));
  const authorization = { authorizeOrThrow };
  const models = {
    user: { getUserByUsername: jest.fn(async () => null) },
  };
  const workflow = new LedgerCollaboratorsWorkflow(
    fava as never,
    {} as never,
    authorization as never,
    models as never,
    {} as never,
  );
  resolver = new LedgerCollaboratorsMutationResolver(workflow);
  const rest = await startV1TestServer(
    { workflows: { ledgerCollaborators: workflow } } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(identity);
  const server = assembleMcpRegistry(
    {
      identity,
      collaboratorsWorkflow: workflow,
      services: {},
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "collaborator-preview-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);

  const GQL_SOURCE: Record<Op, string> = {
    set: `mutation($collaborator:String!,$permission:String,$dryRun:Boolean,$dry_run:Boolean) { addOrUpdateLedgerCollaborator(ledgerId:"alice/main",collaborator:$collaborator,permission:$permission,dryRun:$dryRun,dry_run:$dry_run) { success message dryRun preview { collaborator current requested warnings } } }`,
    remove: `mutation($collaborator:String!,$dryRun:Boolean,$dry_run:Boolean) { deleteLedgerCollaborator(ledgerId:"alice/main",collaborator:$collaborator,dryRun:$dryRun,dry_run:$dry_run) { success message dryRun preview { collaborator current requested warnings } } }`,
    leave: `mutation($dryRun:Boolean,$dry_run:Boolean) { leaveLedger(ledgerId:"alice/main",dryRun:$dryRun,dry_run:$dry_run) { success message dryRun preview { collaborator current requested warnings } } }`,
  };
  const GQL_FIELD: Record<Op, string> = {
    set: "addOrUpdateLedgerCollaborator",
    remove: "deleteLedgerCollaborator",
    leave: "leaveLedger",
  };
  const MCP_TOOL: Record<Op, string> = {
    set: "setLedgerCollaborator",
    remove: "removeLedgerCollaborator",
    leave: "leaveLedger",
  };

  const call = async (
    surface: string,
    op: Op,
    args: Record<string, unknown>,
  ) => {
    if (surface === "rest") {
      const [path, method] =
        op === "leave"
          ? ["leave", "POST"]
          : [
              `collaborators/${encodeURIComponent(String(args.collaborator))}`,
              op === "set" ? "PUT" : "DELETE",
            ];
      const { collaborator: _dropped, ...body } = args;
      const response = await fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main/${path}`,
        {
          method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      return {
        success: response.status === 200,
        status: response.status,
        result: (await response.json()) as Record<string, unknown>,
      };
    }
    if (surface === "gql") {
      const result = await graphql({
        schema,
        source: GQL_SOURCE[op],
        variableValues: args,
        contextValue: { identity, getCurrentIdentity: () => identity },
      });
      return {
        success: !result.errors,
        result: result.data?.[GQL_FIELD[op]] as
          | Record<string, unknown>
          | undefined,
        errors: result.errors,
      };
    }
    const result = await client.callTool({
      name: MCP_TOOL[op],
      arguments: { ledger: "alice/main", ...args },
    });
    return {
      success: !result.isError,
      result: (
        result.structuredContent as { result?: Record<string, unknown> }
      )?.result,
    };
  };

  return {
    members,
    updateSpy,
    removeSpy,
    listSpy,
    permissionSpy,
    authorizeOrThrow,
    call,
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

const echoFor = (surface: string, value: boolean) =>
  surface === "mcp" ? { dry_run: value } : { dryRun: value };

// The set/remove/leave previews render the would-be access change on REST,
// GraphQL, and MCP; a preview changes nothing, twins agree-or-refuse alike,
// and a commit echoes the flag off with no preview (w23/m13/t004).
describe.each(["rest", "gql", "mcp"])("setLedgerCollaborator preview (%s)", (surface) => {
  it("renders the new grant and grants nothing", async () => {
    const f = await fixture();
    try {
      const flag = surface === "mcp" ? { dry_run: true } : { dryRun: true };
      const { success, result } = await f.call(surface, "set", {
        collaborator: "newbie",
        permission: "read",
        ...flag,
      });
      expect(success).toBe(true);
      expect(f.updateSpy).not.toHaveBeenCalled();
      expect(f.members.has("newbie")).toBe(false);
      expect(result).toMatchObject({
        success: true,
        ...echoFor(surface, true),
        preview: {
          collaborator: "newbie",
          current: null,
          requested: "read",
        },
      });
      if (surface === "mcp") {
        expect(result).not.toHaveProperty("dryRun");
      } else {
        expect(result).not.toHaveProperty("dry_run");
      }
      expect((result?.preview as { warnings: string[] }).warnings).toEqual([
        "This would add newbie to alice/main with read access.",
        "If newbie names no known user, applying this would fail.",
      ]);
    } finally {
      await f.close();
    }
  });

  it("refuses conflicting twins", async () => {
    const f = await fixture();
    try {
      const { success } = await f.call(surface, "set", {
        collaborator: "newbie",
        permission: "read",
        dryRun: true,
        dry_run: false,
      });
      expect(success).toBe(false);
      expect(f.updateSpy).not.toHaveBeenCalled();
      expect(f.members.has("newbie")).toBe(false);
    } finally {
      await f.close();
    }
  });

  it("commits without the flag and echoes dryRun:false", async () => {
    const f = await fixture();
    try {
      const { success, result } = await f.call(surface, "set", {
        collaborator: "newbie",
        permission: "read",
      });
      expect(success).toBe(true);
      expect(f.updateSpy).toHaveBeenCalledTimes(1);
      expect(f.members.get("newbie")).toBe("read");
      expect(result).toMatchObject({
        success: true,
        ...echoFor(surface, false),
      });
      // Absent reads undefined on REST/MCP and null on GraphQL.
      expect(result?.preview ?? undefined).toBeUndefined();
    } finally {
      await f.close();
    }
  });
});

describe.each(["rest", "gql", "mcp"])(
  "removeLedgerCollaborator preview (%s)",
  (surface) => {
    it("renders the revocation and revokes nothing", async () => {
      const f = await fixture();
      try {
        const flag = surface === "mcp" ? { dry_run: true } : { dryRun: true };
        const { success, result } = await f.call(surface, "remove", {
          collaborator: "carol",
          ...flag,
        });
        expect(success).toBe(true);
        expect(f.removeSpy).not.toHaveBeenCalled();
        expect(f.members.get("carol")).toBe("read");
        expect(result).toMatchObject({
          success: true,
          ...echoFor(surface, true),
          preview: {
            collaborator: "carol",
            current: "read",
            requested: null,
          },
        });
        if (surface === "mcp") {
          expect(result).not.toHaveProperty("dryRun");
        } else {
          expect(result).not.toHaveProperty("dry_run");
        }
        expect((result?.preview as { warnings: string[] }).warnings).toEqual([
          "This would revoke carol's read access to alice/main.",
        ]);
      } finally {
        await f.close();
      }
    });

    it("refuses conflicting twins", async () => {
      const f = await fixture();
      try {
        const { success } = await f.call(surface, "remove", {
          collaborator: "carol",
          dryRun: true,
          dry_run: false,
        });
        expect(success).toBe(false);
        expect(f.removeSpy).not.toHaveBeenCalled();
        expect(f.members.get("carol")).toBe("read");
      } finally {
        await f.close();
      }
    });

    it("commits without the flag and echoes dryRun:false", async () => {
      const f = await fixture();
      try {
        const { success, result } = await f.call(surface, "remove", {
          collaborator: "carol",
        });
        expect(success).toBe(true);
        expect(f.removeSpy).toHaveBeenCalledTimes(1);
        expect(f.members.has("carol")).toBe(false);
        expect(result).toMatchObject({
          success: true,
          ...echoFor(surface, false),
        });
        // Absent reads undefined on REST/MCP and null on GraphQL.
        expect(result?.preview ?? undefined).toBeUndefined();
      } finally {
        await f.close();
      }
    });
  },
);

describe.each(["rest", "gql", "mcp"])("leaveLedger preview (%s)", (surface) => {
  it("renders the self-removal and stays put", async () => {
    const f = await fixture();
    try {
      const flag = surface === "mcp" ? { dry_run: true } : { dryRun: true };
      const { success, result } = await f.call(surface, "leave", { ...flag });
      expect(success).toBe(true);
      expect(f.removeSpy).not.toHaveBeenCalled();
      expect(f.members.get("bob")).toBe("admin");
      expect(result).toMatchObject({
        success: true,
        ...echoFor(surface, true),
        preview: {
          collaborator: "bob",
          current: "admin",
          requested: null,
        },
      });
      if (surface === "mcp") {
        expect(result).not.toHaveProperty("dryRun");
      } else {
        expect(result).not.toHaveProperty("dry_run");
      }
      expect((result?.preview as { warnings: string[] }).warnings).toEqual([
        "This would remove your (bob) admin access to alice/main.",
      ]);
    } finally {
      await f.close();
    }
  });

  it("refuses conflicting twins", async () => {
    const f = await fixture();
    try {
      const { success } = await f.call(surface, "leave", {
        dryRun: true,
        dry_run: false,
      });
      expect(success).toBe(false);
      expect(f.removeSpy).not.toHaveBeenCalled();
      expect(f.members.get("bob")).toBe("admin");
    } finally {
      await f.close();
    }
  });

  it("commits without the flag and echoes dryRun:false", async () => {
    const f = await fixture();
    try {
      const { success, result } = await f.call(surface, "leave", {});
      expect(success).toBe(true);
      expect(f.removeSpy).toHaveBeenCalledTimes(1);
      expect(f.members.has("bob")).toBe(false);
      expect(result).toMatchObject({
        success: true,
        ...echoFor(surface, false),
      });
      // Absent reads undefined on REST/MCP and null on GraphQL.
      expect(result?.preview ?? undefined).toBeUndefined();
    } finally {
      await f.close();
    }
  });
});

it("rest agrees when both twins are true", async () => {
  const f = await fixture();
  try {
    const { success, result } = await f.call("rest", "set", {
      collaborator: "newbie",
      permission: "read",
      dryRun: true,
      dry_run: true,
    });
    expect(success).toBe(true);
    expect(f.updateSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({ dryRun: true });
  } finally {
    await f.close();
  }
});

it("gql accepts the dry_run alias alone on a set preview", async () => {
  const f = await fixture();
  try {
    const { success, result } = await f.call("gql", "set", {
      collaborator: "newbie",
      permission: "read",
      dry_run: true,
    });
    expect(success).toBe(true);
    expect(f.updateSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      dryRun: true,
      preview: { collaborator: "newbie", current: null, requested: "read" },
    });
  } finally {
    await f.close();
  }
});

it("mcp accepts the dryRun alias alone on a set preview", async () => {
  const f = await fixture();
  try {
    const { success, result } = await f.call("mcp", "set", {
      collaborator: "newbie",
      permission: "read",
      dryRun: true,
    });
    expect(success).toBe(true);
    expect(f.updateSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      dry_run: true,
      preview: { collaborator: "newbie", current: null, requested: "read" },
    });
  } finally {
    await f.close();
  }
});

it("rest refuses a set preview for an unknown ledger without granting", async () => {
  const f = await fixture();
  try {
    f.listSpy.mockRejectedValueOnce(
      new FavaApiError("Not Found", 404, { success: false, error: "Not Found" }),
    );
    const { success, status } = await f.call("rest", "set", {
      collaborator: "newbie",
      permission: "read",
      dryRun: true,
    });
    expect(success).toBe(false);
    expect(status).toBe(404);
    expect(f.updateSpy).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

it("rest refuses an unauthorized set preview without reading or granting", async () => {
  const f = await fixture();
  try {
    f.authorizeOrThrow.mockRejectedValueOnce(
      new ForbiddenError("no collaborator access"),
    );
    const { success, status } = await f.call("rest", "set", {
      collaborator: "newbie",
      permission: "read",
      dryRun: true,
    });
    expect(success).toBe(false);
    expect(status).toBe(403);
    expect(f.listSpy).not.toHaveBeenCalled();
    expect(f.updateSpy).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

it("gql accepts the dry_run alias alone on a remove preview", async () => {
  const f = await fixture();
  try {
    const { success, result } = await f.call("gql", "remove", {
      collaborator: "carol",
      dry_run: true,
    });
    expect(success).toBe(true);
    expect(f.removeSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      dryRun: true,
      preview: { collaborator: "carol", current: "read", requested: null },
    });
  } finally {
    await f.close();
  }
});

it("mcp accepts the dryRun alias alone on a remove preview", async () => {
  const f = await fixture();
  try {
    const { success, result } = await f.call("mcp", "remove", {
      collaborator: "carol",
      dryRun: true,
    });
    expect(success).toBe(true);
    expect(f.removeSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      dry_run: true,
      preview: { collaborator: "carol", current: "read", requested: null },
    });
  } finally {
    await f.close();
  }
});

it("rest renders a degraded remove preview when current access cannot be confirmed", async () => {
  const f = await fixture();
  try {
    f.permissionSpy.mockRejectedValueOnce(
      new FavaApiError("Not Found", 404, { success: false, error: "Not Found" }),
    );
    const { success, result } = await f.call("rest", "remove", {
      collaborator: "carol",
      dryRun: true,
    });
    expect(success).toBe(true);
    expect(f.removeSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      dryRun: true,
      preview: { collaborator: "carol", current: null, requested: null },
    });
    expect((result?.preview as { warnings: string[] }).warnings).toEqual([
      "This would revoke carol's access to alice/main, but no current access could be confirmed — the removal may fail if they hold no grant.",
    ]);
  } finally {
    await f.close();
  }
});

it("rest refuses an unauthorized remove preview without reading or revoking", async () => {
  const f = await fixture();
  try {
    f.authorizeOrThrow.mockRejectedValueOnce(
      new ForbiddenError("no collaborator access"),
    );
    const { success, status } = await f.call("rest", "remove", {
      collaborator: "carol",
      dryRun: true,
    });
    expect(success).toBe(false);
    expect(status).toBe(403);
    expect(f.permissionSpy).not.toHaveBeenCalled();
    expect(f.removeSpy).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

it("gql accepts the dry_run alias alone on a leave preview", async () => {
  const f = await fixture();
  try {
    const { success, result } = await f.call("gql", "leave", {
      dry_run: true,
    });
    expect(success).toBe(true);
    expect(f.removeSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      dryRun: true,
      preview: { collaborator: "bob", current: "admin", requested: null },
    });
  } finally {
    await f.close();
  }
});

it("mcp accepts the dryRun alias alone on a leave preview", async () => {
  const f = await fixture();
  try {
    const { success, result } = await f.call("mcp", "leave", {
      dryRun: true,
    });
    expect(success).toBe(true);
    expect(f.removeSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      dry_run: true,
      preview: { collaborator: "bob", current: "admin", requested: null },
    });
  } finally {
    await f.close();
  }
});

it("rest renders a degraded leave preview when current access cannot be confirmed", async () => {
  const f = await fixture();
  try {
    f.permissionSpy.mockRejectedValueOnce(
      new FavaApiError("Not Found", 404, { success: false, error: "Not Found" }),
    );
    const { success, result } = await f.call("rest", "leave", {
      dryRun: true,
    });
    expect(success).toBe(true);
    expect(f.removeSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      dryRun: true,
      preview: { collaborator: "bob", current: null, requested: null },
    });
    expect((result?.preview as { warnings: string[] }).warnings).toEqual([
      "This would remove your (bob) access to alice/main, but no current access could be confirmed.",
    ]);
  } finally {
    await f.close();
  }
});

it("rest refuses an unauthorized leave preview without reading or leaving", async () => {
  const f = await fixture();
  try {
    f.authorizeOrThrow.mockRejectedValueOnce(
      new ForbiddenError("no leave access"),
    );
    const { success, status } = await f.call("rest", "leave", {
      dryRun: true,
    });
    expect(success).toBe(false);
    expect(status).toBe(403);
    expect(f.permissionSpy).not.toHaveBeenCalled();
    expect(f.removeSpy).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

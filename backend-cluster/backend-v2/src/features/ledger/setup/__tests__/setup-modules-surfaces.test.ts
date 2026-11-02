import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerMutationResolver } from "@/features/ledger/api/resolvers/ledger-resolver.mutation";
import { LedgerQueryResolver } from "@/features/ledger/api/resolvers/ledger-resolver.query";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";
import { previewLedgerSetup, type LedgerSetup } from "../build-ledger";

/**
 * `setup.modules` means the same on REST, GraphQL, and MCP (ADR021 parity,
 * w3/m59/t002): each surface hands the specification to the one workflow,
 * the shared builder turns it into the same files, and every refusal is the
 * builder's own and creates nothing.
 */
const config = {
  api: { scopeEnforcement: "enforce" },
  gitea: { hostName: "gitea", httpPort: 3000 },
} as unknown as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
};

type Surface = "rest" | "gql" | "mcp";
type Module = { id: string; propertyName?: string };

// GraphQL spells the module and preset ids as enum names.
const GQL_MODULE: Record<string, string> = {
  "investments@1": "INVESTMENTS",
  "rental-property@1": "RENTAL_PROPERTY",
  "side-business@1": "SIDE_BUSINESS",
};
const GQL_PRESET: Record<string, string> = {
  "personal@1": "PERSONAL",
  "freelance@1": "FREELANCE",
};

const setupOf = (preset: string, modules: Module[]) => ({
  preset,
  historyStart: "2026-01-01",
  modules,
});

let schema: Awaited<ReturnType<typeof buildSchema>>;
let query: LedgerQueryResolver;
let mutation: LedgerMutationResolver;
beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [LedgerQueryResolver, LedgerMutationResolver, HealthResolver],
    container: {
      get: (target) =>
        target === LedgerQueryResolver
          ? query
          : target === LedgerMutationResolver
            ? mutation
            : new HealthResolver(),
    },
    validate: true,
  });
});

async function fixture() {
  /** The files each create would have written. */
  const created: Record<string, string>[] = [];
  const workflow = {
    previewLedgerSetup: async ({ setup }: { setup: LedgerSetup }) => ({
      ...previewLedgerSetup(setup, "2026-01-01"),
      validation: { ok: true, errors: [] },
    }),
    createLedger: async ({
      input,
    }: {
      input: { name: string; setup?: LedgerSetup };
    }) => {
      // Built before anything is created, as the real workflow does.
      const files = previewLedgerSetup(input.setup!, "2026-01-01").files;
      created.push(files);
      return {
        id: 1,
        name: input.name,
        fullName: `alice/${input.name}`,
        private: true,
      };
    },
  };
  query = new LedgerQueryResolver(workflow as never);
  mutation = new LedgerMutationResolver(workflow as never);
  const rest = await startV1TestServer(
    { workflows: { ledger: workflow } } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(identity);
  const server = assembleMcpRegistry(
    {
      identity,
      ledgerWorkflow: workflow,
      services: {},
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "setup-modules", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);

  const gqlSetup = (setup: ReturnType<typeof setupOf>) => ({
    ...setup,
    preset: GQL_PRESET[setup.preset] ?? setup.preset,
    modules: setup.modules.map((module) => ({
      ...module,
      id: GQL_MODULE[module.id] ?? module.id,
    })),
  });

  /** Preview, then create, on one surface: the result or the refusal. */
  const run = async (
    surface: Surface,
    setup: ReturnType<typeof setupOf>,
  ): Promise<
    | { ok: true; accounts: string[]; files: Record<string, string> }
    | { ok: false; message: string }
  > => {
    if (surface === "rest") {
      const post = (path: string, body: unknown) =>
        fetch(`${rest.url}/api-gateway/v1/ledgers${path}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
      const preview = await post("/preview", { setup });
      const body = (await preview.json()) as Record<string, unknown>;
      if (preview.status !== 200) {
        await post("", { name: "household", setup });
        const error = body.error as { message?: string } | undefined;
        return { ok: false, message: error?.message ?? JSON.stringify(body) };
      }
      await post("", { name: "household", setup });
      return {
        ok: true,
        accounts: body.accounts as string[],
        files: body.files as Record<string, string>,
      };
    }
    if (surface === "gql") {
      const variableValues = { setup: gqlSetup(setup) };
      const preview = await graphql({
        schema,
        source: `query($setup: LedgerSetupInput!) { previewLedgerSetup(setup: $setup) { accounts files } }`,
        variableValues,
        contextValue: { identity, getCurrentIdentity: () => identity },
      });
      await graphql({
        schema,
        source: `mutation($setup: LedgerSetupInput!) { createLedger(name: "household", setup: $setup) { name } }`,
        variableValues,
        contextValue: { identity, getCurrentIdentity: () => identity },
      });
      if (preview.errors) {
        return { ok: false, message: preview.errors[0]!.message };
      }
      const data = preview.data!.previewLedgerSetup as {
        accounts: string[];
        files: Record<string, string>;
      };
      return { ok: true, accounts: data.accounts, files: data.files };
    }
    const preview = await client.callTool({
      name: "previewLedgerSetup",
      arguments: { setup },
    });
    await client.callTool({
      name: "createLedger",
      arguments: { name: "household", setup },
    });
    const content = preview.structuredContent as {
      result?: { accounts: string[]; files: Record<string, string> };
      error?: { message: string };
    };
    if (preview.isError) {
      return { ok: false, message: content.error?.message ?? "" };
    }
    const { accounts, files } = content.result!;
    return { ok: true, accounts, files };
  };

  return {
    created,
    run,
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

const SURFACES: Surface[] = ["rest", "gql", "mcp"];

describe("setup.modules on REST, GraphQL, and MCP (w3/m59/t002)", () => {
  it("creates identical files for the same module specification", async () => {
    const f = await fixture();
    try {
      const setup = setupOf("personal@1", [
        { id: "rental-property@1", propertyName: "OakSt" },
        { id: "investments@1" },
      ]);
      const expected = previewLedgerSetup(setup as LedgerSetup, "2026-01-01");
      for (const surface of SURFACES) {
        const result = await f.run(surface, setup);
        expect({ surface, ...result }).toEqual({
          surface,
          ok: true,
          accounts: expected.accounts,
          files: expected.files,
        });
      }
      expect(f.created).toEqual([
        expected.files,
        expected.files,
        expected.files,
      ]);
      expect(expected.accounts).toEqual(
        expect.arrayContaining([
          "Assets:Brokerage",
          "Income:Rent:OakSt",
          "Expenses:Rental:OakSt:Repairs",
        ]),
      );
    } finally {
      await f.close();
    }
  });

  it.each([
    [
      "a non-personal preset",
      setupOf("freelance@1", [{ id: "investments@1" }]),
      'Module "investments@1" is accepted only with preset "personal@1", not "freelance@1"',
    ],
    [
      "a repeated module",
      setupOf("personal@1", [
        { id: "side-business@1" },
        { id: "side-business@1" },
      ]),
      'Module "side-business@1" is selected more than once',
    ],
    [
      "a property name on a module without one",
      setupOf("personal@1", [{ id: "investments@1", propertyName: "OakSt" }]),
      'Module "investments@1" takes no propertyName',
    ],
    [
      "a property name that is not an ASCII account component",
      setupOf("personal@1", [
        { id: "rental-property@1", propertyName: "Oak St" },
      ]),
      'Property name "Oak St" for "rental-property@1" is not valid',
    ],
  ])(
    "refuses %s on every surface and creates nothing",
    async (_, setup, reason) => {
      const f = await fixture();
      try {
        for (const surface of SURFACES) {
          const result = await f.run(surface, setup);
          expect({ surface, ok: result.ok }).toEqual({ surface, ok: false });
          expect(result.ok === false && result.message).toContain(reason);
        }
        expect(f.created).toEqual([]);
      } finally {
        await f.close();
      }
    },
  );

  it("refuses an unknown module id on every surface's schema", async () => {
    const f = await fixture();
    try {
      const setup = setupOf("personal@1", [{ id: "crypto@1" }]);
      for (const surface of SURFACES) {
        const result = await f.run(surface, setup);
        expect({ surface, ok: result.ok }).toEqual({ surface, ok: false });
      }
      expect(f.created).toEqual([]);
    } finally {
      await f.close();
    }
  });
});

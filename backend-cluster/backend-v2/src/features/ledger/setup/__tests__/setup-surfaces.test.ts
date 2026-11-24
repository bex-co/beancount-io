import "reflect-metadata";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import {
  ledgerCreateInput,
  ledgerPreviewInput,
} from "@/features/ledger/api/rest/v1/lifecycle-handler";
import {
  LIFECYCLE_EXECUTORS,
  LIFECYCLE_OPERATION_SCHEMAS,
} from "@/features/ai-agent/api/mcp-lifecycle";
import { LedgerMutationResolver } from "@/features/ledger/api/resolvers/ledger-resolver.mutation";
import { LedgerQueryResolver } from "@/features/ledger/api/resolvers/ledger-resolver.query";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { formatError } from "@/server/graphql/format-error";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";
import {
  buildLedgerFiles,
  previewLedgerSetup,
  type LedgerSetup,
} from "../build-ledger";

/**
 * The same setup specification must mean the same thing on REST, GraphQL,
 * and MCP (ADR026 parity): each surface parses it into the one workflow
 * command, and the shared builder turns it into the same files.
 */
const SETUP = {
  preset: "personal@1" as const,
  title: "Household",
  operatingCurrency: "EUR",
  historyStart: "2026-02-01",
  capabilities: { ownership: "enabled" as const },
  accounts: [
    { name: "Assets:Cash", openingState: "known" as const, amount: "100" },
  ],
};

describe("setup surfaces (w3/m53/t008)", () => {
  it("REST parses setup and requestId into the workflow shape", () => {
    const parsed = ledgerCreateInput.parse({
      name: "household",
      setup: SETUP,
      requestId: "req-abc",
    });
    expect(parsed.setup).toEqual(SETUP);
    expect(parsed.requestId).toBe("req-abc");
    // The parsed shape feeds the builder unchanged.
    expect(previewLedgerSetup(parsed.setup!).files).toEqual(
      previewLedgerSetup(SETUP).files,
    );
  });

  it("REST refuses an unknown preset and unknown keys", () => {
    expect(() =>
      ledgerCreateInput.parse({
        name: "household",
        setup: { preset: "nope@1" },
      }),
    ).toThrow();
    expect(() =>
      ledgerCreateInput.parse({ name: "household", bogus: true }),
    ).toThrow();
    expect(() => ledgerPreviewInput.parse({ setup: SETUP })).not.toThrow();
    expect(() => ledgerPreviewInput.parse({})).toThrow();
  });

  it("refuses a 201-character title on every surface (w21/203)", () => {
    const setup = { ...SETUP, title: "t".repeat(201) };
    // REST and MCP parse the one schema; GraphQL reaches only the builder.
    expect(() =>
      ledgerCreateInput.parse({ name: "household", setup }),
    ).toThrow();
    expect(() => previewLedgerSetup(setup)).toThrow(
      "Title must be at most 200 characters",
    );
    expect(() =>
      previewLedgerSetup({ ...SETUP, title: "t".repeat(200) }),
    ).not.toThrow();
  });

  // w21/549: a signed opening amount means the same on every surface.
  it("accepts an explicit plus sign on REST, MCP and the builder (w21/549)", () => {
    const setup = {
      ...SETUP,
      accounts: [
        {
          name: "Liabilities:CreditCard",
          openingState: "known" as const,
          amount: "+50",
        },
      ],
    };
    const viaRest = ledgerCreateInput.parse({ name: "household", setup });
    const viaMcp = LIFECYCLE_OPERATION_SCHEMAS.create.parse({
      name: "household",
      setup,
    });
    expect(viaMcp.setup).toEqual(viaRest.setup);
    // GraphQL reaches only the builder, which takes the same text.
    expect(previewLedgerSetup(setup).files["main.bean"]).toContain(
      "balance Liabilities:CreditCard 50 EUR",
    );
    expect(() =>
      ledgerCreateInput.parse({
        name: "household",
        setup: {
          ...SETUP,
          accounts: [{ ...setup.accounts[0], amount: "++50" }],
        },
      }),
    ).toThrow();
  });

  // w1/214: a repeated account overwrote the earlier entry silently.
  it("refuses an account listed twice on every surface", async () => {
    const setup = {
      ...SETUP,
      accounts: [
        { name: "Assets:Cash", openingState: "known" as const, amount: "10" },
        { name: "Assets:Cash", openingState: "zero" as const },
      ],
    };
    // REST and MCP accept the shape; the one builder they and GraphQL reach
    // refuses it.
    expect(() =>
      ledgerCreateInput.parse({ name: "household", setup }),
    ).not.toThrow();
    expect(() => previewLedgerSetup(setup)).toThrow(
      'Account "Assets:Cash" is listed more than once',
    );
    const context = {
      identity: { userId: "usr_1" },
      platform: "web",
      ledgerWorkflow: {
        previewLedgerSetup: async ({ setup: spec }: { setup: typeof setup }) =>
          previewLedgerSetup(spec),
      },
    } as never;
    // The MCP boundary renders the thrown refusal as VALIDATION_FAILED.
    await expect(
      LIFECYCLE_EXECUTORS.preview(context, { setup }),
    ).rejects.toMatchObject({
      category: "VALIDATION_FAILED",
      message: expect.stringContaining(
        '"Assets:Cash" is listed more than once',
      ),
    });
  });

  it("MCP preview returns the builder result and create passes setup through", async () => {
    const calls: unknown[] = [];
    const context = {
      identity: { userId: "usr_1" },
      platform: "web",
      ledgerWorkflow: {
        previewLedgerSetup: async ({ setup }: { setup: typeof SETUP }) =>
          previewLedgerSetup(setup),
        createLedger: async (params: unknown) => {
          calls.push(params);
          return { id: "alice/household" };
        },
      },
    } as never;

    const preview = await LIFECYCLE_EXECUTORS.preview(context, {
      setup: SETUP,
    });
    expect(preview.ok).toBe(true);
    expect(preview.result.preset).toBe("personal@1");
    expect(preview.result.accounts).toContain("Assets:Cash");

    await LIFECYCLE_EXECUTORS.create(context, {
      name: "household",
      setup: SETUP,
      requestId: "req-abc",
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      input: { name: "household", setup: SETUP, requestId: "req-abc" },
    });
  });

  it("MCP and REST publish the same setup schema shape", () => {
    expect(LIFECYCLE_OPERATION_SCHEMAS.create.shape.setup).toBeDefined();
    expect(LIFECYCLE_OPERATION_SCHEMAS.preview.shape.setup).toBeDefined();
    const viaMcp = LIFECYCLE_OPERATION_SCHEMAS.create.parse({
      name: "household",
      setup: SETUP,
    });
    const viaRest = ledgerCreateInput.parse({
      name: "household",
      setup: SETUP,
    });
    expect(viaMcp.setup).toEqual(viaRest.setup);
  });
});

// w31/078: oversized setup opening amounts must be refused upfront across
// MCP, REST, and GraphQL before checking setup files or creating a repo.
describe("28-significant-digit setup amount parity across REST, GraphQL, and MCP (w31/078)", () => {
  const config = {
    api: { scopeEnforcement: "enforce" },
    gitea: { hostName: "gitea", httpPort: 3000 },
  } as unknown as AppConfig;
  const identity: Identity = {
    userId: "usr_alice",
    method: "oauth",
    scopes: new Set(["ledger.read", "ledger.write"]),
  };

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

  async function createHarness() {
    const checkSetupFilesCalls: Record<string, string>[] = [];
    const createdLedgers: Record<string, string>[] = [];
    const workflow = {
      previewLedgerSetup: async ({ setup }: { setup: LedgerSetup }) => {
        const preview = previewLedgerSetup(setup, "2026-01-01");
        checkSetupFilesCalls.push(preview.files);
        return {
          ...preview,
          validation: { ok: true, errors: [] },
        };
      },
      createLedger: async ({
        input,
      }: {
        input: { name: string; setup?: LedgerSetup };
      }) => {
        const files = buildLedgerFiles(input.setup!, "2026-01-01");
        checkSetupFilesCalls.push(files);
        createdLedgers.push(files);
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
    const client = new Client({ name: "setup-surfaces-decimal", version: "1" });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([client.connect(a), server.connect(b)]);
    return {
      checkSetupFilesCalls,
      createdLedgers,
      rest,
      client,
      close: async () => {
        await client.close();
        await server.close();
        await rest.close();
      },
    };
  }

  it.each([
    ["29-significant-digit fraction", "1.0000000000000000000000000001"],
    ["30-fraction-digit small decimal", "0.000000000000000000000000000001"],
    ["29-digit integer", "10000000000000000000000000000"],
    ["34-digit overflow", "9999999999999999999999999999999999"],
  ])(
    "refuses %s (%s) with VALIDATION_FAILED on setup across MCP, REST, and GraphQL before checking or creating",
    async (_label, amount) => {
      const h = await createHarness();
      try {
        const setup = {
          preset: "personal@1" as const,
          accounts: [
            { name: "Assets:Bank", openingState: "known" as const, amount },
          ],
        };
        const gqlSetup = {
          preset: "PERSONAL",
          accounts: [{ name: "Assets:Bank", openingState: "KNOWN", amount }],
        };

        // REST preview + create
        const restPreview = await fetch(
          `${h.rest.url}/api-gateway/v1/ledgers/preview`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ setup }),
          },
        );
        expect(restPreview.status).toBe(400);
        const restPreviewBody = (await restPreview.json()) as {
          error?: { code?: string; message?: string };
        };
        expect(restPreviewBody.error?.code).toBe("VALIDATION_FAILED");
        expect(restPreviewBody.error?.message).toContain(
          "28 significant digits",
        );

        const restCreate = await fetch(`${h.rest.url}/api-gateway/v1/ledgers`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "household", setup }),
        });
        expect(restCreate.status).toBe(400);
        const restCreateBody = (await restCreate.json()) as {
          error?: { code?: string; message?: string };
        };
        expect(restCreateBody.error?.code).toBe("VALIDATION_FAILED");
        expect(restCreateBody.error?.message).toContain(
          "28 significant digits",
        );

        // GraphQL preview + create
        const gqlPreview = await graphql({
          schema,
          source: `query($setup: LedgerSetupInput!) { previewLedgerSetup(setup: $setup) { accounts files } }`,
          variableValues: { setup: gqlSetup },
          contextValue: { identity, getCurrentIdentity: () => identity },
        });
        expect(gqlPreview.errors?.length).toBeGreaterThan(0);
        const gqlPreviewFormatted = formatError(
          { message: gqlPreview.errors![0]!.message },
          gqlPreview.errors![0]!,
        );
        expect(gqlPreviewFormatted.extensions?.code).toBe("VALIDATION_FAILED");
        expect(gqlPreviewFormatted.message).toContain("28 significant digits");

        const gqlCreate = await graphql({
          schema,
          source: `mutation($setup: LedgerSetupInput!) { createLedger(name: "household", setup: $setup) { name } }`,
          variableValues: { setup: gqlSetup },
          contextValue: { identity, getCurrentIdentity: () => identity },
        });
        expect(gqlCreate.errors?.length).toBeGreaterThan(0);
        const gqlCreateFormatted = formatError(
          { message: gqlCreate.errors![0]!.message },
          gqlCreate.errors![0]!,
        );
        expect(gqlCreateFormatted.extensions?.code).toBe("VALIDATION_FAILED");
        expect(gqlCreateFormatted.message).toContain("28 significant digits");

        // MCP preview + create
        const mcpPreview = await h.client.callTool({
          name: "previewLedgerSetup",
          arguments: { setup },
        });
        expect(mcpPreview.isError).toBe(true);
        const mcpPreviewContent = mcpPreview.structuredContent as {
          error?: { code?: string; message?: string };
        };
        expect(mcpPreviewContent.error?.code).toBe("VALIDATION_FAILED");
        expect(mcpPreviewContent.error?.message).toContain(
          "28 significant digits",
        );

        const mcpCreate = await h.client.callTool({
          name: "createLedger",
          arguments: { name: "household", setup },
        });
        expect(mcpCreate.isError).toBe(true);
        const mcpCreateContent = mcpCreate.structuredContent as {
          error?: { code?: string; message?: string };
        };
        expect(mcpCreateContent.error?.code).toBe("VALIDATION_FAILED");
        expect(mcpCreateContent.error?.message).toContain(
          "28 significant digits",
        );

        expect(h.checkSetupFilesCalls).toEqual([]);
        expect(h.createdLedgers).toEqual([]);
      } finally {
        await h.close();
      }
    },
  );

  it.each([
    ["28-digit boundary", "1234567890123456789012345678"],
    [
      "leading-zero amount within 28 digits",
      "00000000000000000000000000001.23",
    ],
  ])(
    "accepts %s (%s) across MCP, REST, and GraphQL",
    async (_label, amount) => {
      const h = await createHarness();
      try {
        const setup = {
          preset: "personal@1" as const,
          accounts: [
            { name: "Assets:Bank", openingState: "known" as const, amount },
          ],
        };
        const gqlSetup = {
          preset: "PERSONAL",
          accounts: [{ name: "Assets:Bank", openingState: "KNOWN", amount }],
        };

        const restPreview = await fetch(
          `${h.rest.url}/api-gateway/v1/ledgers/preview`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ setup }),
          },
        );
        expect(restPreview.status).toBe(200);

        const gqlPreview = await graphql({
          schema,
          source: `query($setup: LedgerSetupInput!) { previewLedgerSetup(setup: $setup) { accounts files } }`,
          variableValues: { setup: gqlSetup },
          contextValue: { identity, getCurrentIdentity: () => identity },
        });
        expect(gqlPreview.errors).toBeUndefined();

        const mcpPreview = await h.client.callTool({
          name: "previewLedgerSetup",
          arguments: { setup },
        });
        expect(mcpPreview.isError).toBeFalsy();
      } finally {
        await h.close();
      }
    },
  );

  // w31/081: non-ASCII component starts rustledger refuses (Ll, Sc, So, Pd) and
  // invisible format characters (ZWSP) must be refused upfront across MCP, REST,
  // and GraphQL, while valid Unicode (Épargne, 日本, خانه‌ها with ZWNJ) passes.
  it.each([
    ["lowercase non-ASCII start", "Assets:Bank:épargne"],
    ["lowercase non-ASCII first component", "Assets:épargne"],
    ["currency symbol start", "Assets:Bank:€"],
    ["emoji start", "Assets:Bank:😀"],
    ["em-dash start", "Assets:Bank:—"],
    ["zero-width space inside component", "Assets:Bank:Foo\u200bBar"],
  ])(
    "refuses blank@1 account with %s (%s) with VALIDATION_FAILED on setup across MCP, REST, and GraphQL (w31/081)",
    async (_label, accountName) => {
      const h = await createHarness();
      try {
        const setup = {
          preset: "blank@1" as const,
          accounts: [{ name: accountName }],
        };
        const gqlSetup = {
          preset: "BLANK",
          accounts: [{ name: accountName }],
        };

        const restPreview = await fetch(
          `${h.rest.url}/api-gateway/v1/ledgers/preview`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ setup }),
          },
        );
        expect(restPreview.status).toBe(400);
        expect(await restPreview.json()).toMatchObject({
          error: {
            code: "VALIDATION_FAILED",
            message: expect.stringContaining("is not a Beancount account name"),
          },
        });

        const restCreate = await fetch(`${h.rest.url}/api-gateway/v1/ledgers`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "household", setup }),
        });
        expect(restCreate.status).toBe(400);
        expect(await restCreate.json()).toMatchObject({
          error: {
            code: "VALIDATION_FAILED",
            message: expect.stringContaining("is not a Beancount account name"),
          },
        });

        const gqlPreview = await graphql({
          schema,
          source: `query($setup: LedgerSetupInput!) { previewLedgerSetup(setup: $setup) { accounts files } }`,
          variableValues: { setup: gqlSetup },
          contextValue: { identity, getCurrentIdentity: () => identity },
        });
        expect(gqlPreview.errors?.length).toBeGreaterThan(0);
        const gqlPreviewFormatted = formatError(
          { message: gqlPreview.errors![0]!.message },
          gqlPreview.errors![0]!,
        );
        expect(gqlPreviewFormatted.extensions?.code).toBe("VALIDATION_FAILED");
        expect(gqlPreviewFormatted.message).toContain(
          "is not a Beancount account name",
        );

        const gqlCreate = await graphql({
          schema,
          source: `mutation($setup: LedgerSetupInput!) { createLedger(name: "household", setup: $setup) { name } }`,
          variableValues: { setup: gqlSetup },
          contextValue: { identity, getCurrentIdentity: () => identity },
        });
        expect(gqlCreate.errors?.length).toBeGreaterThan(0);
        const gqlCreateFormatted = formatError(
          { message: gqlCreate.errors![0]!.message },
          gqlCreate.errors![0]!,
        );
        expect(gqlCreateFormatted.extensions?.code).toBe("VALIDATION_FAILED");
        expect(gqlCreateFormatted.message).toContain(
          "is not a Beancount account name",
        );

        const mcpPreview = await h.client.callTool({
          name: "previewLedgerSetup",
          arguments: { setup },
        });
        expect(mcpPreview.isError).toBe(true);
        expect(mcpPreview.structuredContent).toMatchObject({
          error: {
            code: "VALIDATION_FAILED",
            message: expect.stringContaining("is not a Beancount account name"),
          },
        });

        const mcpCreate = await h.client.callTool({
          name: "createLedger",
          arguments: { name: "household", setup },
        });
        expect(mcpCreate.isError).toBe(true);
        expect(mcpCreate.structuredContent).toMatchObject({
          error: {
            code: "VALIDATION_FAILED",
            message: expect.stringContaining("is not a Beancount account name"),
          },
        });

        expect(h.checkSetupFilesCalls).toEqual([]);
        expect(h.createdLedgers).toEqual([]);
      } finally {
        await h.close();
      }
    },
  );

  it.each(["Assets:Bank:Épargne", "Assets:Bank:日本", "Assets:Bank:خانه‌ها"])(
    "accepts valid Unicode blank@1 account %s across MCP, REST, and GraphQL (w31/081)",
    async (accountName) => {
      const h = await createHarness();
      try {
        const setup = {
          preset: "blank@1" as const,
          accounts: [{ name: accountName }],
        };
        const gqlSetup = {
          preset: "BLANK",
          accounts: [{ name: accountName }],
        };

        const restPreview = await fetch(
          `${h.rest.url}/api-gateway/v1/ledgers/preview`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ setup }),
          },
        );
        expect(restPreview.status).toBe(200);

        const gqlPreview = await graphql({
          schema,
          source: `query($setup: LedgerSetupInput!) { previewLedgerSetup(setup: $setup) { accounts files } }`,
          variableValues: { setup: gqlSetup },
          contextValue: { identity, getCurrentIdentity: () => identity },
        });
        expect(gqlPreview.errors).toBeUndefined();

        const mcpPreview = await h.client.callTool({
          name: "previewLedgerSetup",
          arguments: { setup },
        });
        expect(mcpPreview.isError).toBeFalsy();
      } finally {
        await h.close();
      }
    },
  );
});

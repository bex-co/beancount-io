import "reflect-metadata";
import {
  ledgerCreateInput,
  ledgerPreviewInput,
} from "@/features/ledger/api/rest/v1/lifecycle-handler";
import {
  LIFECYCLE_EXECUTORS,
  LIFECYCLE_OPERATION_SCHEMAS,
} from "@/features/ai-agent/api/mcp-lifecycle";
import { previewLedgerSetup } from "../build-ledger";

/**
 * The same setup specification must mean the same thing on REST, GraphQL,
 * and MCP (ADR021 parity): each surface parses it into the one workflow
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

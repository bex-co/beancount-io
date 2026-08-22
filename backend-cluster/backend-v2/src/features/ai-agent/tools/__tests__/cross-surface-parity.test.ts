import "reflect-metadata";
import { executeBqlQuery } from "../bql-query-tool";
import { LedgerShellQueryResolver } from "@/features/ledger/api/resolvers/ledger-shell-resolver.query";
import { LedgerShellService } from "@/features/ledger/service/ledger-shell-service";
import type { Identity } from "@/server/api/identity";

/**
 * w1/m19 ported the MCP `runBqlQuery` tool from its own fava-direct
 * implementation onto `LedgerShellService` — the same service the GraphQL
 * `queryShellText` resolver calls. This test drives BOTH surfaces with the
 * same identity and query against the same faked Fava boundary and asserts
 * they return byte-identical text (ADR 0006 D1/D6's cross-surface-parity
 * requirement, and the milestone's own "tool outputs byte-equivalent" DoD).
 */
describe("cross-surface parity: MCP runBqlQuery vs GraphQL queryShellText", () => {
  const LEDGER_ID = "alice/personal";
  const QUERY = "SELECT account, sum(position) WHERE year = 2024";

  function buildService() {
    const mockGetLedger = jest.fn().mockResolvedValue({
      data: { success: true, data: { id: 1, private: true } },
    });
    const mockQueryShellText = jest.fn().mockResolvedValue({
      data: { success: true, data: { text: "Assets:Cash  1234.56 USD" } },
    });

    const favaClientFactory = {
      getAdminClient: () => ({ ledgers: { getLedger: mockGetLedger } }),
      getPublicApiClient: async () => ({
        shell: { queryShellText: mockQueryShellText },
      }),
    };
    const models = {
      user: {
        getUserByUsername: jest.fn().mockResolvedValue({ id: "alice" }),
      },
    };
    return new LedgerShellService(favaClientFactory as any, models as any, {} as any);
  }

  const IDENTITY: Identity = {
    userId: "alice",
    method: "oauth",
    scopes: new Set(["ledger.read"]),
    capabilityExempt: false,
  };

  it("MCP tool and GraphQL resolver return the same text for the same query", async () => {
    const ledgerShell = buildService();

    const mcpResult = await executeBqlQuery(
      { services: { ledgerShell } as any, identity: IDENTITY, ledgerId: LEDGER_ID },
      { query: QUERY },
    );

    const resolver = new LedgerShellQueryResolver(ledgerShell);
    const graphqlResult = await resolver.queryShellText(
      { ledgerId: LEDGER_ID, query: QUERY },
      { identity: IDENTITY } as any,
    );

    expect(mcpResult).toEqual({ ok: true, result: "Assets:Cash  1234.56 USD" });
    expect(graphqlResult).not.toBeNull();
    expect(graphqlResult!.text).toBe("Assets:Cash  1234.56 USD");
    expect(mcpResult.ok && mcpResult.result).toBe(graphqlResult!.text);
  });
});

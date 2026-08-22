import { executeBqlQuery } from "../../tools/bql-query-tool";
import { LedgerShellService } from "@/features/ledger/service/ledger-shell-service";
import type { Identity } from "@/server/api/identity";
import { ForbiddenError } from "@/shared/errors";

/**
 * ADR 0006 D4/D9: MCP used to authorize once, at connect, for the whole
 * session — a collaborator removed mid-session kept working until the
 * client reconnected. w1/m19 deleted that check; authorization now happens
 * inside the ledger service on every tool call (mcp-route.ts's
 * `resolveMcpLedgerId` no longer touches the database at all).
 *
 * This test proves the property that removal was FOR: revoking access
 * between two tool calls in the same MCP conversation is honored by the very
 * next call, not merely at the next session. It exercises the real
 * `LedgerShellService` + `authorizeLedger` seam (not a mock of the seam
 * itself, which would just prove the mock behaves as configured) — only the
 * database/Fava boundary is faked, and that fake is what "revokes" access
 * between the two calls.
 */
describe("MCP per-call authorization: mid-session revocation", () => {
  const LEDGER_ID = "alice/personal";
  const COLLABORATOR_ID = "bob";

  function identity(): Identity {
    // A fresh object per call, exactly like resolveIdentity() produces one
    // per incoming HTTP request under the streamable-HTTP transport's
    // Stateless:true mode — nothing here is shared across "requests".
    return {
      userId: COLLABORATOR_ID,
      method: "oauth",
      ledgerScope: LEDGER_ID,
      scopes: new Set(["ledger.read"]),
      capabilityExempt: false,
    };
  }

  function buildService(isCollaborator: () => boolean) {
    const mockGetLedger = jest
      .fn()
      .mockResolvedValue({ data: { success: true, data: { id: 1, private: true } } });
    const mockGetLedgerCollaboratorPermission = jest.fn().mockImplementation(
      async () => ({
        data: {
          success: true,
          data: { permission: isCollaborator() ? "read" : null },
        },
      }),
    );
    const mockQueryShellText = jest
      .fn()
      .mockResolvedValue({ data: { success: true, data: { text: "ok" } } });

    const favaClientFactory = {
      getAdminClient: () => ({ ledgers: { getLedger: mockGetLedger } }),
      getApiContext: async () => ({
        favaApiClient: {
          collaborators: {
            getLedgerCollaboratorPermission: mockGetLedgerCollaboratorPermission,
          },
        },
      }),
      getPublicApiClient: async () => ({
        shell: { queryShellText: mockQueryShellText },
      }),
    };

    const models = {
      user: {
        getUserByUsername: jest.fn().mockResolvedValue({ id: "alice" }),
        getById: jest
          .fn()
          .mockResolvedValue({ id: COLLABORATOR_ID, ledger_username: "bob" }),
      },
    };

    return new LedgerShellService(favaClientFactory as any, models as any, {} as any);
  }

  it("the next tool call is denied as soon as the collaborator is removed — no reconnect needed", async () => {
    let collaboratorStillGranted = true;
    const ledgerShell = buildService(() => collaboratorStillGranted);

    // Call 1: still a collaborator — succeeds, using a fresh Identity object
    // (as the first MCP request would produce).
    await expect(
      executeBqlQuery(
        { services: { ledgerShell } as any, identity: identity(), ledgerId: LEDGER_ID },
        { query: "BALANCES" },
      ),
    ).resolves.toEqual({ ok: true, result: "ok" });

    // Access is revoked between the two tool calls — exactly what removing a
    // collaborator mid-conversation does.
    collaboratorStillGranted = false;

    // Call 2: a second, independent MCP request (fresh Identity object, same
    // conversation). Must fail now, not at the next session.
    const secondCall = await executeBqlQuery(
      { services: { ledgerShell } as any, identity: identity(), ledgerId: LEDGER_ID },
      { query: "BALANCES" },
    );
    expect(secondCall.ok).toBe(false);
  });

  it("control: without revocation, the second call still succeeds (isolates the effect above to the permission change)", async () => {
    const ledgerShell = buildService(() => true);

    await expect(
      executeBqlQuery(
        { services: { ledgerShell } as any, identity: identity(), ledgerId: LEDGER_ID },
        { query: "BALANCES" },
      ),
    ).resolves.toEqual({ ok: true, result: "ok" });

    await expect(
      executeBqlQuery(
        { services: { ledgerShell } as any, identity: identity(), ledgerId: LEDGER_ID },
        { query: "BALANCES" },
      ),
    ).resolves.toEqual({ ok: true, result: "ok" });
  });

  it("authorizeLedger itself throws ForbiddenError once revoked (the mechanism the tool's ok:false wraps)", async () => {
    const ledgerShell = buildService(() => false);
    await expect(
      ledgerShell.queryShellText({
        ledgerId: LEDGER_ID,
        identity: identity(),
        query: "BALANCES",
      }),
    ).rejects.toThrow(ForbiddenError);
  });
});

import type { Identity } from "@/server/api/identity";
import { evaluateScope } from "@/server/api/op-class";
import {
  AUTHORIZATION_ACTIONS,
  AuthorizationDeniedError,
  AuthorizationService,
  LEDGER_RELATIONSHIPS,
  type RelationshipCheck,
} from "@/server/api/authorization";
import { resolveAgentAccessMode } from "../../agent-access";

const LEDGER_ID = "alice/main";
const CHAT_OPS = [
  "REST POST /api-gateway/agent",
  "REST POST /api-gateway/ask-agent",
  "REST POST /api-gateway/ai/openai/chat/completions",
  "REST POST /api-gateway/ai/anthropic/v1/messages",
] as const;

function credential(
  scope: "ledger.read" | "ledger.write" | "ledger.admin",
): Identity {
  return {
    userId: "usr_1",
    method: "oauth",
    scopes: new Set([scope]),
    ledgerScope: LEDGER_ID,
  };
}

describe("chat authorization contract", () => {
  it.each(CHAT_OPS)(
    "keeps %s write-budgeted while deferring to the PDP",
    (op) => {
      const decision = evaluateScope(credential("ledger.read"), op);
      expect(decision).toMatchObject({
        opClass: "write",
        requiredScope: "ledger.write",
        allowed: true,
        authorizationAction: expect.any(String),
      });
      expect(Object.values(AUTHORIZATION_ACTIONS)).toContain(
        decision.authorizationAction,
      );
    },
  );

  it("keeps agent mode useful for a reader while the PDP rejects writes", async () => {
    const check = jest.fn(
      async ({ relation }: RelationshipCheck) =>
        relation === LEDGER_RELATIONSHIPS.READ_CONTENTS,
    );

    await expect(
      resolveAgentAccessMode({
        authorization: new AuthorizationService({ check }),
        identity: credential("ledger.read"),
        ledgerId: LEDGER_ID,
        requestedMode: "agent",
      }),
    ).resolves.toBe("read");
    expect(check.mock.calls.map(([input]) => input.relation)).toEqual([
      LEDGER_RELATIONSHIPS.READ_CONTENTS,
    ]);
  });

  it("does not turn cumulative scopes into broader ledger access", async () => {
    const identity = {
      ...credential("ledger.write"),
      ledgerScope: "alice/other",
    };

    await expect(
      resolveAgentAccessMode({
        authorization: new AuthorizationService({ check: jest.fn() }),
        identity,
        ledgerId: LEDGER_ID,
        requestedMode: "ask",
      }),
    ).rejects.toThrow(AuthorizationDeniedError);
  });
});

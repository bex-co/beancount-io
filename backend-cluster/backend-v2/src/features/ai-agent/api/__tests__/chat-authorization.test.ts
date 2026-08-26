import { ForbiddenError } from "@/shared/errors";
import type { Identity } from "@/server/api/identity";
import { evaluateScope } from "@/server/api/op-class";
import { assertLedgerAuthorization } from "@/features/ledger/utils/authorize-ledger";

const LEDGER_ID = "alice/main";
const CHAT_OPS = [
  "REST POST /api-gateway/agent",
  "REST POST /api-gateway/ask-agent",
  "REST POST /api-gateway/ai/openai/chat/completions",
  "REST POST /api-gateway/ai/anthropic/v1/messages",
] as const;

function credential(scope: "ledger.read" | "ledger.write" | "ledger.admin"):
  Identity {
  return {
    userId: "usr_1",
    method: "oauth",
    scopes: new Set([scope]),
    ledgerScope: LEDGER_ID,
    capabilityExempt: false,
  };
}

describe("chat authorization contract", () => {
  it.each(CHAT_OPS)("keeps the write-capable route %s classified as write", (op) => {
    const decision = evaluateScope(credential("ledger.read"), op);
    expect(decision).toMatchObject({
      opClass: "write",
      requiredScope: "ledger.write",
      allowed: false,
    });
  });

  it.each(["ledger.write", "ledger.admin"] as const)(
    "lets a %s chat credential read before it writes",
    (scope) => {
      const identity = credential(scope);

      for (const op of CHAT_OPS) {
        expect(evaluateScope(identity, op).allowed).toBe(true);
      }
      expect(() =>
        assertLedgerAuthorization(identity, LEDGER_ID, "read"),
      ).not.toThrow();
      expect(() =>
        assertLedgerAuthorization(identity, LEDGER_ID, "write"),
      ).not.toThrow();
    },
  );

  it("does not turn cumulative scopes into broader ledger access", () => {
    const identity = {
      ...credential("ledger.write"),
      ledgerScope: "alice/other",
    };

    expect(() =>
      assertLedgerAuthorization(identity, LEDGER_ID, "read"),
    ).toThrow(ForbiddenError);
  });
});

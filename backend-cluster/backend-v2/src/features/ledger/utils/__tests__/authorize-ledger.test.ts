import { authorizeLedger } from "../authorize-ledger";
import {
  AUTHORIZATION_ACTIONS,
  ledgerResource,
} from "@/server/api/authorization";
import type { Identity } from "@/server/api/identity";

const identity: Identity = {
  userId: "usr_1",
  method: "oauth",
  tokenId: "tok_1",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "owner/main",
};

describe("authorizeLedger PDP adapter", () => {
  const deps = (authorizeOrThrow: jest.Mock) =>
    ({ authorization: { authorizeOrThrow } }) as never;

  it("passes the exact canonical action, identity, and ledger resource", async () => {
    const authorizeOrThrow = jest.fn().mockResolvedValue({ allowed: true });
    await authorizeLedger(
      identity,
      "owner/main",
      AUTHORIZATION_ACTIONS.LEDGER_FILES_WRITE,
      deps(authorizeOrThrow),
    );
    expect(authorizeOrThrow).toHaveBeenCalledWith({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_FILES_WRITE,
      resource: ledgerResource("owner/main"),
    });
  });

  it("uses a trusted anonymous principal for public-read evaluation", async () => {
    const authorizeOrThrow = jest.fn().mockResolvedValue({ allowed: true });
    await authorizeLedger(
      undefined,
      "owner/public",
      AUTHORIZATION_ACTIONS.LEDGER_REPORTS_READ,
      deps(authorizeOrThrow),
    );
    expect(authorizeOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        principal: expect.objectContaining({
          kind: "anonymous",
          userId: "anonymous",
        }),
      }),
    );
  });

  it("makes one independent PDP call per invocation", async () => {
    const authorizeOrThrow = jest.fn().mockResolvedValue({ allowed: true });
    const inputDeps = deps(authorizeOrThrow);
    await authorizeLedger(
      identity,
      "owner/main",
      AUTHORIZATION_ACTIONS.LEDGER_SHELL_READ,
      inputDeps,
    );
    await authorizeLedger(
      identity,
      "owner/main",
      AUTHORIZATION_ACTIONS.LEDGER_SHELL_READ,
      inputDeps,
    );
    expect(authorizeOrThrow).toHaveBeenCalledTimes(2);
  });
});

import "reflect-metadata";
import type { ApiScope, Identity } from "@/server/api/identity";
import { ForbiddenError, UnauthenticatedError } from "@/shared/errors";
import { customAuthChecker } from "../auth-checker";
import type { IContext } from "../context";

type Operation = "query" | "mutation" | "subscription";

const authChecker = customAuthChecker as unknown as (
  data: {
    context: IContext;
    info: { operation: { operation: Operation } };
  },
  roles: ApiScope[],
) => boolean;

function identity(overrides: Partial<Identity> = {}): Identity {
  return {
    userId: "user-123",
    method: "oauth",
    scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
    capabilityExempt: false,
    ...overrides,
  };
}

function authorize(
  caller: Identity | undefined,
  operation: Operation,
  roles: ApiScope[] = [],
): boolean {
  return authChecker(
    {
      context: { identity: caller } as IContext,
      info: { operation: { operation } },
    },
    roles,
  );
}

describe("customAuthChecker", () => {
  it("rejects a context without a resolved identity", () => {
    expect(() => authorize(undefined, "query")).toThrow(UnauthenticatedError);
  });

  it("maps queries and subscriptions to ledger.read", () => {
    for (const operation of ["query", "subscription"] as const) {
      expect(() =>
        authorize(identity({ scopes: new Set() }), operation),
      ).toThrow(ForbiddenError);
      expect(
        authorize(identity({ scopes: new Set(["ledger.read"]) }), operation),
      ).toBe(true);
    }
  });

  it("maps mutations to ledger.write", () => {
    expect(() =>
      authorize(identity({ scopes: new Set(["ledger.read"]) }), "mutation"),
    ).toThrow(ForbiddenError);
    expect(
      authorize(identity({ scopes: new Set(["ledger.write"]) }), "mutation"),
    ).toBe(true);
    expect(
      authorize(identity({ scopes: new Set(["ledger.admin"]) }), "mutation"),
    ).toBe(true);
  });

  it("uses an explicit decorator scope for admin operations", () => {
    expect(() =>
      authorize(identity({ scopes: new Set(["ledger.write"]) }), "mutation", [
        "ledger.admin",
      ]),
    ).toThrow(ForbiddenError);
    expect(
      authorize(identity({ scopes: new Set(["ledger.admin"]) }), "mutation", [
        "ledger.admin",
      ]),
    ).toBe(true);
  });

  it("keeps legacy session identities full-power", () => {
    expect(
      authorize(
        identity({
          method: "session",
          scopes: new Set(),
          capabilityExempt: true,
        }),
        "mutation",
        ["ledger.admin"],
      ),
    ).toBe(true);
  });
});

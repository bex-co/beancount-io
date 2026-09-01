import type { RouterContext } from "@koa/router";
import type { Identity } from "@/server/api/identity";
import { ForbiddenError, UnauthenticatedError } from "@/shared/errors";
import { resolveAuthUser } from "../route-guards";

const getById = jest.fn();
const deps = {
  db: {} as never,
  models: { user: { getById } as never },
};

function ctx(identity?: Identity): RouterContext {
  return { state: { identity } } as RouterContext;
}

function oauth(scopes: string[]): Identity {
  return {
    userId: "user-1",
    method: "oauth",
    scopes: new Set(scopes),
  };
}

describe("resolveAuthUser", () => {
  beforeEach(() => {
    getById.mockReset();
    getById.mockResolvedValue({ id: "user-1" });
  });

  it("requires the identity resolved by REST middleware", async () => {
    await expect(resolveAuthUser(ctx(), deps)).rejects.toThrow(
      UnauthenticatedError,
    );
    expect(getById).not.toHaveBeenCalled();
  });

  it("denies an under-scoped OAuth caller before loading the user", async () => {
    await expect(
      resolveAuthUser(ctx(oauth(["ledger.read"])), deps, "write"),
    ).rejects.toThrow(ForbiddenError);
    expect(getById).not.toHaveBeenCalled();
  });

  it("returns the original scoped identity instead of reconstructing trust", async () => {
    const identity = oauth(["ledger.write"]);
    await expect(
      resolveAuthUser(ctx(identity), deps, "write"),
    ).resolves.toEqual({
      user: { id: "user-1" },
      identity,
    });
  });

  it("keeps legacy session callers capability-exempt", async () => {
    const identity: Identity = {
      userId: "user-1",
      method: "session",
      scopes: new Set(),
    };
    await expect(
      resolveAuthUser(ctx(identity), deps, "admin"),
    ).resolves.toEqual({
      user: { id: "user-1" },
      identity,
    });
  });
});

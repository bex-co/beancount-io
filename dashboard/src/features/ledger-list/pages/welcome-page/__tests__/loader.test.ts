import { describe, expect, it, vi } from "vitest";
import { welcomeLoader } from "../loader";

vi.mock("@tanstack/react-router", () => ({
  redirect: (options: unknown) => options,
}));

describe("first-ledger OAuth return", () => {
  it("returns an authenticated user to the same interaction once a ledger exists", async () => {
    const query = vi
      .fn()
      .mockResolvedValue({ data: { listLedgers: [{ id: "unused" }] } });
    await expect(
      welcomeLoader({
        context: { userProfile: { id: "user" }, client: { query } },
        deps: { oauthUid: "interaction-1", oauthScope: "openid ledger.read" },
      } as unknown as Parameters<typeof welcomeLoader>[0]),
    ).rejects.toEqual({
      to: "/oauth/consent",
      search: { uid: "interaction-1", scope: "openid ledger.read" },
    });
  });

  it("lets a user without ledgers reach creation", async () => {
    const query = vi.fn().mockResolvedValue({ data: { listLedgers: [] } });
    await expect(
      welcomeLoader({
        context: { userProfile: { id: "user" }, client: { query } },
        deps: { oauthUid: "interaction-1", oauthScope: "openid ledger.read" },
      } as unknown as Parameters<typeof welcomeLoader>[0]),
    ).resolves.toBeUndefined();
  });
});

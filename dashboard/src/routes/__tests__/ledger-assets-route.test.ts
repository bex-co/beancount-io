import { describe, expect, it, vi } from "vitest";
import { isNotFound, isRedirect } from "@tanstack/react-router";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { Route } from "../ledger_assets.$ledgerRepoId.static.$";

type BeforeLoad = (options: {
  context: {
    client: { query: ReturnType<typeof vi.fn> };
    userProfile: { username: string } | null;
  };
  location: { href: string };
  params: { ledgerRepoId: string; _splat?: string };
}) => Promise<unknown>;

const beforeLoad = Route.options.beforeLoad as unknown as BeforeLoad;
const params = { ledgerRepoId: "7", _splat: "r 1.png" };
const location = {
  href: "/ledger_assets/7/static/r%201.png?view=receipt#image",
};

async function outcome(
  params: { ledgerRepoId: string; _splat?: string },
  query: ReturnType<typeof vi.fn>,
) {
  try {
    await beforeLoad({
      context: { client: { query }, userProfile: null },
      location,
      params,
    });
    return "returned";
  } catch (thrown) {
    if (isNotFound(thrown)) return "notFound";
    if (isRedirect(thrown)) return "redirect";
    return "error";
  }
}

const graphQLError = (code: string) =>
  new CombinedGraphQLErrors({
    errors: [{ message: "Ledger not found", extensions: { code } }],
  });

describe("ledger asset links (w0/018)", () => {
  it("answers 404 for a malformed repo id without calling the API", async () => {
    const query = vi.fn();
    expect(await outcome({ ledgerRepoId: "abc", _splat: "x" }, query)).toBe(
      "notFound",
    );
    expect(query).not.toHaveBeenCalled();
  });

  it("answers 404 when the ledger or file is missing or forbidden", async () => {
    for (const code of ["NOT_FOUND", "FORBIDDEN", "BAD_USER_INPUT"]) {
      const query = vi.fn().mockRejectedValue(graphQLError(code));
      expect(
        await outcome({ ledgerRepoId: "7", _splat: "r.png" }, query),
        code,
      ).toBe("notFound");
    }
  });

  it.each([
    { reader: "signed out", userProfile: null },
    {
      reader: "signed in with a refused session",
      userProfile: { username: "alice" },
    },
  ])(
    "redirects a reader who is $reader to login with the receipt link",
    async ({ userProfile }) => {
      const query = vi.fn().mockRejectedValue(graphQLError("UNAUTHENTICATED"));
      const result = beforeLoad({
        context: { client: { query }, userProfile },
        location,
        params,
      });
      await expect(result).rejects.toSatisfy(isRedirect);
      await expect(result).rejects.toMatchObject({
        options: { to: "/auth/login", search: { next: location.href } },
      });
    },
  );

  it("propagates genuine service failures", async () => {
    const error = graphQLError("INTERNAL_SERVER_ERROR");
    const query = vi.fn().mockRejectedValue(error);
    await expect(
      beforeLoad({
        context: { client: { query }, userProfile: null },
        location,
        params,
      }),
    ).rejects.toBe(error);
  });

  it("redirects to the signed download URL when one exists", async () => {
    const query = vi.fn().mockResolvedValue({
      data: {
        getLedgerAssetDownloadUrl: { downloadUrl: "https://s.example/r" },
      },
    });
    expect(await outcome({ ledgerRepoId: "7", _splat: "r.png" }, query)).toBe(
      "redirect",
    );
  });
});

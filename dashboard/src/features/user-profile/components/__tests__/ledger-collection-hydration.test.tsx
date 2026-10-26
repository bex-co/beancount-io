import { act, fireEvent, waitFor } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { UserRepository } from "@/graphql/definitions";

/**
 * Profile search and sort are server-rendered and controlled; a term typed or
 * a sort picked before hydration attaches their handlers is overwritten by
 * the controlled value (w4/1103). They are unavailable until then, keep their
 * URL values, and keep the first change made once ready. Real SSR markup,
 * real hydration.
 */

const router = vi.hoisted(() => ({
  search: { q: "budget" } as Record<string, unknown>,
  navigate: vi.fn(),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  // The real useHydrated: false on the server and through hydration's first
  // pass, true once hydrated.
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useSearch: () => router.search,
  useNavigate: () => router.navigate,
  useRouter: () => ({
    state: {
      matches: [
        { routeId: "/ledger/$username", params: { username: "owner" } },
      ],
      pendingMatches: undefined,
    },
  }),
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="#">{children}</a>
  ),
}));

vi.mock("@/common/hooks/use-translations", async () => {
  const { default: en } = await import("../../locales/en");
  return {
    useTranslations: () => ({
      t: (key: string, params: Record<string, string | number> = {}) =>
        (en[key]?.message || key).replace(/\{(\w+)\}/g, (_, name: string) =>
          String(params[name]),
        ),
    }),
  };
});

import { LedgerCollection } from "../ledger-collection";

const repositories: UserRepository[] = ["household", "example"].map(
  (name, index) => ({
    __typename: "UserRepository",
    name,
    fullName: `owner/${name}`,
    description: index === 0 ? "Household budget" : null,
    isPrivate: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
  }),
);

describe("profile search and sort before and after hydration", () => {
  it("are unavailable in server markup, keep the URL values, then take changes", async () => {
    const view = (
      <LedgerCollection username="owner" repositories={repositories} />
    );
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = renderToString(view);
    const search = container.querySelector<HTMLInputElement>(
      'input[type="search"]',
    )!;
    const sort = container.querySelector<HTMLSelectElement>("select")!;

    expect(search).toBeDisabled();
    expect(search).toHaveValue("budget");
    expect(sort).toBeDisabled();

    const recoverable = vi.fn();
    await act(async () => {
      hydrateRoot(container, view, { onRecoverableError: recoverable });
    });
    await waitFor(() => expect(search).toBeEnabled());
    expect(sort).toBeEnabled();
    expect(search).toHaveValue("budget");

    fireEvent.change(search, { target: { value: "example" } });
    expect(search).toHaveValue("example");
    fireEvent.change(sort, { target: { value: "name" } });
    expect(router.navigate).toHaveBeenCalled();
    expect(recoverable).not.toHaveBeenCalled();
    container.remove();
  });
});

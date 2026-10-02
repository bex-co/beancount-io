import { describe, expect, it, vi } from "vitest";

vi.mock("@/common/root-route/not-found-page", () => ({ default: () => null }));
vi.mock("@/common/root-route/error-page", () => ({ default: () => null }));
vi.mock("@/common/root-route/shell-component", () => ({
  ShellComponent: () => null,
}));
vi.mock("@/common/root-route/root-component", () => ({
  RootComponent: () => null,
}));
vi.mock("@/common/server-fn", () => ({ fetchUserProfile: vi.fn() }));
vi.mock("@/i18n/detect-language", () => ({ detectLanguage: () => "en" }));

import { Route } from "../__root";

async function rootTitles(
  matches: Array<{ routeId: string; status: string; globalNotFound?: boolean }>,
  match = matches.find((item) => item.routeId === "__root__") ?? {
    routeId: "__root__",
    status: "success",
  },
) {
  const head = Route.options.head!;
  const result = await head({ match, matches } as Parameters<typeof head>[0]);
  return result?.meta?.filter((meta) => meta && "title" in meta);
}

describe("root fallback title ownership", () => {
  it("retains the brand for normal routes and the ledger loader error shell", async () => {
    expect(
      await rootTitles([{ routeId: "__root__", status: "success" }]),
    ).toEqual([{ title: "Beancount.io" }]);
    expect(
      await rootTitles([
        { routeId: "/ledger/$ledgerOwner/$ledgerName", status: "error" },
      ]),
    ).toEqual([{ title: "Beancount.io" }]);
  });

  it("leaves the single title to PageSEO on global 404 and root error pages", async () => {
    expect(
      await rootTitles([{ routeId: "__root__", status: "pending" }], {
        routeId: "__root__",
        status: "success",
        globalNotFound: true,
      }),
    ).toEqual([]);
    expect(
      await rootTitles([
        { routeId: "__root__", status: "success", globalNotFound: true },
      ]),
    ).toEqual([]);
    expect(
      await rootTitles([{ routeId: "__root__", status: "error" }]),
    ).toEqual([]);
    expect(
      await rootTitles([
        { routeId: "/ledger/$ledgerOwner/$ledgerName/", status: "error" },
      ]),
    ).toEqual([]);
    expect(
      await rootTitles([{ routeId: "__root__", status: "notFound" }]),
    ).toEqual([]);
  });
});

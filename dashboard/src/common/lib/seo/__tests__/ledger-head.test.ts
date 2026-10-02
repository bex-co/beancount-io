import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GetLedgerFileDocument } from "@/graphql/definitions";
import { createLocalization } from "@/i18n/init";
import type { RouterContext } from "@/common/types/router-context";
import { createLedgerHead } from "../ledger-head";

function args(
  overrides: { private?: boolean; description?: string; title?: string } = {},
) {
  const ledger = {
    name: "stock-example",
    private: false,
    description: "",
    options: { title: "Stock & ETF Example" },
    ...overrides,
  };
  if (overrides.title !== undefined) ledger.options.title = overrides.title;
  const readQuery = vi.fn(() => ({ getLedger: ledger }));
  return {
    params: { ledgerOwner: "open_ledger", ledgerName: "stock-example" },
    match: {
      context: {
        localization: createLocalization(),
        client: { readQuery } as unknown as RouterContext["client"],
      },
      pathname: "/ledger/open_ledger/stock-example",
      search: { time: "2026", utm_source: "shared", lang: "en" } as Record<
        string,
        unknown
      >,
    },
    matches: [{ status: "success" }],
    loaderData: {
      readme: {
        ledgerId: "open_ledger/stock-example",
        path: "README.md",
        status: "ready",
        content: "# Example\n\nLearn cost basis and dividends.",
      },
    },
  };
}

function values(head: ReturnType<typeof createLedgerHead>, key: string) {
  return head.meta
    .filter((item) => item.name === key || item.property === key)
    .map((item) => item.content);
}

describe("ledger route metadata", () => {
  it("declares the actual owned PNG dimensions and a matching small card", () => {
    const png = readFileSync(
      join(import.meta.dirname, "../../../../../public/lgasset/logo.png"),
    );
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    const head = createLedgerHead(args(), "ledgerOverview");
    expect(values(head, "og:image:width")).toEqual([
      String(png.readUInt32BE(16)),
    ]);
    expect(values(head, "og:image:height")).toEqual([
      String(png.readUInt32BE(20)),
    ]);
    expect(values(head, "twitter:card")).toEqual(["summary"]);
  });

  it("uses the same authored title and README introduction across one complete head", () => {
    const head = createLedgerHead(args(), "ledgerOverview");
    expect(head.meta.filter((item) => "title" in item)).toEqual([
      { title: "Stock & ETF Example" },
    ]);
    expect(values(head, "description")).toEqual([
      "Learn cost basis and dividends.",
    ]);
    expect(values(head, "og:title")).toEqual(["Stock & ETF Example"]);
    expect(values(head, "twitter:card")).toEqual(["summary"]);
    expect(values(head, "og:image")).toEqual([
      "https://beancount.io/lgasset/logo.png",
    ]);
    expect(values(head, "og:image:width")).toEqual(["256"]);
    expect(head.links.filter((link) => link.rel === "canonical")).toEqual([
      {
        rel: "canonical",
        href: "https://beancount.io/ledger/open_ledger/stock-example?lang=en",
      },
    ]);
    expect(
      head.links
        .filter((link) => link.rel === "alternate")
        .every(
          (link) => !link.href.includes("time=") && !link.href.includes("utm_"),
        ),
    ).toBe(true);
    expect(values(head, "apple-itunes-app")).toHaveLength(1);
  });

  it("prefers an authored description and rejects a stale README from another ledger", () => {
    const input = args({ description: "Authored summary" });
    expect(
      values(createLedgerHead(input, "ledgerOverview"), "description"),
    ).toEqual(["Authored summary"]);
    const stale = args();
    stale.loaderData.readme.ledgerId = "other/ledger";
    expect(
      values(createLedgerHead(stale, "ledgerOverview"), "description")[0],
    ).toContain("Financial overview");
  });

  it("reuses cached README prose on navigation but preserves an unavailable SSR snapshot", () => {
    const input = args();
    const ledger = input.match.context.client.readQuery({
      query: GetLedgerFileDocument,
    });
    input.match.context.client = {
      readQuery: ({ query }: { query: unknown }) =>
        query === GetLedgerFileDocument
          ? {
              getLedgerFile: {
                content: btoa("# Example\n\nCached portfolio introduction."),
              },
            }
          : ledger,
    } as unknown as RouterContext["client"];
    const navigation = createLedgerHead(
      { ...input, loaderData: undefined },
      "ledgerOverview",
    );
    expect(values(navigation, "description")).toEqual([
      "Cached portfolio introduction.",
    ]);
    const unavailable = createLedgerHead(
      {
        ...input,
        loaderData: {
          readme: {
            ...input.loaderData.readme,
            status: "unavailable",
            content: null,
          },
        },
      },
      "ledgerOverview",
    );
    expect(values(unavailable, "description")[0]).toContain(
      "Financial overview",
    );
  });

  it("retains report identity, file path prefixes, edit exclusions and stable file canonicals", () => {
    const input = args();
    const report = createLedgerHead(input, "ledgerHoldings");
    expect(report.meta[0]).toEqual({ title: "Holdings - stock-example" });
    const file = createLedgerHead(
      {
        ...input,
        params: {
          ...input.params,
          branch: "main",
          _splat: "accounts/stock.bean",
        },
        match: {
          ...input.match,
          routeId: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
          pathname:
            "/ledger/open_ledger/stock-example/files/blob/main/accounts/stock.bean",
          search: { editMode: true },
        },
      },
      "ledgerFiles",
      { noIndex: true },
    );
    expect(file.meta[0]).toEqual({
      title: "accounts/stock.bean · Files - stock-example",
    });
    expect(values(file, "robots")).toEqual(["noindex, follow"]);
    expect(file.links).toEqual([
      {
        rel: "canonical",
        href: "https://beancount.io/ledger/open_ledger/stock-example/files/blob/main/accounts/stock.bean",
      },
    ]);
  });

  it("keeps entry metadata generic and preserves its canonical destination", () => {
    const input = args({
      description: "Private transaction narration must not appear",
    });
    const head = createLedgerHead(
      { ...input, params: { ...input.params, entryHash: "abc123" } },
      "ledgerEntry",
    );
    expect(JSON.stringify(head.meta)).not.toContain(
      "Private transaction narration",
    );
    expect(head.links.find((link) => link.rel === "canonical")?.href).toBe(
      "https://beancount.io/ledger/open_ledger/stock-example/entry/abc123",
    );
  });

  it("never emits public metadata on failed access and keeps private ledgers excluded", () => {
    for (const status of ["error", "notFound"])
      expect(
        createLedgerHead(
          { ...args(), matches: [{ status }] },
          "ledgerOverview",
        ),
      ).toEqual({ meta: [], links: [] });
    const head = createLedgerHead(args({ private: true }), "ledgerOverview");
    expect(values(head, "robots")).toEqual(["noindex, follow"]);
    expect(values(head, "apple-itunes-app")).toEqual([]);
    expect(head.links).toEqual([]);
  });

  it("localizes report and fallback descriptions using the request language", async () => {
    const input = args();
    await input.match.context.localization.changeLanguage("zh");
    const head = createLedgerHead(input, "ledgerHoldings");
    expect(values(head, "og:locale")).toEqual(["zh_CN"]);
    expect(head.meta[0].title).toContain("stock-example");
    expect(head.meta[0].title).not.toContain("Holdings");
  });
});

import {
  act,
  cleanup,
  renderHook,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import Cookies from "js-cookie";
import { requestHandler } from "@tanstack/react-start/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConversionSelect } from "@/common/components/conversion-select";
import { getCookie } from "@/common/hooks/use-cookie-storage-state/cookie";
import type { RouterContext } from "@/common/types/router-context";
import {
  GetLedgerBalanceSheetDocument,
  GetLedgerCashFlowDocument,
  GetLedgerIncomeStatementDocument,
  GetLedgerTrialBalanceDocument,
} from "@/graphql/definitions";
import { createLocalization } from "@/i18n/init";
import en from "@/i18n/locales/en";
import { LocalizationProvider } from "@/i18n/provider";
import { balanceSheetLoader } from "../../balance-sheet/loader";
import { cashFlowLoader } from "../../cash-flow/loader";
import { incomeStatementLoader } from "../../income-statement/loader";
import { trialBalanceLoader } from "../../trial-balance/loader";
import {
  reportConversionCookieKey,
  storedReportConversion,
  useReportConversion,
} from "../use-report-conversion";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

const runtime = vi.hoisted(() => ({ side: "client" as "client" | "server" }));
// Vitest does not run Start's isomorphic compiler. Dispatch only its two
// implementations here; the cookie adapter, js-cookie, request context,
// TanStack/H3 cookie parser, hook, and report loaders remain real.
vi.mock("@tanstack/react-start", () => ({
  createIsomorphicFn: () => ({
    server: (server: (...args: unknown[]) => unknown) => ({
      client:
        (client: (...args: unknown[]) => unknown) =>
        (...args: unknown[]) =>
          runtime.side === "server" ? server(...args) : client(...args),
    }),
  }),
}));

const LEDGER = "open_ledger/example";
const OTHER_LEDGER = "open_ledger/another-example";
const roots: Root[] = [];
const containers: HTMLElement[] = [];

afterEach(() => {
  cleanup();
  roots.splice(0).forEach((root) => act(() => root.unmount()));
  containers.splice(0).forEach((container) => container.remove());
  Object.keys(Cookies.get()).forEach((key) =>
    Cookies.remove(key, { path: "/" }),
  );
  runtime.side = "client";
  vi.restoreAllMocks();
});

async function onServer<T>(
  header: string,
  read: () => T | Promise<T>,
): Promise<T> {
  let value!: T;
  // This exported handler creates the actual H3Event and AsyncLocalStorage
  // context from a Request, rather than replacing cookies with a Map/parser.
  const handle = requestHandler(async () => {
    runtime.side = "server";
    try {
      value = await read();
      return new Response(null, { status: 204 });
    } finally {
      runtime.side = "client";
    }
  });
  await handle(
    new Request("https://example.invalid/ledger", {
      headers: { cookie: header },
    }),
    {},
  );
  return value;
}

function ConversionProbe({
  ledgerId = LEDGER,
  currency = "USD",
}: {
  ledgerId?: string;
  currency?: string;
}) {
  const [conversion, setConversion] = useReportConversion(ledgerId, currency);
  return (
    <>
      <output>{conversion}</output>
      <ConversionSelect
        value={conversion}
        onValueChange={setConversion}
        currency={currency}
      />
    </>
  );
}

function probe(ledgerId = LEDGER, currency = "USD") {
  return (
    <LocalizationProvider localization={createLocalization()}>
      <ConversionProbe ledgerId={ledgerId} currency={currency} />
    </LocalizationProvider>
  );
}

async function serverConversion(
  header: string,
  ledgerId = LEDGER,
  currency = "USD",
) {
  const markup = await onServer(header, () =>
    renderToString(probe(ledgerId, currency)),
  );
  const container = document.createElement("div");
  container.innerHTML = markup;
  return container.querySelector("output")?.textContent;
}

async function prefetchReports(header: string, ledgerId = LEDGER) {
  const query = vi.fn(
    async (_options: {
      query: unknown;
      variables?: Record<string, unknown>;
    }) => ({ data: {} }),
  );
  const [ledgerOwner, ledgerName] = ledgerId.split("/");
  const input: Parameters<typeof balanceSheetLoader>[0] = {
    params: { ledgerOwner, ledgerName },
    context: { client: { query } } as unknown as RouterContext,
    deps: { account: "Assets:US", filter: "currency:USD", time: "2017-09" },
    abortController: new AbortController(),
    preload: false,
    cause: "enter",
    location: {} as never,
  };
  await onServer(header, async () => {
    await balanceSheetLoader(input);
    await incomeStatementLoader(input);
    await cashFlowLoader(input);
    await trialBalanceLoader(input);
  });
  expect(query.mock.calls.map(([options]) => options.query)).toEqual([
    GetLedgerBalanceSheetDocument,
    GetLedgerIncomeStatementDocument,
    GetLedgerCashFlowDocument,
    GetLedgerTrialBalanceDocument,
  ]);
  const variables = query.mock.calls.map(([options]) => options.variables);
  variables.forEach((variables) =>
    expect(variables).toMatchObject({
      ledgerId,
      account: "Assets:US",
      filter: "currency:USD",
      time: "2017-09",
    }),
  );
  variables
    .slice(0, 3)
    .forEach((variables) =>
      expect(variables).toHaveProperty("interval", "monthly"),
    );
  return variables.map((variables) => variables?.conversion);
}

describe("report conversion across the browser/server cookie boundary", () => {
  it("hydrates a browser-written Units choice without replacing server markup and prefetches matching reports", async () => {
    const set = vi.spyOn(Cookies, "set");
    const page = renderHook(() => useReportConversion(LEDGER, "USD"));
    act(() => page.result.current[1]("units"));
    page.unmount();
    const key = reportConversionCookieKey(LEDGER);
    expect(key).toBe("beancount.reportConversion.open_ledger%2Fexample");
    expect(document.cookie).toContain(
      "beancount.reportConversion.open_ledger%252Fexample=units",
    );
    expect(set).toHaveBeenCalledWith(key, "units", {
      expires: 365,
      path: "/",
      sameSite: "lax",
    });
    expect(set.mock.results[0].value).toContain("; expires=");
    expect(set.mock.results[0].value).toContain("; path=/");
    expect(set.mock.results[0].value).toContain("; sameSite=lax");

    const header = document.cookie;
    expect(await onServer(header, () => storedReportConversion(LEDGER))).toBe(
      "units",
    );
    expect(await prefetchReports(header)).toEqual([
      "units",
      "units",
      "units",
      "units",
    ]);
    const markup = await onServer(header, () => renderToString(probe()));
    const container = document.createElement("div");
    container.innerHTML = markup;
    document.body.append(container);
    containers.push(container);
    const serverOutput = container.querySelector("output")!;
    expect(serverOutput).toHaveTextContent("units");
    const hydrationError = vi.fn();
    await act(async () => {
      roots.push(
        hydrateRoot(container, probe(), { onRecoverableError: hydrationError }),
      );
    });
    expect(hydrationError).not.toHaveBeenCalled();
    expect(container.querySelector("output")).toBe(serverOutput);
    expect(serverOutput.isConnected).toBe(true);
    const selector = within(container).getByRole("combobox", {
      name: en["component.conversionSelect.placeholder"],
    });
    expect(selector).toHaveTextContent(en["component.conversionSelect.units"]);

    // The real selector still offers all four choices and writes the next one
    // through the same production hook and js-cookie adapter.
    const user = userEvent.setup();
    selector.focus();
    await user.keyboard("{Enter}");
    expect(screen.getAllByRole("option")).toHaveLength(4);
    const market = screen.getByRole("option", {
      name: en["component.conversionSelect.atMarketValue"],
    });
    expect(
      screen.getByRole("option", {
        name: `${en["component.conversionSelect.convertedTo"]} USD`,
      }),
    ).toBeVisible();
    act(() => market.focus());
    await user.keyboard("{Enter}");
    expect(serverOutput).toHaveTextContent("at_value");
    expect(Cookies.get(key)).toBe("at_value");
    expect(await serverConversion(document.cookie)).toBe("at_value");
    expect(await prefetchReports(document.cookie)).toEqual([
      "at_value",
      "at_value",
      "at_value",
      "at_value",
    ]);
  });

  it("retains the At Cost default on the server, client, and every loader without a cookie", async () => {
    expect(document.cookie).toBe("");
    expect(
      renderHook(() => useReportConversion(LEDGER, "USD")).result.current[0],
    ).toBe("at_cost");
    expect(await serverConversion("")).toBe("at_cost");
    expect(await prefetchReports("")).toEqual([
      "at_cost",
      "at_cost",
      "at_cost",
      "at_cost",
    ]);
  });

  it("keeps saved choices isolated and follows a mounted page across ledger switches", async () => {
    Cookies.set(reportConversionCookieKey(LEDGER), "units");
    Cookies.set(reportConversionCookieKey(OTHER_LEDGER), "at_value");
    const { result, rerender } = renderHook(
      ({ ledgerId }) => useReportConversion(ledgerId, "USD"),
      { initialProps: { ledgerId: LEDGER } },
    );
    expect(result.current[0]).toBe("units");
    rerender({ ledgerId: OTHER_LEDGER });
    expect(result.current[0]).toBe("at_value");
    rerender({ ledgerId: "alice/example" });
    expect(result.current[0]).toBe("at_cost");
    rerender({ ledgerId: LEDGER });
    expect(result.current[0]).toBe("units");
    const header = document.cookie;
    expect(await serverConversion(header, LEDGER)).toBe("units");
    expect(await serverConversion(header, OTHER_LEDGER)).toBe("at_value");
    expect(await serverConversion(header, "alice/example")).toBe("at_cost");
    expect(await prefetchReports(header, OTHER_LEDGER)).toEqual([
      "at_value",
      "at_value",
      "at_value",
      "at_value",
    ]);
  });

  it.each(["at_cost", "at_value", "units"])(
    "restores an existing browser-written %s choice on both sides",
    async (choice) => {
      Cookies.set(reportConversionCookieKey(LEDGER), choice);
      expect(
        renderHook(() => useReportConversion(LEDGER, "USD")).result.current[0],
      ).toBe(choice);
      expect(await serverConversion(document.cookie)).toBe(choice);
      expect(
        await onServer(document.cookie, () => storedReportConversion(LEDGER)),
      ).toBe(choice);
    },
  );

  it("validates the stored primary currency while retaining the loader's documented prefetch behavior", async () => {
    Cookies.set(reportConversionCookieKey(LEDGER), "EUR");
    expect(
      renderHook(() => useReportConversion(LEDGER, "EUR")).result.current[0],
    ).toBe("EUR");
    expect(await serverConversion(document.cookie, LEDGER, "EUR")).toBe("EUR");
    expect(
      renderHook(() => useReportConversion(LEDGER, "USD")).result.current[0],
    ).toBe("at_cost");
    expect(await serverConversion(document.cookie, LEDGER, "USD")).toBe(
      "at_cost",
    );
    // Loaders do not know the primary currency yet; safe currency names pass
    // through for prefetch, and the mounted page validates the offered choice.
    expect(await prefetchReports(document.cookie)).toEqual([
      "EUR",
      "EUR",
      "EUR",
      "EUR",
    ]);
  });

  it.each(["", "at_cost) { x }", "units; extra", "x".repeat(25)])(
    "falls back for malformed or empty browser preferences: %j",
    async (choice) => {
      Cookies.set(reportConversionCookieKey(LEDGER), choice);
      expect(
        renderHook(() => useReportConversion(LEDGER, "USD")).result.current[0],
      ).toBe("at_cost");
      expect(await serverConversion(document.cookie)).toBe("at_cost");
      expect(
        await onServer(document.cookie, () => storedReportConversion(LEDGER)),
      ).toBe("at_cost");
    },
  );
});

describe("shared cookie name compatibility", () => {
  it.each([
    "sidebar_state",
    "beancount.chartsVisible.balanceSheet",
    "beancount.reportConversion.open_ledger%2Fexample",
    "preference(with)parentheses",
    "preference$&+,/[]:=^`|",
  ])(
    "reads actual js-cookie serialization of %j through the real server parser",
    async (key) => {
      Cookies.set(key, "units");
      expect(getCookie(key)).toBe("units");
      expect(await onServer(document.cookie, () => getCookie(key))).toBe(
        "units",
      );
    },
  );

  it("retains raw server-written names and prefers the browser spelling if both exist", async () => {
    const key = reportConversionCookieKey(LEDGER);
    expect(await onServer(`${key}=at_value`, () => getCookie(key))).toBe(
      "at_value",
    );
    Cookies.set(key, "units");
    expect(
      await onServer(`${document.cookie}; ${key}=at_value`, () =>
        getCookie(key),
      ),
    ).toBe("units");
    expect(await onServer("", () => getCookie(key))).toBeUndefined();
  });
});

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  reportConversionCookieKey,
  storedReportConversion,
  useReportConversion,
} from "../use-report-conversion";

const { cookies, setCookieCalls } = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  setCookieCalls: [] as Array<{ key: string; options: unknown }>,
}));

vi.mock("@/common/hooks/use-cookie-storage-state/cookie", () => ({
  getCookie: (key: string) => cookies.get(key),
  setCookie: (key: string, value: string, options: unknown) => {
    cookies.set(key, value);
    setCookieCalls.push({ key, options });
  },
  removeCookie: (key: string) => cookies.delete(key),
}));

const LEDGER_A = "alice/books";
const LEDGER_B = "alice/business";

afterEach(() => {
  cookies.clear();
  setCookieCalls.length = 0;
});

describe("useReportConversion", () => {
  it("starts at cost when the ledger has no stored choice", () => {
    const { result } = renderHook(() => useReportConversion(LEDGER_A, "USD"));
    expect(result.current[0]).toBe("at_cost");
  });

  it("opens the next report page for the same ledger with the choice made on the last one", () => {
    const balanceSheet = renderHook(() => useReportConversion(LEDGER_A, "USD"));
    act(() => balanceSheet.result.current[1]("units"));
    expect(balanceSheet.result.current[0]).toBe("units");
    balanceSheet.unmount();

    const incomeStatement = renderHook(() =>
      useReportConversion(LEDGER_A, "USD"),
    );
    expect(incomeStatement.result.current[0]).toBe("units");
    expect(setCookieCalls).toEqual([
      {
        key: reportConversionCookieKey(LEDGER_A),
        options: expect.objectContaining({ expires: 365, path: "/" }),
      },
    ]);
  });

  it("keeps each ledger's choice separate", () => {
    const { result } = renderHook(() => useReportConversion(LEDGER_A, "USD"));
    act(() => result.current[1]("at_value"));

    const other = renderHook(() => useReportConversion(LEDGER_B, "USD"));
    expect(other.result.current[0]).toBe("at_cost");
  });

  it("follows the ledger when a mounted page switches ledgers", () => {
    cookies.set(reportConversionCookieKey(LEDGER_B), "units");
    const { result, rerender } = renderHook(
      ({ ledgerId }) => useReportConversion(ledgerId, "USD"),
      { initialProps: { ledgerId: LEDGER_A } },
    );
    act(() => result.current[1]("at_value"));

    rerender({ ledgerId: LEDGER_B });
    expect(result.current[0]).toBe("units");

    rerender({ ledgerId: LEDGER_A });
    expect(result.current[0]).toBe("at_value");
  });

  it("accepts the ledger's primary currency but not a currency it does not offer", () => {
    cookies.set(reportConversionCookieKey(LEDGER_A), "EUR");
    expect(
      renderHook(() => useReportConversion(LEDGER_A, "EUR")).result.current[0],
    ).toBe("EUR");
    expect(
      renderHook(() => useReportConversion(LEDGER_A, "USD")).result.current[0],
    ).toBe("at_cost");
  });
});

describe("storedReportConversion", () => {
  it("returns the stored choice for the loader's prefetch", () => {
    cookies.set(reportConversionCookieKey(LEDGER_A), "at_value");
    expect(storedReportConversion(LEDGER_A)).toBe("at_value");
    expect(storedReportConversion(LEDGER_B)).toBe("at_cost");
  });

  it("ignores a malformed cookie instead of sending it to the API", () => {
    cookies.set(reportConversionCookieKey(LEDGER_A), "at_cost) { x }");
    expect(storedReportConversion(LEDGER_A)).toBe("at_cost");
  });
});

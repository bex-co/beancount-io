import { describe, it, expect } from "vitest";
import { formatErrorReport } from "../error-report";

const base = {
  url: "https://beancount.io/ledger/a/b/balance-sheet",
  userAgent: "TestBrowser/1.0",
  time: new Date("2026-10-07T12:00:00.000Z"),
};

describe("formatErrorReport", () => {
  it("identifies the failure, the page, the time, and the browser", () => {
    const error = new TypeError("x is not a function");
    error.stack = "TypeError: x is not a function\n    at render (a.js:1:2)";
    const report = formatErrorReport({
      ...base,
      error,
      componentStack: "\n    at BalanceSheet\n    at Outlet",
    });

    expect(report).toContain("TypeError: x is not a function");
    expect(report).toContain(
      "URL: https://beancount.io/ledger/a/b/balance-sheet",
    );
    expect(report).toContain("Time: 2026-10-07T12:00:00.000Z");
    expect(report).toContain("Browser: TestBrowser/1.0");
    expect(report).toContain("at render (a.js:1:2)");
    expect(report).toContain("at BalanceSheet");
  });

  it("truncates a long stack", () => {
    const error = new Error("deep");
    error.stack = Array.from({ length: 50 }, (_, i) => `    at f${i}`).join(
      "\n",
    );
    const report = formatErrorReport({ ...base, error });

    expect(report).toContain("at f19");
    expect(report).not.toContain("at f20");
    expect(report).toContain("…");
  });

  it("describes a thrown non-error", () => {
    expect(formatErrorReport({ ...base, error: "boom" })).toContain(
      "Error: boom",
    );
  });
});

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { isolateRtlSource, rtlIsolationRanges } from "../rtl-source";

/**
 * A Persian account segment drew the amount inside the account path
 * (w2/118). These are the parts each source line isolates, as mobile's
 * `isolateSourceLine` does (w21/780).
 */
const isolated = (line: string) =>
  rtlIsolationRanges(line).map(({ start, end }) => line.slice(start, end));

describe("rtlIsolationRanges", () => {
  it("isolates the Persian segment of a posting's account, not the amount", () => {
    expect(
      isolated("  Assets:Qa:ملی                               1.00 USD"),
    ).toEqual(["ملی"]);
  });

  it("isolates each RTL segment of a path on its own, root first", () => {
    expect(isolated("  Assets:Bank:بانک:ملی  100.00 USD")).toEqual([
      "بانک",
      "ملی",
    ]);
    expect(isolated("diff --git a/documents/بانک/x.pdf b/x.pdf")).toEqual([
      "بانک",
    ]);
  });

  it("keeps a string's quotes and a comment's mark outside the isolate", () => {
    expect(isolated('2024-01-25 * "Coinbase" "خرید سهام"')).toEqual([
      "خرید سهام",
    ]);
    expect(isolated("; یادداشت مهم")).toEqual(["یادداشت مهم"]);
    expect(isolated("  #سفر")).toEqual(["سفر"]);
  });

  it("isolates nothing in a line without Hebrew or Arabic-script letters", () => {
    expect(rtlIsolationRanges('2024-01-25 * "Café" "日本"')).toEqual([]);
  });
});

describe("isolateRtlSource", () => {
  it("wraps each isolated part in a bdi and keeps every character in order", () => {
    const line = "  Assets:Qa:ملی                               1.00 USD";
    const { container } = render(<pre>{isolateRtlSource(line)}</pre>);
    const pre = container.querySelector("pre")!;
    expect(pre.textContent).toBe(line);
    expect(
      Array.from(pre.querySelectorAll("bdi")).map((bdi) => bdi.textContent),
    ).toEqual(["ملی"]);
    // The amount is outside the isolate, after the account.
    expect(pre.querySelector("bdi")!.nextSibling?.textContent).toMatch(
      /^\s+1\.00 USD$/,
    );
  });

  it("returns a line without RTL letters unchanged", () => {
    expect(isolateRtlSource("  Assets:Cash  -1.00 USD")).toBe(
      "  Assets:Cash  -1.00 USD",
    );
  });
});

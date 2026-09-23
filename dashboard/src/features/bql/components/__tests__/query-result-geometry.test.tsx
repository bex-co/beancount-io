/**
 * Real virtualizer geometry for the BQL result table.
 *
 * The sibling suite mocks react-window, so it can only prove that text reached
 * the DOM — and the reported defect was text that was in the DOM, and in the
 * CSV, but clipped off screen. This suite renders the REAL react-window List
 * and drives its measurement with a ResizeObserver stub that reports each
 * row's height from the content that row actually renders: one line per
 * stacked inventory unit, one per source line of a printed directive. Row
 * offsets, overlap and the list's extent then become assertable in JSDOM, and
 * they fail the moment rows are pinned to a fixed height again.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryResultCard } from "../query-result-card";

vi.mock("../query-result-chart", () => ({
  QueryResultChart: () => <div data-testid="chart" />,
}));
vi.mock("../query-result-export", () => ({
  QueryResultExport: () => <button type="button">export</button>,
}));
vi.mock("../lib/chart-utils", () => ({ parseQueryChart: () => null }));
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

/** Height JSDOM cannot compute: one line per rendered line, plus padding. */
const LINE_PX = 20;
const PADDING_PX = 16;

function lineCountOf(element: Element): number {
  // Stacked inventory units render one element each; a multiline string keeps
  // its newlines. Both are visible without layout, so both are countable here.
  //
  // JSDOM loads no stylesheet, so the cell's whitespace rule has to be honoured
  // by hand: `truncate` and `whitespace-nowrap` collapse a value onto one line,
  // which is precisely the flattening that hid the postings. Modelling it here
  // is what lets these tests fail when that class comes back.
  const cells = element.querySelectorAll('[role="cell"]');
  let most = 1;
  for (const cell of cells) {
    const flattens = /(^|\s)(truncate|whitespace-nowrap)(\s|$)/.test(
      cell.className,
    );
    const stacked = cell.querySelectorAll(".inline-flex > span").length;
    const lines = flattens
      ? 1
      : stacked > 0
        ? stacked
        : (cell.textContent || "").split(/\r?\n/).length;
    most = Math.max(most, lines);
  }
  return most;
}

class ContentSizedResizeObserver {
  private targets = new Set<Element>();
  constructor(private callback: ResizeObserverCallback) {}
  observe(target: Element) {
    this.targets.add(target);
    this.emit(target);
  }
  unobserve(target: Element) {
    this.targets.delete(target);
  }
  disconnect() {
    this.targets.clear();
  }
  private emit(target: Element) {
    this.callback(
      [
        {
          target,
          borderBoxSize: [
            {
              blockSize: lineCountOf(target) * LINE_PX + PADDING_PX,
              inlineSize: 600,
            },
          ],
        } as unknown as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    );
  }
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ContentSizedResizeObserver);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

/** The eight units the reported query returned, in API order. */
const EIGHT_UNITS = {
  USD: "3609.87",
  VACHR: "-13",
  VBMPX: "193.442",
  RGAGX: "597.748",
  VEA: "36",
  ITOT: "104",
  VHT: "64",
  GLD: "17",
};

/** The four-line Opening directive PRINT returns as one string cell. */
const OPENING_DIRECTIVE = [
  '2026-01-01 * "Opening" "Starting balances"',
  "  Assets:Bank:Business                      12000.00 USD",
  "  Assets:Bank:TaxReserve                     4500.00 USD",
  "  Equity:Opening                           -16500.00 USD",
].join("\n");

function tableResult(
  types: { name: string; dtype: string }[],
  rows: unknown[][],
) {
  return {
    resultType: "table",
    table: { types, rows },
    text: null,
  } as never;
}

function renderCard(result: ReturnType<typeof tableResult>) {
  return render(
    <QueryResultCard
      query="select"
      result={result}
      isInitiallyOpen
      onExecute={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
}

/** Absolute offset react-window gave each row, in render order. */
function rowOffsets(): number[] {
  return [...document.querySelectorAll("[data-react-window-index]")].map(
    (row) => {
      const transform = (row as HTMLElement).style.transform;
      return Number(/translateY\((-?\d+(?:\.\d+)?)px\)/.exec(transform)?.[1]);
    },
  );
}

/** Height of react-window's own aria-hidden sizer: the extent it laid out. */
function spacerHeight(): number {
  const spacer = document.querySelector(
    '[role="rowgroup"] > [aria-hidden="true"]',
  ) as HTMLElement | null;
  return Number(/(-?\d+(?:\.\d+)?)px/.exec(spacer?.style.height ?? "")?.[1]);
}

function measuredHeights(): number[] {
  return [...document.querySelectorAll("[data-react-window-index]")].map(
    (row) => lineCountOf(row) * LINE_PX + PADDING_PX,
  );
}

describe("BQL result table geometry", () => {
  it("gives a stacked eight-unit inventory row its full height", async () => {
    renderCard(
      tableResult(
        [{ name: "sum_position", dtype: "Inventory" }],
        [[EIGHT_UNITS]],
      ),
    );

    await screen.findByRole("rowgroup");
    // Eight units => eight lines; the pre-repair row was pinned at 36px.
    await waitFor(() => {
      expect(measuredHeights()[0]).toBe(8 * LINE_PX + PADDING_PX);
      // react-window's own sizer reports the extent it gave the rows.
      expect(spacerHeight()).toBe(8 * LINE_PX + PADDING_PX);
    });
  });

  it("offsets the next row past a tall one instead of overlapping it", async () => {
    renderCard(
      tableResult(
        [
          { name: "account", dtype: "str" },
          { name: "sum_position", dtype: "Inventory" },
        ],
        [
          ["Assets:US:Total", EIGHT_UNITS],
          ["Assets:US:Cash", { USD: "10.00" }],
          ["Assets:US:Bank", { USD: "20.00" }],
        ],
      ),
    );

    await screen.findByRole("rowgroup");
    await waitFor(() => {
      const offsets = rowOffsets();
      const heights = measuredHeights();
      expect(offsets).toHaveLength(3);
      // Each row starts exactly where the previous one ended: no overlap, and
      // no row is squeezed. A fixed 36px row height puts row 1 at 36 while
      // row 0 still paints eight lines, which is the reported defect.
      for (let i = 1; i < offsets.length; i++) {
        expect(offsets[i]).toBe(offsets[i - 1] + heights[i - 1]);
      }
      expect(offsets[1]).toBe(8 * LINE_PX + PADDING_PX);
    });
  });

  it("gives a four-line printed directive four lines of room", async () => {
    renderCard(
      tableResult(
        [{ name: "directive", dtype: "str" }],
        [[OPENING_DIRECTIVE], ["2026-01-02 balance Assets:Bank:Business"]],
      ),
    );

    await screen.findByRole("rowgroup");
    await waitFor(() => {
      const heights = measuredHeights();
      expect(heights[0]).toBe(4 * LINE_PX + PADDING_PX);
      // The one-line row beside it stays compact.
      expect(heights[1]).toBe(LINE_PX + PADDING_PX);
      expect(rowOffsets()[1]).toBe(4 * LINE_PX + PADDING_PX);
    });
  });

  it("keeps every posting amount and unit intact while sizing", async () => {
    renderCard(
      tableResult(
        [
          { name: "directive", dtype: "str" },
          { name: "sum_position", dtype: "Inventory" },
        ],
        [[OPENING_DIRECTIVE, EIGHT_UNITS]],
      ),
    );

    await screen.findByRole("rowgroup");
    const row = document.querySelector("[data-react-window-index]");
    const text = row?.textContent ?? "";
    for (const amount of ["12000.00", "4500.00", "-16500.00"]) {
      expect(text).toContain(amount);
    }
    for (const [currency, amount] of Object.entries(EIGHT_UNITS)) {
      expect(text).toContain(`${amount} ${currency}`);
    }
  });

  it("does not let a cell flatten or clip its own content", async () => {
    renderCard(
      tableResult([{ name: "directive", dtype: "str" }], [[OPENING_DIRECTIVE]]),
    );

    await screen.findByRole("rowgroup");
    const cell = document.querySelector('[role="cell"]') as HTMLElement;
    // `truncate` (nowrap + overflow-hidden + ellipsis) is what collapsed the
    // directive's newlines onto one clipped line.
    expect(cell.className).not.toContain("truncate");
    expect(cell.className).toContain("whitespace-pre-wrap");
    expect(cell.textContent).toContain("\n");
  });

  it("sizes the viewport from the same measurements and still caps it", async () => {
    const rows = Array.from({ length: 400 }, (_, index) => [
      `2026-01-${String((index % 28) + 1).padStart(2, "0")}`,
      `Expenses:Category:${index}`,
    ]);
    renderCard(
      tableResult(
        [
          { name: "date", dtype: "date" },
          { name: "account", dtype: "str" },
        ],
        rows,
      ),
    );

    const list = await screen.findByRole("rowgroup");
    await waitFor(() => {
      // 400 one-line rows measure well past the cap; the viewport holds at 600.
      expect(list.style.height).toBe("600px");
      // Virtualized: only a window of rows is in the DOM.
      expect(
        document.querySelectorAll("[data-react-window-index]").length,
      ).toBeLessThan(200);
    });
    // Row indexes stay semantic for the whole result, not just the window.
    expect(screen.getByRole("table").getAttribute("aria-rowcount")).toBe("401");
  });
});

describe("BQL result End navigation (w4/183)", () => {
  // Rows below the fold are measured only after End brings them into view, so
  // the extent grows after the browser's own End scroll has finished. Measured
  // in Chromium: without the pin, one End left the final row entirely below
  // the viewport. JSDOM has no layout, so the growing extent is stubbed.
  function withExtent(rowgroup: HTMLElement) {
    let extent = 3635;
    Object.defineProperty(rowgroup, "scrollHeight", {
      configurable: true,
      get: () => extent,
    });
    return (next: number) => {
      extent = next;
    };
  }

  const rows = Array.from({ length: 100 }, (_, i) => [
    i % 9 === 0 ? EIGHT_UNITS : { USD: String(i) },
  ]);
  const result = tableResult(
    [{ name: "sum_position", dtype: "Inventory" }],
    rows,
  );

  it("keeps End on the final row as later measurements grow the extent", async () => {
    const { rerender } = renderCard(result);
    const rowgroup = await screen.findByRole("rowgroup");
    const grow = withExtent(rowgroup);

    fireEvent.keyDown(rowgroup, { key: "End" });
    grow(3669);
    // A measurement pass re-renders the table, as ResizeObserver does.
    rerender(
      <QueryResultCard
        query="select"
        result={result}
        isInitiallyOpen
        onExecute={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(rowgroup.scrollTop).toBe(3669);
  });

  it("hands scrolling back to the reader after they move", async () => {
    const { rerender } = renderCard(result);
    const rowgroup = await screen.findByRole("rowgroup");
    const grow = withExtent(rowgroup);

    fireEvent.keyDown(rowgroup, { key: "End" });
    fireEvent.wheel(rowgroup);
    rowgroup.scrollTop = 1000;
    grow(3669);
    rerender(
      <QueryResultCard
        query="select"
        result={result}
        isInitiallyOpen
        onExecute={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(rowgroup.scrollTop).toBe(1000);
  });
});

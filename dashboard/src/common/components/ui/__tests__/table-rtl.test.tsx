import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { compileAppCss, parseRules } from "@/test/tailwind";
import { ChartPeriodTable } from "@/features/reports/components/chart-period-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../table";

/**
 * In Persian (`dir="rtl"`) a column's heading sat on the physical left while
 * its values started on the right: `TableHead` hard-coded `text-left`, and the
 * account period table pinned its amounts to `text-right` (w2/136). Headings
 * and cells now use logical sides, so a column reads the same way mirrored.
 */
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    i18n: { language: "fa" },
    t: (key: string) =>
      ({
        "page.accountReport.period": "دوره",
        "page.accountReport.periodAmount": "مبلغ",
        "page.accountReport.periodData": "داده‌های دوره",
      })[key] ?? key,
  }),
}));

const rtl = () => ({ container: document.body.appendChild(rtlRoot()) });

function rtlRoot() {
  const root = document.createElement("div");
  root.setAttribute("dir", "rtl");
  return root;
}

describe("table primitives under dir=rtl", () => {
  it("starts a heading at the reading start, where its cells start", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>تاریخ</TableHead>
            <TableHead className="text-end">مبلغ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>2026-11-12</TableCell>
            <TableCell className="text-end">-918.72 USD</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
      rtl(),
    );

    const date = screen.getByRole("columnheader", { name: "تاریخ" });
    expect(date).toHaveClass("text-start");
    expect(date).not.toHaveClass("text-left");
    // A column that sets its own logical side replaces the default outright.
    const amount = screen.getByRole("columnheader", { name: "مبلغ" });
    expect(amount).toHaveClass("text-end");
    expect(amount).not.toHaveClass("text-start");
  });

  it("trims a checkbox column's padding at the inline end", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <input type="checkbox" aria-label="همه" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>
              <input type="checkbox" aria-label="ردیف" />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>,
      rtl(),
    );

    for (const slot of ["table-head", "table-cell"]) {
      const className = document.querySelector(
        `[data-slot="${slot}"]`,
      )!.className;
      expect(className).toContain("[&:has([role=checkbox])]:pe-0");
      expect(className).not.toContain(":pr-0");
    }
  });

  it("emits logical CSS for the defaults", async () => {
    const classes = ["text-start", "text-end", "[&:has([role=checkbox])]:pe-0"];
    const rules = parseRules(await compileAppCss(classes));
    expect(rules.get("text-start")).toContain("text-align: start");
    expect(rules.get("text-end")).toContain("text-align: end");
    expect(rules.get("[&:has([role=checkbox])]:pe-0")).toContain(
      "padding-inline-end",
    );
  });

  it("puts the account period table's amounts and their heading at the end", () => {
    render(
      <>
        <h2 id="card-title">Account Balance</h2>
        <ChartPeriodTable
          data={[{ date: "2026-02-28", balance: { USD: "-918.72" } }]}
          labelledBy="card-title"
        />
      </>,
      rtl(),
    );

    const period = screen.getByRole("columnheader", { name: "دوره" });
    expect(period).toHaveClass("text-start");
    const amount = screen.getByRole("columnheader", { name: "مبلغ" });
    expect(amount).toHaveClass("text-end");
    expect(amount).not.toHaveClass("text-right");
    const [dateCell, amountCell] = screen.getAllByRole("cell");
    expect(dateCell).not.toHaveClass("text-left", "text-right");
    expect(amountCell).toHaveClass("text-end");
    expect(amountCell).not.toHaveClass("text-right");
  });
});

/**
 * Every feature table is held to the same rule: no heading or cell pins its
 * text to a physical side, or that column stops mirroring in Persian. `rtl:`
 * and `ltr:` variants are deliberate per-direction choices and are allowed.
 */
describe("feature tables", () => {
  const src = resolve(__dirname, "../../../..");
  const physical =
    /<(TableHead|TableCell|th|td)\b(?:[^>]|=>)*?(?<![\w-])((?:[\w-]+:)*)text-(left|right)\b/g;

  it("never pin a heading or cell to a physical side", () => {
    const offenders: string[] = [];
    for (const file of readdirSync(src, { recursive: true }) as string[]) {
      if (!file.endsWith(".tsx") || /__tests__|\.test\.tsx$/.test(file))
        continue;
      const source = readFileSync(join(src, file), "utf8");
      for (const match of source.matchAll(physical)) {
        if (/\b(rtl|ltr):$/.test(match[2])) continue;
        const line = source.slice(0, match.index).split("\n").length;
        offenders.push(`${file}:${line} <${match[1]}> text-${match[3]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

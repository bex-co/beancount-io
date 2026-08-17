import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatementExportMenu } from "../statement-export-menu";
import type { StatementExportDocument } from "../model";

const { track, exportStatementCSV, exportStatementMarkdown, success, error } =
  vi.hoisted(() => ({
    track: vi.fn(),
    exportStatementCSV: vi.fn(),
    exportStatementMarkdown: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  }));

vi.mock("@/common/analytics/events", () => ({ track }));
vi.mock("../csv", () => ({ exportStatementCSV }));
vi.mock("../markdown", () => ({ exportStatementMarkdown }));
vi.mock("sonner", () => ({ toast: { success, error } }));
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

const document: StatementExportDocument = {
  kind: "balance_sheet",
  title: "Balance Sheet",
  context: {
    reportingEntity: "Private entity",
    reportingEntitySource: "ledger_title",
    ledgerName: "Private ledger name",
    primaryCurrency: "USD",
    conversion: "units",
    interval: "monthly",
    filters: { time: "", account: "", filter: "" },
    reportingPeriod: {
      startDate: null,
      endDate: null,
      asOfDate: "2026-08-15",
      isExplicit: false,
      selection: "",
    },
    generatedAt: "2026-08-15T12:00:00.000Z",
  },
  sections: [
    {
      key: "assets",
      label: "Assets",
      rows: [
        {
          accountPath: "Assets",
          label: "Assets",
          depth: 0,
          rowKind: "total",
          amounts: [{ unit: "USD", rawAmount: "1", displayAmount: "1" }],
        },
      ],
    },
  ],
};

describe("StatementExportMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
  });

  async function openMenu(user: ReturnType<typeof userEvent.setup>) {
    await user.click(
      screen.getByRole("button", { name: "reports.export.action" }),
    );
  }

  it("offers a labeled, keyboard-focusable CSV action and safe analytics", async () => {
    const user = userEvent.setup();
    render(<StatementExportMenu document={document} />);
    await openMenu(user);
    await user.click(await screen.findByText("reports.export.csv"));

    await waitFor(() => expect(exportStatementCSV).toHaveBeenCalledOnce());
    expect(track.mock.calls).toEqual([
      [
        "report_export_started",
        { report_type: "balance_sheet", format: "csv" },
      ],
      [
        "report_export_completed",
        { report_type: "balance_sheet", format: "csv" },
      ],
    ]);
    expect(JSON.stringify(track.mock.calls)).not.toContain(
      "Private ledger name",
    );
    expect(success).toHaveBeenCalledOnce();
  });

  it("opens the format menu from the keyboard", async () => {
    const user = userEvent.setup();
    render(<StatementExportMenu document={document} />);

    await user.tab();
    expect(
      screen.getByRole("button", { name: "reports.export.action" }),
    ).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(
      await screen.findByRole("menuitem", { name: "reports.export.csv" }),
    ).toBeInTheDocument();
  });

  it("exports Markdown with the active locale and bounded analytics", async () => {
    const user = userEvent.setup();
    render(<StatementExportMenu document={document} />);
    await openMenu(user);
    await user.click(await screen.findByText("reports.export.markdown"));

    await waitFor(() => expect(exportStatementMarkdown).toHaveBeenCalledOnce());
    expect(exportStatementMarkdown.mock.calls[0][1]).toMatchObject({
      locale: "en",
    });
    expect(track.mock.calls).toEqual([
      [
        "report_export_started",
        { report_type: "balance_sheet", format: "markdown" },
      ],
      [
        "report_export_completed",
        { report_type: "balance_sheet", format: "markdown" },
      ],
    ]);
  });

  it("reports one bounded failure when CSV generation throws", async () => {
    const user = userEvent.setup();
    exportStatementCSV.mockImplementationOnce(() => {
      throw new Error("contains private details that must not reach analytics");
    });
    render(<StatementExportMenu document={document} />);
    await openMenu(user);
    await user.click(await screen.findByText("reports.export.csv"));

    await waitFor(() => expect(error).toHaveBeenCalledOnce());
    expect(track.mock.calls).toEqual([
      [
        "report_export_started",
        { report_type: "balance_sheet", format: "csv" },
      ],
      [
        "report_export_failed",
        {
          report_type: "balance_sheet",
          format: "csv",
          failure_category: "csv_generation",
        },
      ],
    ]);
  });

  it("uses the same-window print dialog without opening a popup", async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const open = vi.spyOn(window, "open");
    render(<StatementExportMenu document={document} />);
    await openMenu(user);
    await user.click(await screen.findByText("reports.export.printSavePdf"));

    await waitFor(() => expect(print).toHaveBeenCalledOnce());
    expect(open).not.toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith("report_export_completed", {
      report_type: "balance_sheet",
      format: "print",
    });
  });

  it("blocks duplicate activation while a print action is pending", async () => {
    let continueFrame: (() => void) | undefined;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      continueFrame = () => callback(0);
      return 1;
    });
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(<StatementExportMenu document={document} />);
    await openMenu(user);
    await user.click(await screen.findByText("reports.export.printSavePdf"));

    const trigger = screen.getByRole("button", {
      name: "reports.export.action",
    });
    expect(trigger).toBeDisabled();
    trigger.click();
    expect(
      track.mock.calls.filter(([name]) => name === "report_export_started"),
    ).toHaveLength(1);

    continueFrame?.();
    await waitFor(() => expect(print).toHaveBeenCalledOnce());
  });

  it("disables export when the filtered statement has no amounts", () => {
    render(<StatementExportMenu document={{ ...document, sections: [] }} />);

    expect(
      screen.getByRole("button", { name: "reports.export.action" }),
    ).toBeDisabled();
  });
});

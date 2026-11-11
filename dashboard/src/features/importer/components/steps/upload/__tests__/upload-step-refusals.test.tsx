import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UploadStep } from "../index";

/**
 * An empty CSV was offered to AI parsing, which spends tokens on a file with
 * nothing in it, and a spreadsheet or an oversized file was refused through a
 * blocking browser alert outside the page (w2/128). Real bytes run through the
 * real reader and parser; only the server's AI parser is stubbed.
 */
const parseLLMFile = vi.fn();

vi.mock("../../../../hooks/use-llm-parser", () => ({
  useLLMParser: () => ({ parseFile: parseLLMFile }),
}));
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
  }),
}));
vi.mock("@/common/analytics", () => ({ track: vi.fn() }));
vi.mock("@tanstack/react-router", async () => {
  const { routerMock } = await import("@/test/mocks/router");
  return routerMock;
});
vi.mock("@/common/hooks/use-user-limits", () => ({
  useUserLimits: () => ({ tier: "FREE" }),
}));

function upload(container: HTMLElement, file: File) {
  const input = container.querySelector<HTMLInputElement>("input[type=file]");
  if (!input) throw new Error("file input missing");
  fireEvent.change(input, { target: { files: [file] } });
}

function drop(file: File) {
  fireEvent.drop(screen.getByText("importer.upload.dragAndDrop"), {
    dataTransfer: { files: [file] },
  });
}

const csv = (bytes: BlobPart) =>
  new File([bytes], "qa-20261110-export.csv", { type: "text/csv" });

describe("UploadStep refusals", () => {
  let alert: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    parseLLMFile.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
    alert = vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it.each([
    ["a 0-byte file", ""],
    ["blank lines", "\r\n  \n\t\n"],
    ["a UTF-8 BOM and a newline", new Uint8Array([0xef, 0xbb, 0xbf, 0x0a])],
  ])(
    "says %s is empty, with no AI offer and a new-file path",
    async (_, bytes) => {
      const onParseComplete = vi.fn();
      const { container } = render(
        <UploadStep onParseComplete={onParseComplete} />,
      );

      upload(container, csv(bytes));

      const message = await screen.findByRole("alert");
      expect(message).toHaveTextContent("importer.error.emptyFile");
      expect(message).toHaveTextContent("importer.error.emptyFileDescription");
      expect(screen.queryByText("importer.aiOffer.parseWithAi")).toBeNull();
      expect(parseLLMFile).not.toHaveBeenCalled();
      expect(onParseComplete).not.toHaveBeenCalled();

      fireEvent.click(
        screen.getByRole("button", {
          name: "importer.error.uploadDifferentFile",
        }),
      );
      expect(screen.getByText("importer.upload.dragAndDrop")).toBeVisible();
    },
  );

  it("still reports a header-only CSV as parsed with no transactions", async () => {
    const onParseComplete = vi.fn();
    const { container } = render(
      <UploadStep onParseComplete={onParseComplete} />,
    );

    upload(container, csv("Date,Payee,Description,Amount\n"));

    await waitFor(() => expect(onParseComplete).toHaveBeenCalledTimes(1));
    expect(onParseComplete.mock.calls[0][0].validCount).toBe(0);
    expect(screen.queryByText("importer.error.emptyFile")).toBeNull();
  });

  it.each(["statement.xlsx", "statement.xls", "budget.numbers"])(
    "refuses %s in the page, naming how to save it as CSV",
    async (name) => {
      const onParseComplete = vi.fn();
      render(<UploadStep onParseComplete={onParseComplete} />);

      drop(new File(["PK"], name));

      const message = await screen.findByRole("alert");
      expect(message).toHaveTextContent(
        `importer.upload.spreadsheetFormatError {"extension":".${name.split(".").pop()}"}`,
      );
      expect(alert).not.toHaveBeenCalled();
      expect(parseLLMFile).not.toHaveBeenCalled();
      expect(onParseComplete).not.toHaveBeenCalled();
    },
  );

  it("refuses another unsupported type in the page", async () => {
    render(<UploadStep onParseComplete={vi.fn()} />);

    drop(new File(["notes"], "notes.txt", { type: "text/plain" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "importer.upload.unsupportedFormatError",
    );
    expect(alert).not.toHaveBeenCalled();
  });

  it("refuses an 11 MB file in the page, and clears once a file is accepted", async () => {
    const onParseComplete = vi.fn();
    const { container } = render(
      <UploadStep onParseComplete={onParseComplete} />,
    );

    upload(
      container,
      new File([new Uint8Array(11 * 1024 * 1024)], "qa-20261110-large.pdf", {
        type: "application/pdf",
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "importer.upload.fileSizeError",
    );
    expect(alert).not.toHaveBeenCalled();
    expect(parseLLMFile).not.toHaveBeenCalled();

    upload(
      container,
      csv("Date,Payee,Description,Amount\n2026-11-10,qa,qa,-1.00\n"),
    );
    await waitFor(() => expect(onParseComplete).toHaveBeenCalledTimes(1));
  });
});

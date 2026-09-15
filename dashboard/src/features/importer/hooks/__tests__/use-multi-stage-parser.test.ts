import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useMultiStageParser } from "../use-multi-stage-parser";
import type { CSVParseResult } from "../../types";

const parseCSVFile = vi.fn();
const parseLLMFile = vi.fn();

vi.mock("../use-csv-parser", () => ({
  useCSVParser: () => ({
    parseFile: parseCSVFile,
  }),
}));

vi.mock("../use-llm-parser", () => ({
  useLLMParser: () => ({
    parseFile: parseLLMFile,
  }),
}));

vi.mock("../../utils/file-format-detector", () => ({
  detectFileFormat: (file: File) => {
    if (file.name.endsWith(".csv")) return "csv";
    if (file.name.endsWith(".pdf")) return "pdf";
    return "unknown";
  },
}));

function csvFile(name: string, content = "x"): File {
  return new File([content], name, { type: "text/csv" });
}

describe("useMultiStageParser", () => {
  beforeEach(() => {
    parseCSVFile.mockReset();
    parseLLMFile.mockReset();
  });

  it("does not call LLM when CSV has unsupported-precision and zero valid rows", async () => {
    const repairable: CSVParseResult = {
      rows: [
        {
          id: "1",
          date: "2026-09-01",
          payee: "QA",
          description: "Precision",
          amount: 0,
          amountInput: "0.123456789012345678",
          amountFailureReason: "unsupported-precision",
          errors: ["Amount has unsupported precision"],
        },
      ],
      validCount: 0,
      errorCount: 1,
      hasErrors: true,
      blockLlmFallback: "unsupported-precision",
    };
    parseCSVFile.mockResolvedValue(repairable);

    const { result } = renderHook(() => useMultiStageParser());
    let parsed: CSVParseResult | undefined;
    await act(async () => {
      parsed = await result.current.parseFile(csvFile("amounts.csv"));
    });

    expect(parsed).toEqual(repairable);
    expect(parseLLMFile).not.toHaveBeenCalled();
    expect(result.current.stage).toBe("complete");
  });

  it("still falls through to LLM for unrecognized CSV with zero valid rows", async () => {
    parseCSVFile.mockResolvedValue({
      rows: [],
      validCount: 0,
      errorCount: 0,
      hasErrors: false,
    } satisfies CSVParseResult);
    parseLLMFile.mockResolvedValue({
      rows: [
        {
          id: "llm",
          date: "2026-01-01",
          payee: "AI",
          description: "Parsed",
          amount: 1,
          amountInput: "1",
        },
      ],
      validCount: 1,
      errorCount: 0,
      hasErrors: false,
    } satisfies CSVParseResult);

    const { result } = renderHook(() => useMultiStageParser());
    await act(async () => {
      await result.current.parseFile(csvFile("empty.csv"));
    });

    expect(parseLLMFile).toHaveBeenCalledTimes(1);
    expect(result.current.stage).toBe("complete");
  });

  it("returns mixed CSV without LLM when some rows are valid", async () => {
    const mixed: CSVParseResult = {
      rows: [
        {
          id: "1",
          date: "2026-09-01",
          payee: "QA",
          description: "Bad",
          amount: 0,
          amountInput: "9007199254740993",
          amountFailureReason: "unsupported-precision",
          errors: ["Amount has unsupported precision"],
        },
        {
          id: "2",
          date: "2026-09-04",
          payee: "QA Control",
          description: "Ordinary decimal",
          amount: 1.25,
          amountInput: "1.25",
        },
      ],
      validCount: 1,
      errorCount: 1,
      hasErrors: true,
      blockLlmFallback: "unsupported-precision",
    };
    parseCSVFile.mockResolvedValue(mixed);

    const { result } = renderHook(() => useMultiStageParser());
    let parsed: CSVParseResult | undefined;
    await act(async () => {
      parsed = await result.current.parseFile(csvFile("mixed.csv"));
    });

    expect(parsed?.validCount).toBe(1);
    expect(parsed?.rows[1].amount).toBe(1.25);
    expect(parseLLMFile).not.toHaveBeenCalled();
  });

  it("uses LLM for non-CSV formats", async () => {
    parseLLMFile.mockResolvedValue({
      rows: [],
      validCount: 0,
      errorCount: 0,
      hasErrors: false,
    } satisfies CSVParseResult);

    const { result } = renderHook(() => useMultiStageParser());
    await act(async () => {
      await result.current.parseFile(
        new File(["%PDF"], "scan.pdf", { type: "application/pdf" }),
      );
    });

    expect(parseCSVFile).not.toHaveBeenCalled();
    expect(parseLLMFile).toHaveBeenCalledTimes(1);
  });
});

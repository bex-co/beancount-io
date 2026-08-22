import type { FileMap } from "@rustledger/wasm";

const mockParseLedgerFilesInProcess = jest.fn();
const mockCreateBookedBlockParser = jest.fn();

jest.mock("../engine", () => ({
  parseLedgerFilesInProcess: (...args: unknown[]) =>
    mockParseLedgerFilesInProcess(...args),
}));
jest.mock("../booked-block-parser", () => ({
  createBookedBlockParser: () => mockCreateBookedBlockParser(),
}));

import { findEntrySliceWithFullLedger } from "../source-slice-resolver";

describe("findEntrySliceWithFullLedger", () => {
  it("uses full-ledger source details for an inventory-dependent entry ID", async () => {
    const sellSource =
      '2024-02-01 * "Sell"\n' +
      "  Assets:Broker  -5 HOOL {}\n" +
      "  Assets:Cash    600 USD\n" +
      "  Income:Gains\n";
    const files: FileMap = {
      "main.bean": 'include "buy.bean"\ninclude "sell.bean"\n',
      "buy.bean":
        '2024-01-02 * "Buy"\n' +
        "  Assets:Broker  10 HOOL {100 USD}\n" +
        "  Assets:Cash  -1000 USD\n",
      "sell.bean": sellSource,
    };
    mockParseLedgerFilesInProcess.mockResolvedValue({
      sourceDetails: {
        "booked-sell-id": { filename: "sell.bean", lineno: 1 },
      },
    });

    await expect(
      findEntrySliceWithFullLedger(files, "main.bean", "booked-sell-id"),
    ).resolves.toMatchObject({
      file: "sell.bean",
      slice: sellSource.trimEnd(),
      startLine: 0,
      localOccurrence: 0,
    });
    expect(mockParseLedgerFilesInProcess).toHaveBeenCalledWith(
      files,
      "main.bean",
      { includeSourceDetails: true },
    );
    expect(mockCreateBookedBlockParser).not.toHaveBeenCalled();
  });
});

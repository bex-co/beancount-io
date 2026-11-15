jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
jest.mock("../../utils/call-llm", () => ({ callLLM: jest.fn() }));
jest.mock("@/shared/logger", () => {
  const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn(),
  };
  logger.child.mockReturnValue(logger);
  return { logger };
});

import { callLLM } from "../../utils/call-llm";
import { LLMService } from "../llm-service";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
} from "@/server/api/authorization";
import type { Identity } from "@/server/api/identity";
import { logger } from "@/shared/logger";
import { extractReceiptFromFile } from "../../utils/extract-receipt-from-file";

const identity: Identity = {
  userId: "usr_alice",
  method: "session",
  scopes: new Set(),
};
const downloadUrl = "https://storage.invalid/statement";
const tokenUsage = { inputTokens: 12, outputTokens: 8 };
const rows = [
  {
    date: "2026-10-01",
    payee: "QA Synthetic Grocer",
    description: "Grocery purchase",
    amount: -23.1,
  },
  {
    date: "2026-10-02",
    payee: "QA Synthetic Payroll",
    description: "Payroll deposit",
    amount: 500,
  },
];

function fixture(contentType = "text/csv") {
  const charge = jest.fn(async () => undefined);
  const metadata = jest.fn(async () => ({ contentType }));
  const download = jest.fn(async () => ({ downloadUrl, expiresIn: 600 }));
  const check = jest.fn(async () => ({
    allowed: true,
    currentCount: 0,
    maxAllowed: 1000,
  }));
  const service = new LLMService(
    {} as never,
    { getObjectMetadata: metadata, generateDownloadUrl: download } as never,
    { check, addTokenUsage: charge } as never,
    {
      openai: { apiKey: "fixture", baseUrl: "https://api.openai.com/v1" },
    } as never,
    new AuthorizationService(
      new SourceBackedRelationshipEvaluator(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      ),
    ),
  );
  return { service, charge, metadata, download, check };
}

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  jest.mocked(callLLM).mockReset();
});

describe("grounding file descriptions in the actual downloaded source", () => {
  it("blanks invented debit-credit CSV descriptions without changing financial fields or usage charges", async () => {
    const source =
      "Transaction Date,Payee,Debit,Credit\n2026-10-01,QA Synthetic Grocer,23.10,\n2026-10-02,QA Synthetic Payroll,,500.00\n";
    const fetchFile = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(source));
    jest.mocked(callLLM).mockResolvedValue({ transactions: rows, tokenUsage });
    const f = fixture();
    const result = await f.service.parseFile(
      identity,
      "tmp/usr_alice/statement.csv",
      "csv",
    );
    expect(result).toEqual({
      rows: rows.map((row) => ({ ...row, description: "" })),
    });
    expect(fetchFile).toHaveBeenCalledTimes(1);
    expect(fetchFile).toHaveBeenCalledWith(downloadUrl);
    expect(callLLM).toHaveBeenCalledTimes(1);
    expect(callLLM).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: "user", content: expect.stringContaining(source) }],
      }),
    );
    expect(f.charge).toHaveBeenCalledTimes(1);
    expect(f.charge).toHaveBeenCalledWith("usr_alice", 20);
    expect(jest.mocked(logger.warn).mock.calls).toEqual([
      [expect.any(String), { removedDescriptionCount: 2 }],
    ]);
    expect(rows.map(({ description }) => description)).toEqual([
      "Grocery purchase",
      "Payroll deposit",
    ]);
  });

  it("blanks translated semicolon CSV prose while keeping source-language descriptions verbatim except trimming", async () => {
    const source =
      "Date;Description;Amount\n2026-10-01;QA Synthetic Gehalt;500\n2026-10-02;QA Synthetic Bäckerei;-23,10\n";
    const modelRows = [
      { ...rows[1], description: "Salary payment" },
      { ...rows[0], description: "  QA Synthetic Bäckerei  " },
      { ...rows[1], description: "QA Synthetic Gehalt" },
      { ...rows[0], description: "" },
    ];
    jest.spyOn(global, "fetch").mockResolvedValue(new Response(source));
    jest
      .mocked(callLLM)
      .mockResolvedValue({ transactions: modelRows, tokenUsage });
    const f = fixture();
    const result = await f.service.parseFile(
      identity,
      "tmp/usr_alice/semicolon.csv",
      "csv",
    );
    expect(result.rows).toEqual([
      { ...rows[1], description: "" },
      { ...rows[0], description: "QA Synthetic Bäckerei" },
      { ...rows[1], description: "QA Synthetic Gehalt" },
      { ...rows[0], description: "" },
    ]);
    expect(f.charge).toHaveBeenCalledWith("usr_alice", 20);
    expect(logger.warn).toHaveBeenCalledWith(expect.any(String), {
      removedDescriptionCount: 1,
    });
  });

  it.each([
    {
      format: "csv",
      mediaType: "text/csv",
      source: "Date,Description,Amount\n2026-10-01,Café breakfast,-23.10\n",
    },
    {
      format: "ofx",
      mediaType: "application/x-ofx",
      source:
        "<OFX><STMTTRN><DTPOSTED>20261001<TRNAMT>-23.10<NAME>Café<MEMO>Café breakfast</STMTTRN></OFX>",
    },
    {
      format: "ofx",
      mediaType: "application/x-ofx",
      source:
        "<OFX><STMTTRN><DTPOSTED>20261001<TRNAMT>-23.10<NAME>AT&amp;T<MEMO>AT&amp;T mobile fee</MEMO></STMTTRN></OFX>",
      memo: "AT&T mobile fee",
      payee: "AT&T",
    },
    {
      format: "ofx",
      mediaType: "application/x-ofx",
      source:
        "<OFX><STMTTRN><DTPOSTED>20261001<TRNAMT>-23.10<MEMO>AT&#38;T C&#x61;fé mobile fee</MEMO></STMTTRN></OFX>",
      memo: "AT&T Café mobile fee",
      payee: "AT&T",
    },
    {
      format: "ofx",
      mediaType: "application/x-ofx",
      source:
        "<OFX><STMTTRN><DTPOSTED>20261001<TRNAMT>-23.10<MEMO>Café breakfast &#x110000;</MEMO></STMTTRN></OFX>",
    },
    {
      format: "qif",
      mediaType: "application/octet-stream",
      source: "!Type:Bank\nD10/01/2026\nT-23.10\nPCafé\nMCafé breakfast\n^\n",
    },
    {
      format: "qif",
      mediaType: "application/octet-stream",
      source:
        "!Type:Bank\nD10/01/2026\nT-23.10\nPCafé\nSExpenses:Dining\nEAprès travail\n$-23.10\n^\n",
      memo: "Après travail",
    },
    {
      format: "unknown",
      mediaType: "application/x-qif",
      source: "!Type:Bank\nD10/01/2026\nT-23.10\nPShop\nMGroceries\n^\n",
      memo: "Groceries",
      modelDescription: "Groceries",
      payee: "Shop",
    },
    {
      format: "txt",
      mediaType: "application/x-ofx",
      source:
        "<OFX><STMTTRN><DTPOSTED>20261001<TRNAMT>-23.10<NAME>Shop<MEMO>Tom &amp; Jerry</MEMO></STMTTRN></OFX>",
      memo: "Tom & Jerry",
      modelDescription: "Tom & Jerry",
      payee: "Shop",
    },
    {
      format: "txt",
      mediaType: "text/plain; charset=utf-8",
      source: "2026-10-01 | Café | Café breakfast | -23.10\n",
    },
    {
      format: "text",
      mediaType: "application/octet-stream",
      source: "2026-10-01 Café breakfast -23.10\n",
    },
  ])(
    "retains legitimate $format memo text with one download and model call ($mediaType)",
    async ({
      format,
      mediaType,
      source,
      memo = "Café breakfast",
      modelDescription,
      payee = "Café",
    }) => {
      const fetchFile = jest
        .spyOn(global, "fetch")
        .mockResolvedValue(new Response(source));
      const extracted = [
        {
          ...rows[0],
          payee,
          description: modelDescription ?? ` ${memo} `,
        },
      ];
      jest
        .mocked(callLLM)
        .mockResolvedValue({ transactions: extracted, tokenUsage });
      const f = fixture(mediaType);
      expect(
        await f.service.parseFile(
          identity,
          `tmp/usr_alice/statement.${format}`,
          format,
        ),
      ).toEqual({ rows: [{ ...extracted[0], description: memo }] });
      expect(fetchFile).toHaveBeenCalledTimes(1);
      expect(callLLM).toHaveBeenCalledTimes(1);
      expect(callLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: "user", content: expect.stringContaining(source) },
          ],
        }),
      );
      expect(f.charge).toHaveBeenCalledWith("usr_alice", 20);
      expect(logger.warn).not.toHaveBeenCalled();
    },
  );

  it("checks whole contiguous Unicode tokens rather than substrings, reordered words, or an empty symbol-token sequence", async () => {
    const source =
      "Date,Memo\n2026-10-01,Überweisung für Café\n2026-10-02,supermarket payment\n2026-10-03,☀️\n";
    const descriptions = [
      "  Überweisung für Café  ",
      "Café für Überweisung",
      "market",
      "!!!",
      "☂️",
      "",
      " \t ",
    ];
    const extracted = descriptions.map((description) => ({
      ...rows[0],
      description,
    }));
    jest.spyOn(global, "fetch").mockResolvedValue(new Response(source));
    jest
      .mocked(callLLM)
      .mockResolvedValue({ transactions: extracted, tokenUsage });
    const f = fixture("text/plain");
    expect(
      (
        await f.service.parseFile(identity, "tmp/usr_alice/memos.txt", "txt")
      ).rows.map(({ description }) => description),
    ).toEqual(["Überweisung für Café", "", "", "", "", "", ""]);
    expect(extracted.map(({ description }) => description)).toEqual(
      descriptions,
    );
  });

  it("never grounds an invented nonempty description in an empty source", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(new Response(""));
    jest
      .mocked(callLLM)
      .mockResolvedValue({ transactions: [rows[0]], tokenUsage });
    const f = fixture("text/plain");
    expect(
      await f.service.parseFile(identity, "tmp/usr_alice/empty.txt", "txt"),
    ).toEqual({ rows: [{ ...rows[0], description: "" }] });
    expect(f.charge).toHaveBeenCalledWith("usr_alice", 20);
  });

  it("preserves an empty extraction and charges only its actual model usage", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response("Date,Memo,Amount\n"));
    jest.mocked(callLLM).mockResolvedValue({ transactions: [], tokenUsage });
    const f = fixture();
    expect(
      await f.service.parseFile(identity, "tmp/usr_alice/empty.csv", "csv"),
    ).toEqual({ rows: [] });
    expect(f.charge).toHaveBeenCalledWith("usr_alice", 20);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it.each([
    ["pdf", "application/pdf"],
    ["png", "image/png"],
  ])(
    "preserves binary %s file summaries without a text download",
    async (format, mediaType) => {
      const fetchFile = jest.spyOn(global, "fetch");
      jest
        .mocked(callLLM)
        .mockResolvedValue({ transactions: [rows[0]], tokenUsage });
      const f = fixture(mediaType);
      expect(
        await f.service.parseFile(
          identity,
          `tmp/usr_alice/bill.${format}`,
          format,
        ),
      ).toEqual({ rows: [rows[0]] });
      expect(fetchFile).not.toHaveBeenCalled();
      expect(callLLM).toHaveBeenCalledTimes(1);
      expect(f.charge).toHaveBeenCalledWith("usr_alice", 20);
      expect(logger.warn).not.toHaveBeenCalled();
    },
  );

  it("keeps receipt-only summary and optional-date behavior separate from statement grounding", async () => {
    const fetchFile = jest.spyOn(global, "fetch");
    jest
      .mocked(callLLM)
      .mockResolvedValue({ transactions: [rows[0]], tokenUsage });
    expect(
      await extractReceiptFromFile({
        llmClient: {} as never,
        fileUrl: downloadUrl,
        format: "pdf",
        mediaType: "application/pdf",
      }),
    ).toEqual({ transaction: rows[0], tokenUsage });
    expect(callLLM).toHaveBeenCalledWith(
      expect.objectContaining({ dateOptional: true }),
    );
    expect(fetchFile).not.toHaveBeenCalled();
  });

  it("refuses a failed source download before the model or usage charge", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response("Unavailable", { status: 503 }));
    const f = fixture();
    await expect(
      f.service.parseFile(identity, "tmp/usr_alice/source.csv", "csv"),
    ).rejects.toMatchObject({ category: "SERVICE_UNAVAILABLE" });
    expect(callLLM).not.toHaveBeenCalled();
    expect(f.charge).not.toHaveBeenCalled();
  });
});

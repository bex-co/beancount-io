import type { DirectiveJson } from "@rustledger/wasm";
import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { parseLedgerFiles } from "@/foundation/rustledger";
import { LedgerDataService } from "../ledger-data-service";

jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
}));

jest.mock("@/foundation/rustledger", () => ({
  ...jest.requireActual("@/foundation/rustledger"),
  parseLedgerFiles: jest.fn(),
}));

type Transaction = Extract<DirectiveJson, { type: "transaction" }>;

function transaction(
  date: string,
  fields: Partial<Transaction> = {},
): Transaction {
  return {
    type: "transaction",
    date,
    flag: "*",
    tags: [],
    links: [],
    postings: [
      { account: "Assets:Cash", units: { number: "-5", currency: "USD" } },
      { account: "Expenses:Fees", units: { number: "5", currency: "USD" } },
    ],
    ...fields,
  };
}

const olderBlank = transaction("2024-02-01", { payee: "Earlier blank" });
const sameDateEarlier = transaction("2024-03-01", { payee: "Cable" });
const sameDateLater = transaction("2024-03-01", {
  payee: "Broker",
  postings: [
    {
      account: "Assets:Shares",
      units: { number: "2", currency: "HOOL" },
      price: { number: "30", currency: "USD" },
    },
    { account: "Assets:Cash", units: { number: "-60", currency: "USD" } },
  ],
});
const earlierGroceries = transaction("2024-04-01", {
  payee: "Store",
  narration: "Buying groceries",
});
const laterGroceries = transaction("2024-04-01", {
  payee: "Store",
  narration: "Buying groceries",
  postings: [
    { account: "Assets:Cash", units: { number: "-12", currency: "USD" } },
    { account: "Expenses:Food", units: { number: "12", currency: "USD" } },
  ],
});
const narrationOnly = transaction("2024-05-01", {
  narration: "Narration only",
});
const directives: DirectiveJson[] = [
  olderBlank,
  sameDateEarlier,
  sameDateLater,
  earlierGroceries,
  laterGroceries,
  narrationOnly,
];
const files = { "main.bean": "" };
const params = { ledgerId: "synthetic/book", userId: "synthetic-user" };
const loadMock = jest.mocked(loadCachedFileMapForRepo);
const parseMock = jest.mocked(parseLedgerFiles);
const client = {};
const getPublicApiClient = jest.fn().mockResolvedValue(client);

function service() {
  return new LedgerDataService({ getPublicApiClient } as never, {} as never);
}

beforeEach(() => {
  jest.clearAllMocks();
  loadMock.mockResolvedValue({
    files,
    entryPoint: "main.bean",
    sourceFiles: ["main.bean"],
    repoPaths: ["main.bean"],
    managedPrices: [],
    managedPricePaths: [],
    ref: "HEAD",
  });
  parseMock.mockResolvedValue({
    valid: true,
    errors: [],
    options: { operating_currencies: ["USD"], title: null },
    directives,
    directiveCount: directives.length,
  });
});

describe("transaction lookups with native omitted narration", () => {
  const expectedBlank = {
    date: "2024-03-01",
    payee: "Broker",
    narration: "",
    postings: [
      { account: "Assets:Shares", amount: "2", commodity: "HOOL", price: "30" },
      { account: "Assets:Cash", amount: "-60", commodity: "USD", price: null },
    ],
  };

  it("finds the latest blank narration, including later source order on the same date", async () => {
    await expect(
      service().getNarrationTransactions({ ...params, narration: "" }),
    ).resolves.toEqual(expectedBlank);
    expect(getPublicApiClient).toHaveBeenCalledWith(
      params.ledgerId,
      params.userId,
    );
    expect(loadMock).toHaveBeenCalledWith(
      client,
      expect.anything(),
      "synthetic",
      "book",
    );
    expect(parseMock).toHaveBeenCalledTimes(1);
    expect(parseMock).toHaveBeenCalledWith(files, "main.bean", {
      repoPaths: ["main.bean"],
    });
  });

  it("returns canonical empty narration through a matching payee lookup", async () => {
    await expect(
      service().getPayeeTransactions({ ...params, payee: "Broker" }),
    ).resolves.toEqual(expectedBlank);
  });

  it("continues to match an explicitly present empty narration", async () => {
    parseMock.mockResolvedValueOnce({
      valid: true,
      errors: [],
      options: { operating_currencies: ["USD"], title: null },
      directives: [{ ...sameDateLater, narration: "" }],
      directiveCount: 1,
    });
    await expect(
      service().getNarrationTransactions({ ...params, narration: "" }),
    ).resolves.toEqual(expectedBlank);
  });

  it("keeps nonempty narration matching and same-date later-source ordering", async () => {
    await expect(
      service().getNarrationTransactions({
        ...params,
        narration: "Buying groceries",
      }),
    ).resolves.toEqual({
      date: "2024-04-01",
      payee: "Store",
      narration: "Buying groceries",
      postings: [
        {
          account: "Assets:Cash",
          amount: "-12",
          commodity: "USD",
          price: null,
        },
        {
          account: "Expenses:Food",
          amount: "12",
          commodity: "USD",
          price: null,
        },
      ],
    });
  });

  it("keeps absent payees null in a narration match", async () => {
    await expect(
      service().getNarrationTransactions({
        ...params,
        narration: "Narration only",
      }),
    ).resolves.toMatchObject({ payee: null, narration: "Narration only" });
  });

  it("does not equate an absent payee with an empty payee lookup", async () => {
    await expect(
      service().getPayeeTransactions({ ...params, payee: "" }),
    ).resolves.toBeNull();
  });

  it("returns null for genuinely unmatched narration rather than the latest blank entry", async () => {
    await expect(
      service().getNarrationTransactions({
        ...params,
        narration: "No such narration",
      }),
    ).resolves.toBeNull();
  });

  it("returns null for a genuinely unmatched payee", async () => {
    await expect(
      service().getPayeeTransactions({ ...params, payee: "No such payee" }),
    ).resolves.toBeNull();
  });
});

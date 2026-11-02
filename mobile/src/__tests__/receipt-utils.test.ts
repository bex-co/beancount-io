import {
  receiptAmountText,
  receiptDate,
  receiptErrorKey,
  parseErrorCode,
  mimeToExt,
  shotFromLibraryResult,
} from "../screens/receipt-capture-screen/receipt-utils";
import { getFormatDate } from "../common/format-util";
import { currencyMinorUnits } from "../common/currency-util";
import {
  buildEntryInput,
  createPrefilledPostings,
} from "../screens/multi-postings-transaction/postings-utils";

// ──────────────────────────────────────────────────────────────────────────────
// receiptDate
// ──────────────────────────────────────────────────────────────────────────────

test("receiptDate passes a parsed date through unchanged", () => {
  expect(receiptDate("2026-01-15")).toBe("2026-01-15");
});

test("receiptDate falls back to today when the server returns no date", () => {
  const today = getFormatDate(new Date());
  expect(receiptDate("")).toBe(today);
  expect(receiptDate(null)).toBe(today);
  expect(receiptDate(undefined)).toBe(today);
});

// ──────────────────────────────────────────────────────────────────────────────
// receiptErrorKey
// ──────────────────────────────────────────────────────────────────────────────

test("receiptErrorKey maps quota_exhausted", () => {
  expect(receiptErrorKey("quota_exhausted")).toBe("agentQuotaBody");
});

test("receiptErrorKey maps parse_failed", () => {
  expect(receiptErrorKey("parse_failed")).toBe("receiptParseFailed");
});

test("receiptErrorKey falls back to upload failed for unknown codes", () => {
  expect(receiptErrorKey("upload_failed")).toBe("receiptUploadFailed");
  expect(receiptErrorKey("upload_url_timeout")).toBe("receiptUploadFailed");
  expect(receiptErrorKey("network_error")).toBe("receiptUploadFailed");
  expect(receiptErrorKey("")).toBe("receiptUploadFailed");
});

// ──────────────────────────────────────────────────────────────────────────────
// parseErrorCode — classifies the thrown parse-leg ApolloError
// ──────────────────────────────────────────────────────────────────────────────

test("parseErrorCode maps a RESOURCE_LIMIT_REACHED GraphQL error to quota", () => {
  const err = {
    graphQLErrors: [{ extensions: { code: "RESOURCE_LIMIT_REACHED" } }],
  };
  expect(parseErrorCode(err)).toBe("quota_exhausted");
});

test("parseErrorCode maps other GraphQL errors to parse_failed", () => {
  const err = {
    graphQLErrors: [{ extensions: { code: "INTERNAL_SERVER_ERROR" } }],
  };
  expect(parseErrorCode(err)).toBe("parse_failed");
});

test("parseErrorCode treats a network error (no GraphQL codes) as parse_failed", () => {
  expect(parseErrorCode(new Error("Network request failed"))).toBe(
    "parse_failed",
  );
  expect(parseErrorCode({ networkError: new Error("offline") })).toBe(
    "parse_failed",
  );
});

test("parseErrorCode is defensive against malformed shapes", () => {
  expect(parseErrorCode(null)).toBe("parse_failed");
  expect(parseErrorCode({ graphQLErrors: "nope" })).toBe("parse_failed");
  expect(parseErrorCode({ graphQLErrors: [{}] })).toBe("parse_failed");
});

test("parseErrorCode's result routes through receiptErrorKey to the right message", () => {
  const quota = {
    graphQLErrors: [{ extensions: { code: "RESOURCE_LIMIT_REACHED" } }],
  };
  expect(receiptErrorKey(parseErrorCode(quota))).toBe("agentQuotaBody");
  const parse = { graphQLErrors: [{ extensions: { code: "BAD_USER_INPUT" } }] };
  expect(receiptErrorKey(parseErrorCode(parse))).toBe("receiptParseFailed");
});

// ──────────────────────────────────────────────────────────────────────────────
// mimeToExt
// ──────────────────────────────────────────────────────────────────────────────

test("mimeToExt extracts jpeg subtype", () => {
  expect(mimeToExt("image/jpeg")).toBe("jpeg");
});

test("mimeToExt extracts png subtype", () => {
  expect(mimeToExt("image/png")).toBe("png");
});

test("mimeToExt falls back to jpg for malformed mime", () => {
  expect(mimeToExt("invalidmime")).toBe("jpg");
});

// ──────────────────────────────────────────────────────────────────────────────
// shotFromLibraryResult (the library-pick path, with a stand-in picker)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Stands in for `ImagePicker.launchImageLibraryAsync`. The screen now calls it
 * with no permission request in front of it, so what is worth pinning down is
 * how each result shape is turned into a shot.
 */
const pick = async (result: unknown) =>
  shotFromLibraryResult(
    (await Promise.resolve(result)) as Parameters<
      typeof shotFromLibraryResult
    >[0],
  );

test("a picked image becomes a shot, carrying its own mime type and name", async () => {
  expect(
    await pick({
      canceled: false,
      assets: [
        { uri: "file:///r.png", mimeType: "image/png", fileName: "r.png" },
      ],
    }),
  ).toEqual({
    uri: "file:///r.png",
    mimeType: "image/png",
    filename: "r.png",
  });
});

test("a picked image with no metadata falls back to a jpeg receipt name", async () => {
  expect(
    await pick({ canceled: false, assets: [{ uri: "file:///r" }] }),
  ).toEqual({
    uri: "file:///r",
    mimeType: "image/jpeg",
    filename: "receipt.jpeg",
  });
});

test("a png without a filename is named from its mime type", async () => {
  expect(
    await pick({
      canceled: false,
      assets: [{ uri: "file:///r", mimeType: "image/png", fileName: null }],
    }),
  ).toEqual({
    uri: "file:///r",
    mimeType: "image/png",
    filename: "receipt.png",
  });
});

test("cancelling the picker yields no shot", async () => {
  expect(await pick({ canceled: true, assets: null })).toBe(null);
});

test("a result with no usable asset yields no shot", async () => {
  expect(await pick({ canceled: false, assets: [] })).toBe(null);
  expect(await pick({ canceled: false, assets: [null] })).toBe(null);
  expect(await pick({ canceled: false })).toBe(null);
  expect(await pick(undefined)).toBe(null);
});

// w21/069: the total was prefilled with toFixed(2), so a 3-decimal currency
// lost its last digit and 1.005 binary-rounded to "1.00".
describe("receiptAmountText", () => {
  it("keeps a 3-decimal total exact", () => {
    expect(receiptAmountText(12.345)).toBe("12.345");
    expect(receiptAmountText(1.005)).toBe("1.005");
    expect(receiptAmountText(0.125)).toBe("0.125");
  });

  it("shows 2-decimal currencies as before, positive", () => {
    expect(receiptAmountText(-42.5)).toBe("42.50");
    expect(receiptAmountText(12)).toBe("12");
    expect(receiptAmountText(19.99)).toBe("19.99");
  });

  it("is what the screen prefills and reveals", () => {
    const source = require("fs").readFileSync(
      require("path").join(
        __dirname,
        "..",
        "screens",
        "receipt-capture-screen",
        "receipt-capture-screen.tsx",
      ),
      "utf8",
    ) as string;
    expect(source.includes("toFixed")).toBe(false);
    expect(
      source.includes("prefillAmount: receiptAmountText(phase.amount),"),
    ).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// w21/282: Android re-encodes a HEIC pick to a .jpeg cache file but still
// reports image/heic and the .heic name.
// ──────────────────────────────────────────────────────────────────────────────

test("a re-encoded Android pick is the jpeg its file is, not the heic it reports", async () => {
  expect(
    await pick({
      canceled: false,
      assets: [
        {
          uri: "file:///data/cache/ImagePicker/3f2a.jpeg",
          mimeType: "image/heic",
          fileName: "20261021_101500.heic",
        },
      ],
    }),
  ).toEqual({
    uri: "file:///data/cache/ImagePicker/3f2a.jpeg",
    mimeType: "image/jpeg",
    filename: "20261021_101500.jpeg",
  });
});

test("a pick whose file says nothing keeps the reported type and name", async () => {
  expect(
    await pick({
      canceled: false,
      assets: [
        {
          uri: "content://media/external/images/media/42",
          mimeType: "image/png",
          fileName: "scan.png",
        },
      ],
    }),
  ).toEqual({
    uri: "content://media/external/images/media/42",
    mimeType: "image/png",
    filename: "scan.png",
  });
});

test("a query string does not hide the file's extension", async () => {
  expect(
    await pick({
      canceled: false,
      assets: [{ uri: "file:///c/a.JPG?x=1", mimeType: "image/heif" }],
    }),
  ).toEqual({
    uri: "file:///c/a.JPG?x=1",
    mimeType: "image/jpeg",
    filename: "receipt.jpg",
  });
});

// w21/285: a date that is not a real YYYY-MM-DD day opened the form on an
// Invalid Date.
test("receiptDate falls back to today for anything that is not an ISO day", () => {
  const today = getFormatDate(new Date());
  for (const bad of [
    "2026/10/21",
    "2026-10-21T14:32:00",
    "21/10/2026",
    "2026-1-5",
    "2026-02-30",
    "2025-02-29",
    "yesterday",
  ]) {
    expect(receiptDate(bad)).toBe(today);
  }
  expect(receiptDate("2024-02-29")).toBe("2024-02-29");
});

// w21/389: a scanned 1500 JPY receipt saved "1500.00 JPY" because the prefill was
// always padded to two places and the payload never trimmed it.
describe("a scanned receipt's amount in the payload", () => {
  const payload = (total: number, currency: string) => {
    const postings = createPrefilledPostings(
      "Assets:Cash",
      "Expenses:Food",
      receiptAmountText(total),
      currencyMinorUnits(currency),
    );
    return buildEntryInput(postings, {
      date: "2026-10-21",
      payee: "Shop",
      narration: "x",
      currency,
    }).postings.map((posting) => posting.amount);
  };

  it("saves a whole yen total without decimals", () => {
    expect(payload(1500, "JPY")).toEqual(["-1500 JPY", "1500 JPY"]);
  });

  it("still pads a whole dollar total and keeps a fractional one", () => {
    expect(payload(1500, "USD")).toEqual(["-1500.00 USD", "1500.00 USD"]);
    expect(payload(42.5, "USD")).toEqual(["-42.50 USD", "42.50 USD"]);
    expect(payload(12.345, "KWD")).toEqual(["-12.345 KWD", "12.345 KWD"]);
  });
});

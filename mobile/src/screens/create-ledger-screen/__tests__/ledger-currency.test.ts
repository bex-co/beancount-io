import fs from "fs";
import path from "path";
import { buildSchema, parse, validate } from "graphql";
import { isUnsupportedDocumentError } from "../../../common/graphql-unsupported";
import { translationLocales } from "../../../translations/__tests__/locale-parity";
import {
  SERVER_DEFAULT_CURRENCY,
  currencyToSend,
  defaultLedgerCurrency,
  isLedgerCurrency,
} from "../ledger-currency";

/**
 * w3/m62: the create screen's one Currency field. It opens on the saved
 * preference, then the device's currency, then the device region's, then USD;
 * only a non-USD Starter sends it, through its own document, so every other
 * creation is the request installed apps and older servers already exchange.
 */
const root = path.join(__dirname, "..", "..", "..");
const document = (name: string) =>
  fs.readFileSync(
    path.join(root, "common", "graphql", "queries", `${name}.graphql`),
    "utf8",
  );
// A server from before the field (w21/508 keeps it apart from the snapshot).
const olderServer = buildSchema(
  fs.readFileSync(
    path.join(
      root,
      "common",
      "__tests__",
      "fixtures",
      "older-server.schema.graphql",
    ),
    "utf8",
  ),
);

describe("defaultLedgerCurrency", () => {
  it("prefers the saved preference over the device", () => {
    expect(
      defaultLedgerCurrency({
        saved: "CHF",
        nativeCurrency: "JPY",
        region: "DE",
      }),
    ).toBe("CHF");
  });

  it("takes the device's own currency, then its region's", () => {
    expect(defaultLedgerCurrency({ nativeCurrency: "jpy", region: "DE" })).toBe(
      "JPY",
    );
    expect(defaultLedgerCurrency({ region: "gb" })).toBe("GBP");
  });

  it("ignores codes no ledger can take and falls back to USD", () => {
    expect(
      defaultLedgerCurrency({
        saved: "XYZ",
        nativeCurrency: "XXX",
        region: "AQ",
      }),
    ).toBe(SERVER_DEFAULT_CURRENCY);
    expect(defaultLedgerCurrency({})).toBe("USD");
  });
});

describe("isLedgerCurrency", () => {
  it("accepts the server's codes only, exactly as written", () => {
    expect(isLedgerCurrency("EUR")).toBe(true);
    expect(isLedgerCurrency("eur")).toBe(false);
    expect(isLedgerCurrency("EURO")).toBe(false);
    expect(isLedgerCurrency("")).toBe(false);
  });
});

describe("currencyToSend", () => {
  it("sends a non-USD Starter's currency", () => {
    expect(currencyToSend({ template: "STARTER", currency: "EUR" })).toBe(
      "EUR",
    );
  });

  it("sends nothing for USD or a Sample, keeping the old request", () => {
    expect(currencyToSend({ template: "STARTER", currency: "USD" })).toBe(
      undefined,
    );
    expect(currencyToSend({ template: "SAMPLE", currency: "EUR" })).toBe(
      undefined,
    );
  });
});

describe("the create documents against a server older than the field", () => {
  it("keeps CreateLedger valid there, so USD and Sample still create", () => {
    expect(/currency/.test(document("createLedger"))).toBe(false);
    expect(validate(olderServer, parse(document("createLedger")))).toEqual([]);
  });

  it("is why a currency needs its own document: that server refuses it", () => {
    const errors = validate(
      olderServer,
      parse(document("createLedgerInCurrency")),
    );
    expect(
      errors.some(
        (error) =>
          error.message ===
          'Unknown argument "currency" on field "Mutation.createLedger".',
      ),
    ).toBe(true);
    expect(isUnsupportedDocumentError({ message: errors[0].message })).toBe(
      true,
    );
  });

  it("selects the same ledger fields in both documents", () => {
    const selection = (text: string) => text.slice(text.indexOf(") {\n    id"));
    expect(selection(document("createLedgerInCurrency"))).toBe(
      selection(document("createLedger")),
    );
  });
});

describe("currency translations", () => {
  it("are declared in every locale, with a distinct older-server message", () => {
    for (const locale of translationLocales()) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const catalog = require(`../../../translations/${locale}`)[locale];
      for (const key of [
        "createLedgerCurrency",
        "createLedgerCurrencyHint",
        "createLedgerCurrencyInvalid",
        "createLedgerCurrencyUnsupported",
      ]) {
        expect(typeof catalog[key]).toBe("string");
      }
      expect(catalog.createLedgerCurrencyUnsupported).not.toBe(
        catalog.createLedgerCurrencyInvalid,
      );
    }
  });
});

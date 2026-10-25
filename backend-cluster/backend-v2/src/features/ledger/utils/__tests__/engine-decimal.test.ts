import {
  assertAmountsFitEngineDecimal,
  textAmountLiterals,
} from "../engine-decimal";
import { BadUserInputError } from "@/shared/errors";

/** w23/081: the 28-significant-digit rule for amounts in raw Beancount text. */
describe("textAmountLiterals", () => {
  it("finds posting amounts, prices and balance assertions", () => {
    expect(
      textAmountLiterals(
        [
          '2021-01-02 * "raw"',
          "  Assets:Cash  999999999999999999999999999.99 USD",
          "  Equity:Initial",
          "2021-01-03 balance Assets:Cash 10.00 USD",
          "2021-01-04 price USD 1.50 EUR",
          "  Assets:Broker 10 HOOL @ 150.25 USD",
        ].join("\n"),
      ),
    ).toEqual([
      "999999999999999999999999999.99",
      "10.00",
      "1.50",
      "10",
      "150.25",
    ]);
  });

  it("ignores long digit strings outside amounts", () => {
    expect(
      textAmountLiterals(
        '2021-01-02 * "Invoice 99999999999999999999999999999999" "ref 99999999999999999999999999999999 USD"',
      ),
    ).toEqual([]);
    expect(
      textAmountLiterals(
        [
          '2021-01-02 * "x"',
          "  Assets:Cash 10 USD",
          '  statement: "no 99999999999999999999999999999999"',
          "; a comment holding 99999999999999999999999999999999 USD",
        ].join("\n"),
      ),
    ).toEqual(["10"]);
  });

  it("does not read account names, dates or tags as numbers", () => {
    expect(
      textAmountLiterals(
        [
          "2026-10-25 * #tag",
          "  Assets:Vault123456789012345678901234567890 10 USD",
          "  Equity:Initial",
        ].join("\n"),
      ),
    ).toEqual(["10"]);
  });
});

describe("assertAmountsFitEngineDecimal", () => {
  it.each([
    ["29 digits with cents", "999999999999999999999999999.99"],
    ["30 digits with cents", "9999999999999999999999999999.99"],
  ])("refuses the note's %s literal", (_name, literal) => {
    const text = [
      '2021-01-02 * "raw"',
      `  Assets:Cash  ${literal} USD`,
      "  Equity:Initial",
    ].join("\n");
    expect(() => assertAmountsFitEngineDecimal(text)).toThrow(
      BadUserInputError,
    );
    expect(() => assertAmountsFitEngineDecimal(text)).toThrow(
      new RegExp(
        `amount ${literal.replace(/\./g, "\\.")} has more than 28 significant digits`,
      ),
    );
  });

  it.each([
    ["28 significant digits", "99999999999999999999999999.99"],
    ["an ordinary amount", "10.00"],
    ["a comma-grouped amount", "1,234,567.89"],
    ["a negative amount", "-10 USD"],
  ])("accepts %s", (_name, literal) => {
    const amount = literal.endsWith("USD") ? literal : `${literal} USD`;
    expect(() =>
      assertAmountsFitEngineDecimal(
        `2021-01-02 * "x"\n  Assets:Cash  ${amount}\n  Equity:Initial\n`,
      ),
    ).not.toThrow();
  });

  it("accepts long digit strings in narrations, meta and comments", () => {
    expect(() =>
      assertAmountsFitEngineDecimal(
        [
          '2021-01-02 * "Invoice 99999999999999999999999999999999"',
          "  Assets:Cash 10 USD",
          '  ref: "99999999999999999999999999999999 USD"',
          "; 99999999999999999999999999999999 USD",
          "  Equity:Initial",
        ].join("\n"),
      ),
    ).not.toThrow();
  });

  it("skips binary callers rather than reading bytes as amounts", () => {
    expect(() =>
      assertAmountsFitEngineDecimal("binary\0 99999999999999999999999999999 USD"),
    ).not.toThrow();
  });
});

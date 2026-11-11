import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { LedgerProviderContext } from "@/common/providers/ledger-provider/context";
import { formatSourceDecimal } from "@/common/lib/format/format-number";
import { LedgerAmount } from "../ledger-amount";

/**
 * Accounts, Statistics, the account period tables, Journal postings and Entry
 * Context printed the ledger's raw decimal, so a German reader saw Savings as
 * `10.500,00 USD` on Overview and `10500.00 USD` on Accounts — a different
 * number where `.` groups thousands (w2/119).
 */
vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");

async function shown(
  number: string | number,
  currency: string,
  { language = "en", renderCommas = true } = {},
) {
  const localization = createLocalization();
  await localization.changeLanguage(language);
  const ledger = {
    ledgerData: { options: { renderCommas } },
  } as unknown as React.ContextType<typeof LedgerProviderContext>;
  const { container } = render(
    <LocalizationProvider localization={localization}>
      <LedgerProviderContext.Provider value={ledger}>
        <LedgerAmount number={number} currency={currency} />
      </LedgerProviderContext.Provider>
    </LocalizationProvider>,
  );
  const amount = container.querySelector("bdi")!;
  expect(amount).toHaveAttribute("dir", "ltr");
  return amount.textContent;
}

describe("LedgerAmount", () => {
  it("writes 10500.00 USD as German readers read it", async () => {
    expect(await shown("10500.00", "USD", { language: "de" })).toBe(
      "10.500,00 USD",
    );
  });

  it("groups in English when render_commas is on", async () => {
    expect(await shown("10500.00", "USD")).toBe("10,500.00 USD");
  });

  it("keeps the ledger's own decimal when render_commas is off", async () => {
    expect(
      await shown("10500.00", "USD", { language: "de", renderCommas: false }),
    ).toBe("10500.00 USD");
  });

  it("keeps every source digit, never rounding to the currency's minor units", async () => {
    expect(await shown("0.0040", "USD", { language: "de" })).toBe("0,0040 USD");
    expect(await shown("1234567.891234", "USD")).toBe("1,234,567.891234 USD");
    expect(await shown("4.00995", "ETH")).toBe("4.00995 ETH");
  });

  it("does not round 2^53 + 1", async () => {
    expect(await shown("9007199254740993", "SHARE")).toBe(
      "9,007,199,254,740,993 SHARE",
    );
    expect(await shown("-9007199254740993.00", "USD", { language: "de" })).toBe(
      "-9.007.199.254.740.993,00 USD",
    );
  });

  it("formats a chart's double and leaves a non-decimal as it came", async () => {
    expect(await shown(-4092.5, "USD")).toBe("-4,092.5 USD");
    expect(await shown("N/A", "USD")).toBe("N/A USD");
  });
});

describe("formatSourceDecimal", () => {
  it.each([
    ["10500.00", "en", "10,500.00"],
    ["10500.00", "de", "10.500,00"],
    ["10500.00", "fr", "10\u202f500,00"],
    ["-0.5", "de", "-0,5"],
    ["150", "de", "150"],
  ])("writes %s in %s as %j", (value, locale, expected) => {
    expect(formatSourceDecimal(value, true, locale)).toBe(expected);
  });
});

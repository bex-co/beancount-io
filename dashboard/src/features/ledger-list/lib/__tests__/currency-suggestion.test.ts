import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  currencyToSave,
  isSupportedCurrency,
  suggestCurrency,
} from "../currency-suggestion";
import currencies from "../setup-currencies.json";
import timeZones from "../time-zone-regions.json";

describe("suggestCurrency (ADR026)", () => {
  it("prefers the saved preference over region and time zone, with no candidate", () => {
    expect(
      suggestCurrency({
        saved: "CHF",
        locale: "en-US",
        timeZone: "Asia/Shanghai",
      }),
    ).toEqual({ currency: "CHF", source: "saved" });
  });

  it("ignores a saved code no ledger can take", () => {
    expect(suggestCurrency({ saved: "XYZ", locale: "de-DE" })).toEqual({
      currency: "EUR",
      source: "region",
    });
  });

  it("takes the region subtag, never the language", () => {
    expect(suggestCurrency({ locale: "en-GB" }).currency).toBe("GBP");
    expect(suggestCurrency({ locale: "fr-FR" }).currency).toBe("EUR");
    expect(suggestCurrency({ locale: "ja-JP" }).currency).toBe("JPY");
    expect(suggestCurrency({ locale: "zh-Hant-TW" }).currency).toBe("TWD");
    expect(suggestCurrency({ locale: "de" })).toEqual({
      currency: "USD",
      source: "fallback",
    });
    expect(suggestCurrency({})).toEqual({
      currency: "USD",
      source: "fallback",
    });
  });

  it("keeps the region preselected and offers a conflicting time zone's currency", () => {
    // The common case: an en-US system locale outside the United States.
    expect(
      suggestCurrency({ locale: "en-US", timeZone: "Asia/Shanghai" }),
    ).toEqual({ currency: "USD", source: "region", timeZoneCandidate: "CNY" });
    // An agreeing time zone adds nothing.
    expect(
      suggestCurrency({ locale: "en-US", timeZone: "America/Chicago" }),
    ).toEqual({ currency: "USD", source: "region" });
  });

  it("never lets a time zone alone select a currency", () => {
    expect(
      suggestCurrency({ locale: "en", timeZone: "Europe/Berlin" }),
    ).toEqual({
      currency: "USD",
      source: "fallback",
      timeZoneCandidate: "EUR",
    });
    // A multi-currency or currency-less country has no row: no candidate.
    expect(
      suggestCurrency({ locale: "en", timeZone: "America/Panama" }),
    ).toEqual({ currency: "USD", source: "fallback" });
  });

  it("reads the legacy zone names some browsers still report", () => {
    expect(
      suggestCurrency({ locale: "en", timeZone: "Asia/Calcutta" })
        .timeZoneCandidate,
    ).toBe("INR");
  });
});

describe("currencyToSave (ADR026 write rule)", () => {
  it("saves a changed suggestion", () => {
    expect(
      currencyToSave({ chosen: "EUR", suggested: "USD", saved: "USD" }),
    ).toBe("EUR");
  });
  it("seeds an unchanged suggestion only when nothing is stored", () => {
    expect(
      currencyToSave({ chosen: "USD", suggested: "USD", saved: null }),
    ).toBe("USD");
    expect(
      currencyToSave({ chosen: "GBP", suggested: "GBP", saved: "EUR" }),
    ).toBeUndefined();
  });
  it("writes nothing when the choice is already the preference", () => {
    expect(
      currencyToSave({ chosen: "CHF", suggested: "CHF", saved: "CHF" }),
    ).toBeUndefined();
  });
});

describe("generated tables", () => {
  const canonical = resolve(
    __dirname,
    "../../../../../../backend-cluster/backend-v2/src/features/ledger/setup/currencies.json",
  );

  it.skipIf(!existsSync(canonical))(
    "match the canonical setup currencies",
    () => {
      expect(currencies).toEqual(JSON.parse(readFileSync(canonical, "utf8")));
    },
  );

  it("maps zones only to regions the currency table can use", () => {
    expect(isSupportedCurrency("USD")).toBe(true);
    for (const region of Object.values(timeZones.zoneRegion)) {
      expect(region).toMatch(/^[A-Z]{2}$/);
    }
    expect(timeZones.zoneRegion["America/New_York"]).toBe("US");
  });
});

import { currencyToSave, suggestCurrency } from "../currency-suggestion";
import timeZones from "../time-zone-regions.json";

describe("suggestCurrency (ADR026)", () => {
  it("prefers the saved preference, with no competing candidate", () => {
    expect(
      suggestCurrency({
        saved: "CHF",
        nativeCurrency: "USD",
        region: "US",
        timeZone: "Asia/Shanghai",
      }),
    ).toEqual({ currency: "CHF", source: "saved" });
  });

  it("ignores a saved code no ledger can take", () => {
    expect(suggestCurrency({ saved: "XYZ", region: "DE" })).toEqual({
      currency: "EUR",
      source: "region",
    });
  });

  it("takes the OS currency before the region", () => {
    expect(suggestCurrency({ nativeCurrency: "JPY", region: "US" })).toEqual({
      currency: "JPY",
      source: "native",
    });
    // An unsupported native hint falls through to the region.
    expect(suggestCurrency({ nativeCurrency: "XXX", region: "GB" })).toEqual({
      currency: "GBP",
      source: "region",
    });
  });

  it("falls back to USD without a region, never from language", () => {
    expect(suggestCurrency({})).toEqual({
      currency: "USD",
      source: "fallback",
    });
    expect(suggestCurrency({ region: "XX" }).source).toBe("fallback");
  });

  it("offers a conflicting time zone's currency beside the preselection", () => {
    expect(
      suggestCurrency({ region: "US", timeZone: "Asia/Shanghai" }),
    ).toEqual({ currency: "USD", source: "region", timeZoneCandidate: "CNY" });
    expect(suggestCurrency({ timeZone: "Europe/Berlin" })).toEqual({
      currency: "USD",
      source: "fallback",
      timeZoneCandidate: "EUR",
    });
    // An agreeing or currency-less zone adds nothing.
    expect(
      suggestCurrency({ region: "US", timeZone: "America/Chicago" })
        .timeZoneCandidate,
    ).toBe(undefined);
    expect(
      suggestCurrency({ timeZone: "America/Panama" }).timeZoneCandidate,
    ).toBe(undefined);
  });

  it("maps every zone to a two-letter region", () => {
    for (const region of Object.values(timeZones.zoneRegion)) {
      expect(/^[A-Z]{2}$/.test(region)).toBe(true);
    }
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
    ).toBe(undefined);
    expect(
      currencyToSave({ chosen: "CHF", suggested: "CHF", saved: "CHF" }),
    ).toBe(undefined);
  });
});

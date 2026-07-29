import { matchBrand, resolveBrandDomain, buildLogoUrl } from "../index";

describe("brand-matcher", () => {
  describe("matchBrand", () => {
    it("matches exact, known brands", () => {
      expect(matchBrand("starbucks")).toBe("starbucks.com");
      expect(matchBrand("netflix")).toBe("netflix.com");
    });

    it("matches a brand embedded in a transaction string", () => {
      expect(matchBrand("STARBUCKS #1234")).toBe("starbucks.com");
      expect(matchBrand("AMAZON.COM*AB12345")).toBe("amazon.com");
      expect(matchBrand("Spotify USA")).toBe("spotify.com");
    });

    it("is case-insensitive", () => {
      expect(matchBrand("STARBUCKS")).toBe("starbucks.com");
      expect(matchBrand("McDonald's")).toBe("mcdonalds.com");
    });

    it("prefers the longest (most specific) key", () => {
      expect(matchBrand("Uber Eats")).toBe("ubereats.com");
      expect(matchBrand("Uber")).toBe("uber.com");
      expect(matchBrand("Amazon Prime")).toBe("amazon.com");
    });

    it("respects word boundaries (no false positives)", () => {
      expect(matchBrand("gapping expenses")).toBe(null);
      expect(matchBrand("nbp energy corp")).toBe(null);
    });

    it("returns null for unrecognised or empty input", () => {
      expect(matchBrand("Bob's Hardware Store")).toBe(null);
      expect(matchBrand("")).toBe(null);
    });
  });

  describe("resolveBrandDomain", () => {
    it("matches the payee first", () => {
      expect(
        resolveBrandDomain("Starbucks", [
          "Expenses:Food:Coffee",
          "Assets:Bank:Checking",
        ]),
      ).toBe("starbucks.com");
    });

    it("matches the target account when there is no payee", () => {
      expect(
        resolveBrandDomain(undefined, [
          "Expenses:Shopping:Amazon",
          "Assets:Bank:Checking",
        ]),
      ).toBe("amazon.com");
    });

    it("prefers the categorization (target) account over the funding side", () => {
      expect(
        resolveBrandDomain(undefined, [
          "Liabilities:CreditCard:Amex",
          "Expenses:Subscriptions:Netflix",
        ]),
      ).toBe("netflix.com");
    });

    it("falls back to the funding account when the target is generic", () => {
      expect(
        resolveBrandDomain(undefined, [
          "Expenses:Food:Coffee",
          "Liabilities:CreditCard:Amex",
        ]),
      ).toBe("americanexpress.com");
    });

    it("falls through from an unrecognised payee to the account", () => {
      expect(
        resolveBrandDomain("Corner Cafe", ["Expenses:Shopping:Amazon"]),
      ).toBe("amazon.com");
    });

    it("returns null when nothing is recognised", () => {
      expect(
        resolveBrandDomain(undefined, [
          "Expenses:Food:Coffee",
          "Assets:Bank:Checking",
        ]),
      ).toBe(null);
      expect(resolveBrandDomain(undefined, [])).toBe(null);
      expect(resolveBrandDomain("", [])).toBe(null);
    });
  });

  describe("buildLogoUrl", () => {
    it("builds a proxied logo url", () => {
      expect(buildLogoUrl("netflix.com", "https://ogi.example/api/logo")).toBe(
        "https://ogi.example/api/logo?domain=netflix.com",
      );
    });

    it("returns null without a base url or domain", () => {
      expect(buildLogoUrl("netflix.com", "")).toBe(null);
      expect(buildLogoUrl("", "https://ogi.example/api/logo")).toBe(null);
    });
  });
});

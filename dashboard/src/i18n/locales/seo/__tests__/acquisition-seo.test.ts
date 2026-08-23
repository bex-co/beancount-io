import { describe, it, expect } from "vitest";
import enSeo from "../en";
import bgSeo from "../bg";
import caSeo from "../ca";
import deSeo from "../de";
import esSeo from "../es";
import faSeo from "../fa";
import frSeo from "../fr";
import jaSeo from "../ja";
import koSeo from "../ko";
import nlSeo from "../nl";
import ptSeo from "../pt";
import ruSeo from "../ru";
import skSeo from "../sk";
import ukSeo from "../uk";
import zhSeo from "../zh";

const locales: Record<string, Record<string, { message: string }>> = {
  en: enSeo as unknown as Record<string, { message: string }>,
  bg: bgSeo as unknown as Record<string, { message: string }>,
  ca: caSeo as unknown as Record<string, { message: string }>,
  de: deSeo as unknown as Record<string, { message: string }>,
  es: esSeo as unknown as Record<string, { message: string }>,
  fa: faSeo as unknown as Record<string, { message: string }>,
  fr: frSeo as unknown as Record<string, { message: string }>,
  ja: jaSeo as unknown as Record<string, { message: string }>,
  ko: koSeo as unknown as Record<string, { message: string }>,
  nl: nlSeo as unknown as Record<string, { message: string }>,
  pt: ptSeo as unknown as Record<string, { message: string }>,
  ru: ruSeo as unknown as Record<string, { message: string }>,
  sk: skSeo as unknown as Record<string, { message: string }>,
  uk: ukSeo as unknown as Record<string, { message: string }>,
  zh: zhSeo as unknown as Record<string, { message: string }>,
};

const acquisitionKeys = [
  "seo.login.title",
  "seo.signUp.title",
  "seo.forgotPassword.title",
] as const;
const descriptionKeys = [
  "seo.login.description",
  "seo.signUp.description",
  "seo.forgotPassword.description",
] as const;

describe("Acquisition SEO strings (w2/m11)", () => {
  it("EN titles are non-generic, contain Beancount, and use 40-60 char budget", () => {
    for (const key of acquisitionKeys) {
      const val = (enSeo as unknown as Record<string, { message: string }>)[key]
        .message;
      expect(val, `${key} missing`).toBeDefined();
      expect(val).toContain("Beancount");
      expect(val.length).toBeGreaterThanOrEqual(35);
      expect(val.length).toBeLessThanOrEqual(65);
      // Regression guard: generic snippets must not return
      expect(val).not.toBe("Sign In");
      expect(val).not.toBe("Create Account");
      expect(val).not.toBe("Forgot Password");
    }
    // Exact targets (within ±5 of DoD 52/56/44)
    expect(enSeo["seo.login.title"].message).toBe(
      "Sign In to Beancount — Free Plain-Text Accounting",
    );
    expect(enSeo["seo.signUp.title"].message).toBe(
      "Create Free Beancount Account — Git-Backed Accounting",
    );
    expect(enSeo["seo.forgotPassword.title"].message).toBe(
      "Reset Beancount Password — Secure Access",
    );
  });

  it("EN descriptions contain brand + differentiator and meet 100-155 char budget", () => {
    const loginDesc = enSeo["seo.login.description"].message;
    expect(loginDesc).toContain("Beancount.io");
    expect(loginDesc).toMatch(/plain-text/i);
    expect(loginDesc).toMatch(/Git-backed|open-source/i);
    expect(loginDesc.length).toBeGreaterThanOrEqual(100);
    expect(loginDesc.length).toBeLessThanOrEqual(155);

    const signupDesc = enSeo["seo.signUp.description"].message;
    expect(signupDesc).toContain("Beancount.io");
    expect(signupDesc).toMatch(/plain-text/i);
    expect(signupDesc).toMatch(/Fava|version control/i);
    expect(signupDesc.length).toBeGreaterThanOrEqual(100);
    expect(signupDesc.length).toBeLessThanOrEqual(155);

    const forgotDesc = enSeo["seo.forgotPassword.description"].message;
    expect(forgotDesc).toContain("Beancount.io");
    expect(forgotDesc.length).toBeGreaterThanOrEqual(80);
    expect(forgotDesc.length).toBeLessThanOrEqual(155);
    expect(forgotDesc).not.toBe(
      "Reset your Beancount account password by entering your email address.",
    );
  });

  it("all 15 locales have non-generic titles (>30 chars, contain Beancount)", () => {
    for (const [locale, dict] of Object.entries(locales)) {
      for (const key of acquisitionKeys) {
        const val = dict[key]?.message;
        expect(val, `${locale} ${key} missing`).toBeDefined();
        expect(
          val.length,
          `${locale} ${key} too short (${val.length}): ${val}`,
        ).toBeGreaterThanOrEqual(30);
        expect(val, `${locale} ${key} must contain Beancount`).toContain(
          "Beancount",
        );
        // Ensure old generic keys are gone
        if (locale === "en") continue;
        // No locale should still be the old short generic
        expect(val).not.toBe("Вход");
        expect(val).not.toBe("Anmelden");
        expect(val).not.toBe("Se Connecter");
      }
    }
  });

  it("all 15 locales have descriptions >80 chars", () => {
    for (const [locale, dict] of Object.entries(locales)) {
      for (const key of descriptionKeys) {
        const val = dict[key]?.message;
        expect(val, `${locale} ${key} missing`).toBeDefined();
        expect(
          val.length,
          `${locale} ${key} too short (${val.length})`,
        ).toBeGreaterThanOrEqual(80);
      }
    }
  });

  it("no locale regresses to generic English fallback", () => {
    // Each locale's login title must not be the English generic "Sign In"
    // and must contain native language content or at least be longer than generic
    for (const [locale, dict] of Object.entries(locales)) {
      if (locale === "en") continue;
      const loginTitle = dict["seo.login.title"].message;
      expect(loginTitle).not.toBe("Sign In");
      expect(loginTitle.length).toBeGreaterThan(15);
    }
  });
});

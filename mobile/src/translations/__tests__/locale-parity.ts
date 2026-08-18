/**
 * Source-level machinery behind the translation-integrity suite.
 *
 * Locale files are declared as `{ ...en, <overrides> }`, so every key exists in
 * every locale by construction and a runtime lookup can never reveal a missing
 * translation — an untranslated string just serves English. The meaningful
 * check is at the source level: a key must be explicitly **declared** in each
 * locale file, not merely inherited from the spread.
 *
 * So the two halves below answer different questions and neither replaces the
 * other: the source text says which keys a locale *declares*, and the imported
 * module says what those declarations *are* (values, including the nested
 * `{ one, other }` plural objects, which no regex should be asked to read).
 *
 * The locale list is **derived from the directory**, not written down. It used
 * to be maintained in three places — the per-feature suites plus
 * `SUPPORTED_LOCALES` in `../index.ts` — which meant adding a language and
 * forgetting one of them left a suite silently checking twelve locales while
 * the app shipped thirteen.
 *
 * Not named `*.test.ts`, so the runner treats it as a helper rather than a
 * suite of its own. Imports are relative because the unit-test runner does not
 * resolve the `@/` alias for value modules.
 */
import * as fs from "fs";
import * as path from "path";
import { en } from "../en";
import { bg } from "../bg";
import { ca } from "../ca";
import { de } from "../de";
import { es } from "../es";
import { fa } from "../fa";
import { fr } from "../fr";
import { nl } from "../nl";
import { pt } from "../pt";
import { ru } from "../ru";
import { sk } from "../sk";
import { uk } from "../uk";
import { zh } from "../zh";

const TRANSLATIONS_DIR = path.join(__dirname, "..");

/** A translated value: a string, or an i18n-js plural form. */
export type TranslationValue = string | Record<string, string>;

/**
 * The imported locale modules, keyed by code. Hand-kept — bundled test code
 * cannot import a path it computes — so `localeIntegrity` asserts this map
 * covers exactly the locales the directory holds. A thirteenth language added
 * without a line here fails that assertion rather than going unchecked.
 */
export const localeModules: Record<string, Record<string, TranslationValue>> = {
  bg,
  ca,
  de,
  es,
  fa,
  fr,
  nl,
  pt,
  ru,
  sk,
  uk,
  zh,
};

/** The English base every other locale is measured against. */
export const baseKeys = (): string[] => Object.keys(en);

/**
 * Every locale that overrides the English base — i.e. every `<code>.ts` in the
 * translations directory except the base itself and the barrel.
 */
export const translationLocales = (): string[] =>
  fs
    .readdirSync(TRANSLATIONS_DIR)
    .filter((entry) => entry.endsWith(".ts"))
    .map((entry) => entry.slice(0, -".ts".length))
    .filter((locale) => locale !== "en" && locale !== "index")
    .sort();

export const localeSource = (locale: string): string =>
  fs.readFileSync(path.join(TRANSLATIONS_DIR, `${locale}.ts`), "utf8");

/**
 * Blank out the contents of string literals and comments, preserving every
 * newline and every character position.
 *
 * Without this, a key-shaped line inside a multi-line value ("  note: keep it")
 * counts as a declared key. Positions are preserved so the caller can still
 * anchor on the two-space top-level indent.
 */
export const blankLiterals = (source: string): string => {
  const out: string[] = [];
  let i = 0;
  const keep = (char: string) => out.push(char === "\n" ? "\n" : " ");

  while (i < source.length) {
    const char = source[i];
    const next = source[i + 1];

    if (char === "/" && next === "/") {
      out.push("  ");
      i += 2;
      while (i < source.length && source[i] !== "\n") keep(source[i++]);
      continue;
    }
    if (char === "/" && next === "*") {
      out.push("  ");
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/"))
        keep(source[i++]);
      out.push("  ");
      i += 2;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      const openedAt = i;
      i += 1;
      while (i < source.length && source[i] !== char) {
        i += source[i] === "\\" ? 2 : 1;
      }
      const closedAt = Math.min(i, source.length - 1);
      i += 1;

      // A quoted key — `"01": "JAN"` — is structure, not content, so its text
      // survives; anything else is a value and gets blanked.
      let after = i;
      while (after < source.length && /\s/.test(source[after])) after += 1;
      const literal = source.slice(openedAt, closedAt + 1);
      if (source[after] === ":") {
        out.push(literal);
      } else {
        out.push(char);
        for (const inner of literal.slice(1, -1)) keep(inner);
        out.push(char);
      }
      continue;
    }
    out.push(char);
    i += 1;
  }

  return out.join("");
};

/**
 * The top-level keys a locale file declares, in source order, duplicates
 * included — the caller decides whether a repeat is an error.
 *
 * Anchored on exactly two spaces of indent: that is the object's own level, so
 * the nested `one` / `other` of a plural form (four spaces) does not count as a
 * key of its own. Quoted keys count — the month abbreviations are declared as
 * `"01"` through `"12"`, and reading only identifiers silently lost twelve
 * keys per locale.
 */
export const declaredKeys = (source: string): string[] =>
  [
    ...blankLiterals(source).matchAll(
      /^ {2}(?:([A-Za-z0-9_$]+)|"([^"\n]*)")\s*:/gm,
    ),
  ].map((match) => match[1] ?? match[2]);

/** True when the file still inherits the English base as a runtime fallback. */
export const spreadsBase = (source: string): boolean =>
  /^\s*\.\.\.en,?$/m.test(blankLiterals(source));

export interface LocaleKeyReport {
  /** Keys of the English base this locale does not declare. */
  missing: string[];
  /** Keys this locale declares that the English base does not have. */
  extra: string[];
  /** Keys this locale declares more than once — the later one silently wins. */
  duplicated: string[];
}

/**
 * The pure core: compare a locale's declared keys against the base's. Takes
 * lists rather than a locale name so a test can hand it fixtures — a checker
 * that quietly matches nothing passes just as green as one that works, and
 * only fixtures tell the two apart.
 */
export const keyReportFor = (
  declared: string[],
  base: string[],
): LocaleKeyReport => {
  const seen = new Set(declared);
  const inBase = new Set(base);

  return {
    missing: base.filter((key) => !seen.has(key)),
    extra: declared.filter(
      (key, index) => !inBase.has(key) && declared.indexOf(key) === index,
    ),
    duplicated: declared.filter(
      (key, index) => declared.indexOf(key) !== index,
    ),
  };
};

const scans = new Map<string, { source: string; declared: string[] }>();

/**
 * One read and one scan per locale, shared by every rule that needs them.
 * Each rule used to re-read and re-parse the same 330-key file, which was the
 * whole cost of the suite. Files do not change mid-run.
 */
const scan = (locale: string): { source: string; declared: string[] } => {
  const cached = scans.get(locale);
  if (cached) return cached;
  const source = localeSource(locale);
  const fresh = { source, declared: declaredKeys(source) };
  scans.set(locale, fresh);
  return fresh;
};

export const keyReport = (locale: string): LocaleKeyReport =>
  keyReportFor(scan(locale).declared, baseKeys());

/** The `{{token}}` names inside one string, deduplicated and sorted. */
export const interpolationTokens = (text: string): string[] => {
  const found = [...text.matchAll(/{{\s*([A-Za-z0-9_]+)\s*}}/g)].map(
    (match) => match[1],
  );
  return [...new Set(found)].sort();
};

/**
 * A value as branches: a plain string is one unnamed branch, a plural form is
 * one branch per category.
 *
 * Branches are compared individually because i18n-js renders exactly one of
 * them — a `{{count}}` dropped from `one` while `other` keeps it produces a
 * count-less string for precisely the case the plural exists to handle.
 */
export const valueBranches = (
  value: TranslationValue,
): Array<{ name: string; text: string }> =>
  typeof value === "string"
    ? [{ name: "", text: value }]
    : Object.keys(value ?? {}).map((name) => ({ name, text: value[name] }));

/** Every token a value uses, across all its branches. */
export const allTokens = (value: TranslationValue): string[] =>
  [
    ...new Set(
      valueBranches(value).flatMap((branch) =>
        interpolationTokens(branch.text),
      ),
    ),
  ].sort();

export interface TokenMismatch {
  /** The key, suffixed with the plural branch when the value has branches. */
  key: string;
  /** Tokens the English value has that this branch dropped. */
  dropped: string[];
  /** Tokens this branch invented — they render literally to the user. */
  invented: string[];
}

/**
 * Token parity for the keys a locale actually declares. Inherited keys are
 * English by definition and cannot mismatch, so they are skipped rather than
 * reported — that is what lets this run green while the gaps are still open.
 *
 * The English value's tokens are taken as a whole, but each branch of the
 * translation is checked against that whole. A locale may add plural
 * categories English does not have — Russian and Ukrainian need `few` and
 * `many` — and every one of them still has to interpolate the count.
 */
export const tokenMismatchesFor = (
  declared: string[],
  translations: Record<string, TranslationValue>,
  base: Record<string, TranslationValue>,
): TokenMismatch[] => {
  const isDeclared = new Set(declared);
  const mismatches: TokenMismatch[] = [];

  for (const key of Object.keys(base)) {
    if (!isDeclared.has(key)) continue;
    const expected = allTokens(base[key]);

    for (const branch of valueBranches(translations[key])) {
      const actual = interpolationTokens(branch.text);
      const dropped = expected.filter((token) => !actual.includes(token));
      const invented = actual.filter((token) => !expected.includes(token));
      if (dropped.length > 0 || invented.length > 0) {
        mismatches.push({
          key: branch.name ? `${key}.${branch.name}` : key,
          dropped,
          invented,
        });
      }
    }
  }

  return mismatches;
};

/**
 * Keys a locale declares with the byte-identical English value.
 *
 * This is the gap key parity cannot see: the key is present, so `missing` is
 * empty, but the user still reads English. It is also the likeliest way a
 * hurried pass "completes" a locale. Compared after trimming, because trailing
 * whitespace is a formatting difference, not a translation.
 */
export const englishCopiesFor = (
  declared: string[],
  translations: Record<string, TranslationValue>,
  base: Record<string, TranslationValue>,
): string[] => {
  const flatten = (value: TranslationValue): string =>
    valueBranches(value)
      .map((branch) => `${branch.name}\u0000${(branch.text ?? "").trim()}`)
      .join("\u0001");

  return declared.filter(
    (key) => key in base && flatten(translations[key]) === flatten(base[key]),
  );
};

export const englishCopies = (locale: string): string[] =>
  englishCopiesFor(
    scan(locale).declared,
    localeModules[locale],
    en as Record<string, TranslationValue>,
  );

export const tokenMismatches = (locale: string): TokenMismatch[] =>
  tokenMismatchesFor(
    scan(locale).declared,
    localeModules[locale],
    en as Record<string, TranslationValue>,
  );

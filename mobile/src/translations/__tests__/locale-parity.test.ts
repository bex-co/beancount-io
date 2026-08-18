/**
 * Tests for the integrity checker itself, against synthetic fixtures rather
 * than the real locale files.
 *
 * The real files cannot prove this: with the tree correct, an extractor that
 * returns `[]` for everything looks exactly as green as one that works. Every
 * case below therefore breaks something on purpose and asserts the checker
 * says so — and names what.
 */
import {
  allTokens,
  blankLiterals,
  declaredKeys,
  englishCopiesFor,
  interpolationTokens,
  keyReportFor,
  spreadsBase,
  tokenMismatchesFor,
  valueBranches,
} from "./locale-parity";
import {
  allowedEnglishCopies,
  SAME_AS_ENGLISH,
  UNTRANSLATABLE,
} from "./known-gaps";
import { en } from "../en";

const localeFile = (body: string) => `import { en } from "./en";

export const xx: typeof en = {
  ...en,
${body}};
`;

describe("declaredKeys", () => {
  it("reads plain keys at the object's own indent", () => {
    expect(
      declaredKeys(localeFile(`  home: "Zuhause",\n  files: "Dateien",\n`)),
    ).toEqual(["home", "files"]);
  });

  it("reads quoted keys — the month abbreviations are declared that way", () => {
    expect(
      declaredKeys(localeFile(`  "01": "JAN",\n  "12": "DEZ",\n`)),
    ).toEqual(["01", "12"]);
  });

  it("does not count a key-shaped line inside a multi-line value", () => {
    // The hazard the literal-blanking exists for: a template literal whose
    // continuation sits at the object's own indent, so a line-anchored regex
    // over the raw source reads "beispiel" as a declared key. Prettier keeps
    // wrapped quoted strings at four spaces, but nothing enforces Prettier on
    // this package in CI, and a hand-edited file is exactly where a gate has
    // to hold.
    const body =
      '  hint: `Schreiben Sie das Format genau so:\n  beispiel: Wert`,\n  save: "Speichern",\n';
    expect(declaredKeys(localeFile(body))).toEqual(["hint", "save"]);
  });

  it("does not read a quoted-key-shaped line inside a multi-line value", () => {
    // Same hazard on the quoted-key path, which is how the months are declared.
    const body =
      '  hint: `Die Monate stehen so drin:\n  "01": JAN`,\n  save: "Speichern",\n';
    expect(declaredKeys(localeFile(body))).toEqual(["hint", "save"]);
  });

  it("does not count a key-shaped line inside a comment", () => {
    const body = `  // note: this group is the tab bar\n  home: "Zuhause",\n`;
    expect(declaredKeys(localeFile(body))).toEqual(["home"]);
  });

  it("does not count the branches of a plural form as keys", () => {
    const body = `  errors: {\n    one: "{{count}} Fehler",\n    other: "{{count}} Fehler",\n  },\n`;
    expect(declaredKeys(localeFile(body))).toEqual(["errors"]);
  });

  it("reads a Prettier-wrapped value as one declaration", () => {
    const body = `  long:\n    "Ein sehr langer Satz, den Prettier auf die nächste Zeile umbricht.",\n  next: "Weiter",\n`;
    expect(declaredKeys(localeFile(body))).toEqual(["long", "next"]);
  });

  it("keeps line positions intact while blanking literals", () => {
    const source = localeFile(`  home: "Zuhause",\n`);
    expect(blankLiterals(source).split("\n").length).toBe(
      source.split("\n").length,
    );
  });
});

describe("spreadsBase", () => {
  it("sees the English base spread", () => {
    expect(spreadsBase(localeFile(`  home: "Zuhause",\n`))).toBe(true);
  });

  it("fails a file that dropped the spread", () => {
    const source = `export const xx = {\n  home: "Zuhause",\n};\n`;
    expect(spreadsBase(source)).toBe(false);
  });

  it("is not fooled by the spread appearing inside a string", () => {
    const source = `export const xx = {\n  hint: "schreiben Sie ...en, um zu erben",\n};\n`;
    expect(spreadsBase(source)).toBe(false);
  });
});

describe("keyReportFor", () => {
  const base = ["home", "files", "save"];

  it("reports nothing for a complete locale", () => {
    const report = keyReportFor(["home", "files", "save"], base);
    expect(report.missing).toEqual([]);
    expect(report.extra).toEqual([]);
    expect(report.duplicated).toEqual([]);
  });

  it("names the key a locale failed to declare", () => {
    expect(keyReportFor(["home", "save"], base).missing).toEqual(["files"]);
  });

  it("names a key the English base does not have", () => {
    expect(keyReportFor(["home", "files", "save", "hme"], base).extra).toEqual([
      "hme",
    ]);
  });

  it("names a key declared twice — the later one silently wins", () => {
    expect(
      keyReportFor(["home", "files", "save", "home"], base).duplicated,
    ).toEqual(["home"]);
  });

  it("reports an unknown key once even when it is repeated", () => {
    expect(keyReportFor(["hme", "hme"], base).extra).toEqual(["hme"]);
  });

  it("reports missing keys in the base's order, not the locale's", () => {
    expect(keyReportFor([], base).missing).toEqual(["home", "files", "save"]);
  });
});

describe("interpolation tokens", () => {
  it("finds the tokens in a string", () => {
    expect(interpolationTokens("{{name}} um {{date}}")).toEqual([
      "date",
      "name",
    ]);
  });

  it("reads a plural form as one unnamed branch per category", () => {
    expect(valueBranches({ one: "a", other: "b" })).toEqual([
      { name: "one", text: "a" },
      { name: "other", text: "b" },
    ]);
    expect(valueBranches("plain")).toEqual([{ name: "", text: "plain" }]);
  });

  it("takes the union of a plural form's tokens", () => {
    expect(allTokens({ one: "{{count}} Fehler", other: "{{count}}" })).toEqual([
      "count",
    ]);
  });
});

describe("tokenMismatchesFor", () => {
  const base = {
    greeting: "Hi {{name}}",
    errors: { one: "{{count}} error", other: "{{count}} errors" },
  };

  it("passes a faithful translation", () => {
    const translations = {
      greeting: "Hallo {{name}}",
      errors: { one: "{{count}} Fehler", other: "{{count}} Fehler" },
    };
    expect(
      tokenMismatchesFor(["greeting", "errors"], translations, base),
    ).toEqual([]);
  });

  it("catches a dropped token", () => {
    expect(
      tokenMismatchesFor(["greeting"], { greeting: "Hallo" }, base),
    ).toEqual([{ key: "greeting", dropped: ["name"], invented: [] }]);
  });

  it("catches an invented token, which renders literally to the user", () => {
    expect(
      tokenMismatchesFor(
        ["greeting"],
        { greeting: "Hallo {{name}} {{bogus}}" },
        base,
      ),
    ).toEqual([{ key: "greeting", dropped: [], invented: ["bogus"] }]);
  });

  it("catches a token dropped from one plural branch only", () => {
    // The union of branches still has {{count}}, so a whole-value check would
    // pass this — and the user would see "Fehler" with no number for n = 1.
    const translations = {
      errors: { one: "Ein Fehler", other: "{{count}} Fehler" },
    };
    expect(tokenMismatchesFor(["errors"], translations, base)).toEqual([
      { key: "errors.one", dropped: ["count"], invented: [] },
    ]);
  });

  it("allows plural categories English does not have", () => {
    // Russian and Ukrainian need `few` / `many`; each must still interpolate.
    const translations = {
      errors: {
        one: "{{count}} ошибка",
        few: "{{count}} ошибки",
        other: "{{count}} ошибок",
      },
    };
    expect(tokenMismatchesFor(["errors"], translations, base)).toEqual([]);
  });

  it("ignores keys the locale has not declared", () => {
    // Inherited keys are the English string by construction; reporting them
    // would make the suite red for every untranslated key and useless.
    expect(tokenMismatchesFor([], { greeting: "Hi {{name}}" }, base)).toEqual(
      [],
    );
  });

  it("accepts a token repeated or reordered", () => {
    const wide = { sentence: "{{a}} then {{b}}" };
    expect(
      tokenMismatchesFor(
        ["sentence"],
        { sentence: "{{b}} zuerst, dann {{a}} und wieder {{a}}" },
        wide,
      ),
    ).toEqual([]);
  });
});

describe("englishCopiesFor", () => {
  const base = {
    save: "Save",
    home: "Home",
    errors: { one: "{{count}} error", other: "{{count}} errors" },
  };

  it("reports a value copied verbatim from English", () => {
    expect(
      englishCopiesFor(
        ["save", "home"],
        { save: "Opslaan", home: "Home" },
        base,
      ),
    ).toEqual(["home"]);
  });

  it("reports nothing when every value is translated", () => {
    expect(
      englishCopiesFor(
        ["save", "home"],
        { save: "Opslaan", home: "Thuis" },
        base,
      ),
    ).toEqual([]);
  });

  it("treats a whitespace-only difference as a copy", () => {
    // Otherwise a trailing space silently launders an untranslated string.
    expect(englishCopiesFor(["save"], { save: "Save  " }, base)).toEqual([
      "save",
    ]);
  });

  it("reports a plural form copied in every branch", () => {
    const same = {
      errors: { one: "{{count}} error", other: "{{count}} errors" },
    };
    expect(englishCopiesFor(["errors"], same, base)).toEqual(["errors"]);
  });

  it("does not report a plural form that differs in one branch", () => {
    const partly = {
      errors: { one: "{{count}} error", other: "{{count}} errores" },
    };
    expect(englishCopiesFor(["errors"], partly, base)).toEqual([]);
  });

  it("ignores keys the locale has not declared", () => {
    expect(englishCopiesFor([], { home: "Home" }, base)).toEqual([]);
  });

  it("ignores a declared key the English base does not have", () => {
    // Whoever owns `extra` is the key-parity rule, not this one.
    expect(englishCopiesFor(["extra"], { extra: "Extra" }, base)).toEqual([]);
  });
});

describe("the exception lists", () => {
  const baseKeySet = new Set(Object.keys(en));

  it("excuses only keys the English base actually has", () => {
    const unknown = [
      ...Object.keys(UNTRANSLATABLE),
      ...Object.entries(SAME_AS_ENGLISH).flatMap(([locale, groups]) =>
        groups.flatMap((group) => group.keys.map((key) => `${locale}.${key}`)),
      ),
    ].filter((entry) => !baseKeySet.has(entry.split(".").pop() ?? ""));
    expect(unknown).toEqual([]);
  });

  it("gives every group a reason", () => {
    const silent = Object.entries(SAME_AS_ENGLISH).flatMap(([locale, groups]) =>
      groups.filter((group) => group.reason.trim() === "").map(() => locale),
    );
    expect(silent).toEqual([]);
  });

  it("lists no key twice within one locale", () => {
    const duplicated = Object.entries(SAME_AS_ENGLISH).flatMap(
      ([locale, groups]) => {
        const keys = groups.flatMap((group) => group.keys);
        return keys
          .filter((key, index) => keys.indexOf(key) !== index)
          .map((key) => `${locale}.${key}`);
      },
    );
    expect(duplicated).toEqual([]);
  });

  it("gives an unknown locale only the globally untranslatable keys", () => {
    // The per-locale half is data, not a hard-coded list: a thirteenth
    // language starts with no exceptions rather than inheriting someone's.
    expect(allowedEnglishCopies("xx")).toEqual(
      Object.keys(UNTRANSLATABLE).sort(),
    );
  });
});

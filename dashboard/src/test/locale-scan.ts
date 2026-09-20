/**
 * Shared scan for a defect this repo has now repaired three times: a
 * translation pass that replaces a leading token and leaves the rest of the
 * message in English. Catalan (w4/m14), Russian (w4/149) and Ukrainian
 * (w4/m24) each shipped with messages like `Запись Context`, `Вocuments` or
 * `Рахунок is required` — text that is a word in neither language.
 *
 * The signal is a message written in the locale's own script that still
 * carries an English word. That only works where the locale's script is not
 * Latin: in `de` or `es` a stray English word is indistinguishable from the
 * target language by script alone, so those catalogs need a different
 * technique and are out of this scan's reach.
 */

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n/config";

/**
 * Locales written in the Latin alphabet, where this technique cannot work at
 * all: a stray English word is indistinguishable from the target language by
 * script. Listed explicitly so that every supported language is accounted for
 * as either scannable or knowingly out of reach.
 */
const LATIN_SCRIPT_LOCALES = [
  "en",
  "es",
  "fr",
  "de",
  "pt",
  "nl",
  "ca",
  "sk",
] as const satisfies readonly SupportedLanguage[];

/**
 * The seven journal filter keys that render a literal one- or two-character
 * flag rather than prose. Shared so the Catalan and Russian sweeps asserting
 * over them cannot drift apart.
 */
export const FLAG_KEYS = [
  "journal.cleared",
  "journal.pending",
  "journal.other",
  "journal.linked",
  "journal.budget",
  "journal.discovered",
  "journal.flagAbbrev",
] as const;

/**
 * The locales this scan can judge, with the script each is written in.
 *
 * `adjacencyIsDamage` says whether Latin touching that script is a defect on
 * its own. In a space-separated script it always is — `Документs` and `Файлs`
 * are words in neither language. Japanese, Korean and Chinese write
 * `Beancountについて` and `Beancount.io에` without a space, so for them only the
 * stray-word check applies. A locale absent from this record cannot be
 * scanned this way at all.
 */
export const SCANNED_LOCALES = {
  bg: { script: /[\u0400-\u04FF]/, adjacencyIsDamage: true },
  ru: { script: /[\u0400-\u04FF]/, adjacencyIsDamage: true },
  uk: { script: /[\u0400-\u04FF]/, adjacencyIsDamage: true },
  fa: { script: /[\u0600-\u06FF]/, adjacencyIsDamage: false },
  ja: { script: /[\u3040-\u30FF\u4E00-\u9FFF]/, adjacencyIsDamage: false },
  ko: { script: /[\uAC00-\uD7AF]/, adjacencyIsDamage: false },
  zh: { script: /[\u4E00-\u9FFF]/, adjacencyIsDamage: false },
} as const satisfies Partial<
  Record<SupportedLanguage, { script: RegExp; adjacencyIsDamage: boolean }>
>;

/**
 * Every supported language is either scannable or explicitly Latin-script.
 * Adding one to `SUPPORTED_LANGUAGES` without classifying it here is a type
 * error rather than a locale that quietly goes unchecked.
 */
export const UNCLASSIFIED_LOCALES = SUPPORTED_LANGUAGES.filter(
  (language) =>
    !(language in SCANNED_LOCALES) &&
    !(LATIN_SCRIPT_LOCALES as readonly string[]).includes(language),
);

export type ScannedLocale = keyof typeof SCANNED_LOCALES;

/**
 * Latin that legitimately survives translation. Each entry is a term a
 * translator is right to leave alone, not a way to silence a finding: brand
 * and product names, Beancount directive and metadata keywords, file formats,
 * units, currency and account-name notation, and literal protocol text.
 */
const ALLOWED_LATIN = [
  // Brands and products
  "Beancount",
  "beancount",
  "Fava",
  "fava",
  "Plaid",
  "Monaco",
  "Git",
  "GitHub",
  "Mac",
  "Windows",
  "Linux",
  "JavaScript",
  "TanStack",
  // Beancount directives and metadata keys
  "pad",
  "option",
  "cash",
  "flow",
  "role",
  "txn",
  // Formats, protocols and units
  "CSV",
  "PDF",
  "OFX",
  "PNG",
  "JPG",
  "JPEG",
  "WebP",
  "ZIP",
  "QIF",
  "JSON",
  "URL",
  "SSH",
  "HTTP",
  "HTTPS",
  "API",
  "CLI",
  "OTP",
  "SEO",
  "IP",
  "AI",
  "MB",
  "KB",
  "GB",
  "UTC",
  // Literal protocol text, e.g. a PEM header quoted in a hint
  "BEGIN",
  "END",
  "PUBLIC",
  "PRIVATE",
  "KEY",
  "OPENSSH",
  // Notation: date patterns, sort order, currency and account names
  "YYYY",
  "MM",
  "DD",
  "HH",
  "A",
  "Z",
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
  "Assets",
  "Liabilities",
  "Income",
  "Expenses",
  "Equity",
  "Bank",
  "Checking",
  "Savings",
  "Food",
  "Groceries",
  "Salary",
  // Keyboard keys named in hints
  "Cmd",
  "Ctrl",
  "Enter",
  "Shift",
  "Alt",
  "Tab",
  "Esc",
  // Lowercase fragments of the above that appear alone
  "io",
  "vs",
  "e",
  "g",
  "i",
  "App",
  "Email",
  "email",
  "Link",
  "Mobile",
  // Product tiers, channels and the query language, used untranslated by
  // policy rather than left behind by a translator.
  "Pro",
  "Premium",
  "Telegram",
  "BQL",
  "Query",
  "Language",
  "SQL",
  "Markdown",
  "Dashboard",
  "tokens",
  // Identifier syntax quoted inside hints: owner/ledger, payee, example.com
  "owner",
  "ledger",
  "payee",
  "title",
  "com",
  "example",
  "insights",
  "pull",
  "request",
  "View",
  "on",
] as const;

const ALLOWED_PATTERN = new RegExp(
  `(?<![A-Za-z0-9_])(?:${ALLOWED_LATIN.join("|")})(?![A-Za-z0-9_])`,
  "g",
);

// A run of Latin letters that is not part of a longer alphanumeric token and
// is not an i18next `{placeholder}`. One letter is enough: the damage often
// leaves a bare plural `s` glued to a translated word ("Документs", "Файлs").
const LATIN_RUN = /(?<![0-9A-Za-z{$])[A-Za-z]+(?![0-9A-Za-z}])/g;

/**
 * The English words left stranded in a message, or an empty array when it is
 * clean. A message with none of the locale's own script is not judged — it may
 * legitimately be a bare symbol, a currency code or a brand name.
 *
 * An allowlisted term earns its exemption only where it stands as its own
 * word. Glued onto the locale's script it is the defect itself, so in a
 * space-separated script the exemption is withheld: `Bank` passes, `БанкBank`
 * does not. Japanese, Korean and Chinese are excluded from that rule because
 * they write `Beancountについて` without a space, where adjacency is ordinary.
 */
export function strayEnglishWords(
  message: string,
  locale: ScannedLocale,
): string[] {
  const { script, adjacencyIsDamage } = SCANNED_LOCALES[locale];
  if (!script.test(message)) return [];
  const withoutAllowed = message.replace(
    ALLOWED_PATTERN,
    (term: string, offset: number) => {
      if (!adjacencyIsDamage) return " ";
      const before = message[offset - 1];
      const after = message[offset + term.length];
      const touchesScript = (char: string | undefined) =>
        char !== undefined && script.test(char);
      return touchesScript(before) || touchesScript(after) ? term : " ";
    },
  );
  return withoutAllowed.match(LATIN_RUN) ?? [];
}

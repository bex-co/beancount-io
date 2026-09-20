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

/**
 * The scripts each non-Latin locale is written in. A locale absent from this
 * map cannot be scanned this way.
 */
export const LOCALE_SCRIPTS: Record<string, RegExp> = {
  bg: /[Ѐ-ӿ]/,
  ru: /[Ѐ-ӿ]/,
  uk: /[Ѐ-ӿ]/,
  fa: /[؀-ۿ]/,
  ja: /[぀-ヿ一-鿿]/,
  ko: /[가-힯]/,
  zh: /[一-鿿]/,
};

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
 */
export function strayEnglishWords(message: string, script: RegExp): string[] {
  if (!script.test(message)) return [];
  const withoutEscapes = message.replace(/\\[nrtu]/g, " ");
  const withoutAllowed = withoutEscapes.replace(ALLOWED_PATTERN, " ");
  return withoutAllowed.match(LATIN_RUN) ?? [];
}

/**
 * Cyrillic, Arabic and CJK all appear here, but only the space-separated
 * scripts can treat adjacency as damage. Japanese, Korean and Chinese write
 * `Beancountについて` and `Beancount.io에` without a space, so a Latin run
 * touching their script is ordinary, not a defect.
 */
export const ADJACENCY_IS_DAMAGE = new Set(["bg", "ru", "uk"]);

const ADJACENT = /[Ѐ-ӿ][A-Za-z]|[A-Za-z][Ѐ-ӿ]/;

/** True when Latin is glued straight onto Cyrillic, which is always damage. */
export function hasGluedLatin(message: string): boolean {
  return ADJACENT.test(message);
}

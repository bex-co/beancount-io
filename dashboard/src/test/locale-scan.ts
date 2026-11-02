/**
 * Shared scan for a defect this repo has now repaired three times: a
 * translation pass that replaces a leading token and leaves the rest of the
 * message in English. Catalan (w4/m14), Russian (w4/149) and Ukrainian
 * (w4/m24) each shipped with messages like `Запись Context`, `Вocuments` or
 * `Рахунок is required` — text that is a word in neither language.
 *
 * Two signals, because one does not reach every locale:
 *
 * - **Script.** A message written in the locale's own script that still
 *   carries an English word. Precise, but only where that script is not
 *   Latin.
 * - **English tail.** A message whose trailing words are still verbatim
 *   English, compared against the same key in `en`. This reaches the
 *   Latin-script locales, where script alone proves nothing.
 */

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n/config";

/**
 * Locales written in the Latin alphabet. The script check cannot judge them,
 * so they are scanned by the English-tail check instead. Listed explicitly so
 * that every supported language is accounted for by one check or the other.
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
 * Locales where a capitalized word in the English tail is evidence on its own,
 * because they capitalize only proper nouns and sentence openings.
 *
 * Derived rather than listed, so it cannot drift from the roster above.
 * English is excluded because it is the comparison basis; German because it
 * capitalizes every noun, which makes `Intelligenter Import` and `Unbekannter
 * Plan` correct German that such a rule would flag.
 */
const TITLE_CASE_MEANS_ENGLISH = new Set<string>(
  LATIN_SCRIPT_LOCALES.filter(
    (language) => language !== "en" && language !== "de",
  ),
);

/** Every locale the English-tail check can judge — everything but English. */
export const EN_COMPARED_LOCALES = SUPPORTED_LANGUAGES.filter(
  (language) => language !== "en",
);

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
  // The stores and devices a store plan is billed and managed on.
  "App Store",
  "Google Play",
  "Stripe",
  "iPhone",
  "iPad",
  "iOS",
  "Android",
  "Monaco",
  "Git",
  "GitHub",
  // Literal repository metadata directory, not the lowercase word "git".
  "\\.git",
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
  // The text encoding's name, as in "UTF-8" (w4/276).
  "UTF",
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
  // Protocol acronyms kept in Latin script, like SSH and HTTP.
  "OIDC",
  "SSO",
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
  // Literal filter syntax quoted in hints: `month`, `payee:"Coffee"`, `#trip`
  "month",
  "Coffee",
  "trip",
  // The CLI command a hint tells the reader to run (`bea login`)
  "bea",
  "login",
  // Literal protocol text, e.g. a PEM header quoted in a hint
  "BEGIN",
  "END",
  "PUBLIC",
  "PRIVATE",
  "KEY",
  "OPENSSH",
  // OpenSSH key types and the command that prints a public key
  "ssh-ed25519",
  "ssh-rsa",
  "cat ~/\\.ssh/id_ed25519\\.pub",
  "PEM",
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
  // Terms these languages have borrowed outright. `Criar token`, `Prejsť na
  // dashboard`, `Copiar link`, `Redefinir layout` and `Filteren op bank` are
  // all correct, and a scan that flags them is unusable.
  "Import",
  "Plan",
  "Updates",
  "Bank",
  "Dashboard",
  "Token",
  "token",
  "Link",
  "link",
  "Layout",
  "layout",
  "Feed",
  "feed",
  "Filter",
  "filter",
  "Commodities",
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

const ALLOWED = new Set<string>(ALLOWED_LATIN);

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

const trimWord = (word: string) =>
  word.replace(/[.,!?:;)]+$/, "").replace(/^[("]+/, "");

/**
 * The trailing words a message still shares verbatim with its English source.
 * Empty when the message is entirely English, since that is a translation not
 * yet started rather than one abandoned halfway.
 */
function sharedEnglishTail(message: string, english: string): string[] {
  const words = message.split(/\s+/);
  const englishWords = english.split(/\s+/);
  let shared = 0;
  while (
    shared < words.length &&
    shared < englishWords.length &&
    words[words.length - 1 - shared] ===
      englishWords[englishWords.length - 1 - shared]
  ) {
    shared++;
  }
  if (shared === 0 || shared === words.length) return [];
  return (
    words
      .slice(words.length - shared)
      .join(" ")
      // A term of two words is only allowed as the phrase.
      .replace(ALLOWED_PATTERN, " ")
      .split(/\s+/)
      .map(trimWord)
      .filter((word) => word && !ALLOWED.has(word))
  );
}

/**
 * The English words a message has left untranslated at its end, or an empty
 * array when it reads as its own language.
 *
 * Two shapes count, and both were chosen by measuring against the shipped
 * catalogs rather than by taste (w4/m25/t001). A tail of three or more English
 * words is a sentence, not a borrowed term. A capitalized English word is
 * title case carried over from the source — except in German, where every noun
 * is capitalized.
 *
 * Deliberately not caught: a one- or two-word lowercase tail, such as
 * `Outro transactions`. It has the same shape as the correct `Criar token`,
 * and telling them apart needs per-language morphology rather than a rule.
 */
export function untranslatedEnglishTail(
  message: string,
  english: string,
  locale: string,
): string[] {
  if (message === english) return [];
  const shared = sharedEnglishTail(message, english);
  if (shared.length === 0) return [];
  const isSentence =
    shared.filter((word) => /^[A-Za-z]{2,}$/.test(word)).length >= 3;
  const isTitleCased =
    TITLE_CASE_MEANS_ENGLISH.has(locale) &&
    shared.some((word) => /^[A-Z][a-z]{2,}$/.test(word));
  return isSentence || isTitleCased ? shared : [];
}

/**
 * The English words of a message copied into another catalog without being
 * translated at all, or an empty array when the copy is legitimate.
 *
 * `untranslatedEnglishTail` returns early on an exact copy on purpose — it
 * looks for a translation abandoned halfway — so a whole message pasted from
 * `en` passed every guard. More than 600 such copies shipped across Receipt,
 * Plaid and Settings before this check existed (w0/m1). A copy counts once it
 * keeps two or more English words after the allowlisted brand, format and
 * notation terms are removed: `Plaid`, `CSV`, `Beancount.io` or `Status`
 * alone are identical in many languages, `Upload Receipt` is not.
 */
export function untranslatedWholeMessage(
  message: string,
  english: string,
): string[] {
  if (message !== english) return [];
  const words = english
    .replace(/\{[^}]*\}/g, " ")
    .replace(ALLOWED_PATTERN, " ")
    .match(/(?<![0-9A-Za-z])[A-Za-z]{2,}(?![0-9A-Za-z])/g);
  return words && words.length >= 2 ? words : [];
}

/**
 * One locale's messages that `check` finds untranslated against the same key
 * in English. The walk the English-comparison guards and the
 * `i18n:prepare` report share — the half-translated tail and the whole copy —
 * so they cannot drift in what they skip: keys English no longer has, and keys
 * `allowed` excuses.
 */
export function untranslatedAgainstEnglish(
  messages: Readonly<Record<string, string>> | undefined,
  english: Readonly<Record<string, string>>,
  check: (message: string, english: string) => string[],
  allowed: (key: string) => boolean = () => false,
): { key: string; message: string; words: string[] }[] {
  const offenders: { key: string; message: string; words: string[] }[] = [];
  for (const [key, message] of Object.entries(messages ?? {})) {
    const source = english[key];
    if (source === undefined || allowed(key)) continue;
    const words = check(message, source);
    if (words.length) offenders.push({ key, message, words });
  }
  return offenders;
}

/** The prefix `i18n:prepare` gives a key until someone translates it. */
export const TODO_MARKER = "[TODO]";

/**
 * A message still awaiting translation. The catalog tests, `i18n:check` and
 * the `i18n:prepare` report share it, so none calls a catalog done that
 * another rejects.
 */
export function isTodoMessage(message: string): boolean {
  return message.trimStart().startsWith(TODO_MARKER);
}

/**
 * One locale's messages copied whole from English, minus the ones
 * `IDENTICAL_BY_DESIGN` excuses and any `skip` names. The whole-copy guard
 * and the `i18n:prepare` report both use it, so they judge alike.
 */
export function wholeEnglishCopies(
  messages: Readonly<Record<string, string>> | undefined,
  english: Readonly<Record<string, string>>,
  locale: string,
  skip: (key: string) => boolean = () => false,
): { key: string; message: string; words: string[] }[] {
  return untranslatedAgainstEnglish(
    messages,
    english,
    untranslatedWholeMessage,
    (key) => skip(key) || `${locale}/${key}` in IDENTICAL_BY_DESIGN,
  );
}

/**
 * Entries of a `locale/key` identical-by-design allowlist that no longer
 * describe a copy: the locale now translates the key, or the key is gone. A
 * stale entry would otherwise excuse a future regression on that key
 * silently. A key removed from both the locale and English used to compare
 * equal (`undefined === undefined`) and linger.
 */
export function staleIdenticalEntries(
  allowlist: Readonly<Record<string, string>>,
  catalogs: Readonly<Record<string, Readonly<Record<string, string>>>>,
  english: Readonly<Record<string, string>>,
): string[] {
  return Object.keys(allowlist).filter((entry) => {
    const [locale, ...rest] = entry.split("/");
    const key = rest.join("/");
    const message = catalogs[locale]?.[key];
    return message === undefined || message !== english[key];
  });
}

/**
 * Messages a locale deliberately keeps identical to English, keyed
 * `locale/key`, each with the reason it is correct there. The list exists so
 * the whole-copy guard (`locale-stray-english.test.ts`) and the
 * `i18n:prepare` report can stay strict; an entry that stops being identical fails
 * the stale-entry test rather than lingering as a silent excuse.
 */
export const IDENTICAL_BY_DESIGN: Record<string, string> = {
  "bg/userProfile.openLedgerName":
    "Open Ledger is the proper name of the public collection account",
  "ca/userProfile.openLedgerName":
    "Open Ledger is the proper name of the public collection account",
  "de/userProfile.openLedgerName":
    "Open Ledger is the proper name of the public collection account",
  "es/userProfile.openLedgerName":
    "Open Ledger is the proper name of the public collection account",
  "fa/userProfile.openLedgerName":
    "Open Ledger is the proper name of the public collection account",
  "fr/userProfile.openLedgerName":
    "Open Ledger is the proper name of the public collection account",
  "ja/userProfile.openLedgerName":
    "Open Ledger is the proper name of the public collection account",
  "ko/userProfile.openLedgerName":
    "Open Ledger is the proper name of the public collection account",
  "nl/userProfile.openLedgerName":
    "Open Ledger is the proper name of the public collection account",
  "pt/userProfile.openLedgerName":
    "Open Ledger is the proper name of the public collection account",
  "ru/userProfile.openLedgerName":
    "Open Ledger is the proper name of the public collection account",
  "sk/userProfile.openLedgerName":
    "Open Ledger is the proper name of the public collection account",
  "uk/userProfile.openLedgerName":
    "Open Ledger is the proper name of the public collection account",
  "zh/userProfile.openLedgerName":
    "Open Ledger is the proper name of the public collection account",
  "bg/page.accounts.accountSubAccountPlaceholder":
    "Placeholder written in Beancount account-path syntax",
  "ca/page.accounts.accountSubAccountPlaceholder":
    "Placeholder written in Beancount account-path syntax",
  "de/page.accounts.accountSubAccountPlaceholder":
    "Placeholder written in Beancount account-path syntax",
  "es/page.accounts.accountSubAccountPlaceholder":
    "Placeholder written in Beancount account-path syntax",
  "fa/page.accounts.accountSubAccountPlaceholder":
    "Placeholder written in Beancount account-path syntax",
  "fr/page.accounts.accountSubAccountPlaceholder":
    "Placeholder written in Beancount account-path syntax",
  "nl/page.accounts.accountSubAccountPlaceholder":
    "Placeholder written in Beancount account-path syntax",
  "pt/page.accounts.accountSubAccountPlaceholder":
    "Placeholder written in Beancount account-path syntax",
  "ru/page.accounts.accountSubAccountPlaceholder":
    "Placeholder written in Beancount account-path syntax",
  "sk/page.accounts.accountSubAccountPlaceholder":
    "Placeholder written in Beancount account-path syntax",
  "uk/page.accounts.accountSubAccountPlaceholder":
    "Placeholder written in Beancount account-path syntax",
  "zh/page.accounts.accountSubAccountPlaceholder":
    "Placeholder written in Beancount account-path syntax",
  "de/seo.ledgerPullRequest.title":
    "These catalogs keep the Git term Pull Request throughout",
  "nl/seo.ledgerPullRequest.title":
    "These catalogs keep the Git term Pull Request throughout",
};

/**
 * The numbers a message states, Western and Eastern Arabic digits alike, so a
 * limit-copy test can compare them with the limit the code enforces.
 */
export function numbersIn(text: string): number[] {
  const normalized = text.replace(/[٠-٩۰-۹]/g, (digit) =>
    String(digit.charCodeAt(0) & 0xf),
  );
  return [...normalized.matchAll(/\d+/g)].map((m) => Number(m[0]));
}

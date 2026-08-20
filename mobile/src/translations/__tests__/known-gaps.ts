/**
 * The escape hatches the translation-integrity suite recognises, and the only
 * ones. Each is a list you have to write your name on: nothing about a gap is
 * inferred, so a green build means either "translated" or "someone wrote down
 * that it is not, and why".
 */

/**
 * Keys a locale has not translated yet, compared by **equality**: a key
 * translated but left listed here fails just as loudly as a key missing but
 * not listed. That is deliberate — a baseline that only had to be a superset
 * would rot into a list nobody trusts.
 *
 * **Empty, and meant to stay that way.** It is kept rather than deleted
 * because deferring a language is sometimes the honest thing to do, and a
 * feature branch needs a way to say so out loud instead of working around a
 * red build. To defer, add `<locale>: ["<key>", …]` here and say why in the
 * commit message. To close one out, translate the keys and delete the entry.
 */
export const KNOWN_GAPS: Record<string, string[]> = {};

/**
 * Keys whose value is the English text in **every** language, because the
 * English text is what the app must show: a literal the code matches on, a
 * Beancount account name, an example filename.
 */
export const UNTRANSLATABLE: Record<string, string> = {
  deleteAccountConfirmPhrase:
    "A sudo-style confirmation phrase; the settings screen compares typed input against this value, so translating it changes what the user must type to delete their account.",
  openAccountNamePlaceholder:
    "A Beancount account name shown as a format example — colons and CamelCase are the syntax, not English.",
  budgetAccountPlaceholder:
    "A literal Beancount account name (Expenses:Groceries) — the same text in every language.",
  ledgerCreateFilePlaceholder:
    "An example filename; the .bean extension is part of the format.",
};

/**
 * Per locale, keys this language renders with the same characters English
 * does. Grouped by reason, because the reasons repeat: a language that took a
 * word as a loanword took a dozen of them.
 *
 * A key belongs here when the English text is the *correct output* in that
 * language — not when translating it is merely awkward. Compared for equality
 * against what the files actually contain, so translating one of these later
 * fails until the entry is removed.
 */
export const SAME_AS_ENGLISH: Record<
  string,
  Array<{ reason: string; keys: string[] }>
> = {
  ca: [
    {
      reason: "Catalan spells these the same as English.",
      keys: [
        "journalError",
        "document",
        "total",
        "budgetInterval",
        "ledgerEditorErrorCount",
      ],
    },
    {
      reason: "Month abbreviations that coincide with the English ones.",
      keys: ["02", "03", "06", "07", "10", "11"],
    },
    {
      reason: "Range chips: M reads as mes, and the row has to stay short.",
      keys: ["range1M", "range3M", "range6M"],
    },
    { reason: "The same abbreviation for automàtic.", keys: ["autoLabel"] },
  ],
  de: [
    {
      reason: "Loanwords German uses unchanged.",
      keys: [
        "journal",
        "currentVersion",
        "themeSystem",
        "supportSettings",
        "filterStatus",
        "budget",
        "details",
        "tags",
        "links",
        "commitDetailDiff",
      ],
    },
    {
      reason: "Month abbreviations that coincide with the English ones.",
      keys: ["01", "02", "04", "06", "07", "08", "09", "11"],
    },
    {
      reason:
        "Range chips: M reads as Monat, and YTD is the standard term in German finance UIs.",
      keys: ["range1M", "range3M", "range6M", "rangeYTD"],
    },
    { reason: "The same abbreviation for automatisch.", keys: ["autoLabel"] },
  ],
  es: [
    {
      reason: "Spanish spells these the same as English.",
      keys: ["journalError", "receiptFlash", "total"],
    },
    {
      reason: "Month abbreviations that coincide with the English ones.",
      keys: ["02", "03", "05", "06", "07", "09", "10", "11"],
    },
    {
      reason: "Range chips: M reads as mes, and the row has to stay short.",
      keys: ["range1M", "range3M", "range6M"],
    },
    { reason: "The same abbreviation for automático.", keys: ["autoLabel"] },
  ],
  fr: [
    {
      reason: "French spells these the same as English.",
      keys: [
        "journal",
        "currentVersion",
        "supportSettings",
        "suggestions",
        "date",
        "transactions",
        "transaction",
        "note",
        "document",
        "budget",
        "receiptFlash",
        "total",
        "notificationsBell",
        "notificationsTitle",
        "merchantsTransactionCount",
      ],
    },
    {
      reason: "Month abbreviations that coincide with the English ones.",
      keys: ["10", "11"],
    },
    {
      reason: "Range chips: M reads as mois, and the row has to stay short.",
      keys: ["range1M", "range3M", "range6M"],
    },
    { reason: "The same abbreviation for automatique.", keys: ["autoLabel"] },
  ],
  nl: [
    {
      reason: "Dutch uses these English words unchanged.",
      keys: [
        "home",
        "accountSettings",
        "accountPickerRecent",
        "accounts",
        "account",
        "accountsPlural",
        "filters",
        "filterStatus",
        "filterAccount",
        "document",
        "budget",
        "metadata",
        "details",
        "tags",
        "links",
        "budgetInterval",
      ],
    },
    {
      reason: "Month abbreviations that coincide with the English ones.",
      keys: ["01", "02", "04", "06", "07", "08", "09", "11", "12"],
    },
    {
      reason: "Range chips: M reads as maand, and the row has to stay short.",
      keys: ["range1M", "range3M", "range6M"],
    },
    { reason: "The same abbreviation for automatisch.", keys: ["autoLabel"] },
  ],
  pt: [
    {
      reason: "Portuguese spells these the same as English.",
      keys: ["filterStatus", "tags", "links", "receiptFlash", "total"],
    },
    {
      reason: "Month abbreviations that coincide with the English ones.",
      keys: ["01", "03", "06", "07", "11"],
    },
    {
      reason: "Range chips: M reads as mês, and the row has to stay short.",
      keys: ["range1M", "range3M", "range6M"],
    },
    { reason: "The same abbreviation for automático.", keys: ["autoLabel"] },
  ],
  sk: [
    {
      reason: "Slovak spells this the same as English.",
      keys: ["budgetInterval"],
    },
    {
      reason: "Month abbreviations that coincide with the English ones.",
      keys: ["01", "02", "03", "04", "08", "09", "11", "12"],
    },
    {
      reason: "Range chips: M reads as mesiac, and the row has to stay short.",
      keys: ["range1M", "range3M", "range6M"],
    },
    { reason: "The same abbreviation for automatický.", keys: ["autoLabel"] },
  ],
};

/** Every key a locale may legitimately leave as the English text. */
export const allowedEnglishCopies = (locale: string): string[] =>
  [
    ...Object.keys(UNTRANSLATABLE),
    ...(SAME_AS_ENGLISH[locale] ?? []).flatMap((group) => group.keys),
  ].sort();

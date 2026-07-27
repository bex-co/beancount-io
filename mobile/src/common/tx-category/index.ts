import {
  AccountRoot,
  getAccountRoot,
  orderAccountsByRootPriority,
} from "../account-root";

/** A posting reduced to what the row icon needs: which account, how much. */
export type PostingLite = {
  account: string;
  /** Signed amount in the posting's currency; omit when unknown. */
  amount?: number;
};

/** Sentinel returned by {@link pickPrimaryAccount} for account-to-account moves. */
export const TRANSFER = "transfer" as const;

// The legs that describe *what a transaction is for* (its category / purpose),
// as opposed to the funding side (Assets, Liabilities) the money moved through.
const CATEGORY_ROOTS = new Set<AccountRoot>(["expenses", "income", "equity"]);

/**
 * Pick the single account whose icon best represents a transaction.
 *
 * A transaction has many postings, so we choose the one that explains its
 * purpose, not the account it was paid from:
 *
 * 1. Among the category legs (Expenses / Income / Equity), the one with the
 *    largest absolute amount wins. This makes a paycheck read as Income even
 *    though it also has a tax Expense leg, and a split purchase read as its
 *    dominant category — while a plain two-leg expense trivially returns its
 *    single category leg. When amounts are unknown it falls back to root
 *    priority (Expenses before the funding side).
 * 2. If there are no category legs at all (money only moved between Assets /
 *    Liabilities — an internal transfer or a credit-card payment), it is a
 *    {@link TRANSFER}.
 * 3. Otherwise (a lone account, e.g. an Open directive) that account.
 *
 * @returns the driving account, {@link TRANSFER}, or null when there is nothing.
 */
export function pickPrimaryAccount(
  postings: PostingLite[],
): string | typeof TRANSFER | null {
  const categoryLegs = postings.filter((p) => {
    const root = getAccountRoot(p.account);
    return root != null && CATEGORY_ROOTS.has(root);
  });

  if (categoryLegs.length > 0) {
    const withAmount = categoryLegs.filter(
      (p) => typeof p.amount === "number" && !Number.isNaN(p.amount),
    );
    if (withAmount.length > 0) {
      return withAmount.reduce((best, p) =>
        Math.abs(p.amount as number) > Math.abs(best.amount as number)
          ? p
          : best,
      ).account;
    }
    return orderAccountsByRootPriority(categoryLegs.map((p) => p.account))[0];
  }

  const distinct = Array.from(
    new Set(postings.map((p) => p.account).filter(Boolean)),
  );
  if (distinct.length >= 2) return TRANSFER;
  return distinct[0] ?? null;
}

/** Ionicons glyph shown for account-to-account transfers / debt payments. */
export const TRANSFER_GLYPH = "swap-horizontal";

// Category → Ionicons glyph, most specific first. Keys are matched against the
// account's segments (Home-Improvement before Home, so a furniture repair does
// not read as generic housing). Keywords are lowercase word stems.
const CATEGORY_RULES: { glyph: string; keywords: string[] }[] = [
  {
    glyph: "restaurant",
    keywords: [
      "food",
      "dining",
      "restaurant",
      "grocery",
      "groceries",
      "coffee",
      "cafe",
      "alcohol",
      "bar",
      "meal",
      "meals",
      "snack",
      "takeout",
      "dinner",
      "lunch",
      "breakfast",
      "drinks",
    ],
  },
  {
    glyph: "car",
    keywords: [
      "transport",
      "transit",
      "subway",
      "tram",
      "bus",
      "train",
      "taxi",
      "uber",
      "lyft",
      "fuel",
      "gas",
      "petrol",
      "parking",
      "car",
      "auto",
      "vehicle",
      "rideshare",
      "commute",
    ],
  },
  {
    glyph: "airplane",
    keywords: [
      "travel",
      "vacation",
      "flight",
      "flights",
      "airline",
      "airfare",
      "hotel",
      "hotels",
      "lodging",
      "airbnb",
      "trip",
      "trips",
    ],
  },
  {
    glyph: "hammer",
    keywords: [
      "improvement",
      "renovation",
      "furniture",
      "hardware",
      "repair",
      "repairs",
      "maintenance",
      "garden",
      "appliance",
      "appliances",
      "remodel",
    ],
  },
  {
    glyph: "home",
    keywords: [
      "rent",
      "housing",
      "home",
      "mortgage",
      "utilities",
      "utility",
      "electric",
      "electricity",
      "water",
      "internet",
      "phone",
      "mobile",
      "heating",
    ],
  },
  {
    glyph: "medkit",
    keywords: [
      "health",
      "medical",
      "doctor",
      "dental",
      "vision",
      "pharmacy",
      "hospital",
      "clinic",
      "medicine",
      "healthcare",
    ],
  },
  {
    glyph: "barbell",
    keywords: [
      "fitness",
      "gym",
      "salon",
      "haircut",
      "beauty",
      "spa",
      "wellness",
      "grooming",
      "cosmetics",
    ],
  },
  {
    glyph: "film",
    keywords: [
      "entertainment",
      "movie",
      "movies",
      "cinema",
      "music",
      "game",
      "games",
      "gaming",
      "streaming",
      "hobby",
      "hobbies",
      "sport",
      "sports",
      "concert",
    ],
  },
  {
    glyph: "bag-handle",
    keywords: [
      "shopping",
      "merchandise",
      "clothing",
      "clothes",
      "apparel",
      "electronics",
      "retail",
      "supplies",
      "shoes",
      "gift",
      "gifts",
    ],
  },
  {
    glyph: "school",
    keywords: [
      "education",
      "school",
      "tuition",
      "book",
      "books",
      "course",
      "courses",
      "subscription",
      "subscriptions",
      "software",
      "insurance",
      "legal",
    ],
  },
  {
    glyph: "business",
    keywords: [
      "tax",
      "taxes",
      "government",
      "donation",
      "donations",
      "charity",
      "irs",
    ],
  },
  {
    glyph: "trending-down",
    keywords: ["loan", "loans", "debt", "repayment", "principal"],
  },
  {
    glyph: "card",
    keywords: [
      "fee",
      "fees",
      "bank",
      "commission",
      "commissions",
      "atm",
      "financial",
      "interest",
      "charges",
    ],
  },
];

function tokenize(segment: string): string[] {
  return segment
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // split camelCase
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function segmentMatches(tokens: string[], keywords: string[]): boolean {
  return tokens.some((tok) =>
    // Short keywords (car, gas, bar…) require an exact token so "caregiver"
    // does not match "car"; longer ones allow a prefix (electric→electricity).
    keywords.some((k) => tok === k || (k.length >= 5 && tok.startsWith(k))),
  );
}

/**
 * Map an account to a category glyph. Only Expenses accounts get a category —
 * Income/Equity/funding accounts fall back to their root glyph, which keeps the
 * mapping unambiguous (e.g. "Income:Interest" stays income, it is not a fee).
 *
 * Segments are checked outermost-first (the 2nd level, where beancount
 * convention puts the category), so `Expenses:Home:Gas` reads as housing, not
 * fuel.
 *
 * @returns an Ionicons glyph name, or null when no category is recognised.
 */
export function matchCategory(account: string): string | null {
  if (getAccountRoot(account) !== "expenses") return null;
  const segments = account.split(":").slice(1); // drop the "Expenses" root
  for (const segment of segments) {
    const tokens = tokenize(segment);
    for (const rule of CATEGORY_RULES) {
      if (segmentMatches(tokens, rule.keywords)) return rule.glyph;
    }
  }
  return null;
}

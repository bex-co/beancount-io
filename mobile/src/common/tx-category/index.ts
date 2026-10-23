import {
  AccountRoot,
  getAccountRoot,
  orderAccountsByRootPriority,
  type RootNames,
} from "../account-root";

/** A posting reduced to what the row icon needs: which account, how much. */
export type PostingLite = {
  account: string;
  /** Signed amount in the posting's currency; omit when unknown. */
  amount?: number;
  /** The amount's currency; omit when unknown. Amounts compare only within one. */
  currency?: string;
};

/** Sentinel returned by {@link pickPrimaryAccount} for account-to-account moves. */
export const TRANSFER = "transfer" as const;

// The legs that describe *what a transaction is for* (its category / purpose),
// as opposed to the funding side (Assets, Liabilities) the money moved through.
const CATEGORY_ROOTS = new Set<AccountRoot>(["expenses", "income", "equity"]);

/**
 * The one currency category legs are compared in: the ledger's operating
 * currency when a leg is in it, else the currency an Expenses leg is in (a
 * flight that earns miles is spending, not the miles), else the alphabetically
 * first, so the pick never depends on posting order.
 */
function comparableCurrency(
  legs: PostingLite[],
  roots: RootNames,
  operatingCurrency?: string,
): string {
  const currencies = Array.from(new Set(legs.map((p) => p.currency ?? "")));
  if (currencies.length === 1) return currencies[0];
  if (operatingCurrency && currencies.includes(operatingCurrency)) {
    return operatingCurrency;
  }
  const spent = currencies
    .filter((currency) =>
      legs.some(
        (p) =>
          (p.currency ?? "") === currency &&
          getAccountRoot(p.account, roots) === "expenses",
      ),
    )
    .sort();
  return spent[0] ?? currencies.sort()[0];
}

/**
 * An exchange between your own accounts booked through Equity conversion legs
 * (the trading-account pattern): only balance-sheet and Equity legs, in two
 * currencies or more, each netting to zero, with money leaving in one currency
 * and arriving in another. It moved money and spent none, yet read "−$100.00"
 * under the Equity icon (w21/818). An opening balance in two currencies, all
 * of it arriving, is not one.
 */
export function isEquityConversion(
  postings: readonly PostingLite[],
  roots: RootNames = {},
): boolean {
  let equity = false;
  const net = new Map<string, number>();
  const held = new Map<string, number>();
  for (const posting of postings) {
    const { amount, currency } = posting;
    if (typeof amount !== "number" || !Number.isFinite(amount) || !currency) {
      return false;
    }
    const root = getAccountRoot(posting.account, roots);
    if (root === "equity") equity = true;
    else if (root === "assets" || root === "liabilities") {
      held.set(currency, (held.get(currency) ?? 0) + amount);
    } else return false;
    net.set(currency, (net.get(currency) ?? 0) + amount);
  }
  const settled = [...net.values()].every((sum) => Math.abs(sum) < 1e-9);
  const moved = [...held.values()];
  return (
    equity &&
    net.size >= 2 &&
    settled &&
    moved.some((sum) => sum < 0) &&
    moved.some((sum) => sum > 0)
  );
}

/**
 * Pick the single account whose icon best represents a transaction.
 *
 * A transaction has many postings, so we choose the one that explains its
 * purpose, not the account it was paid from:
 *
 * 1. Among the category legs (Expenses / Income / Equity), the one with the
 *    largest absolute amount, within one currency, wins. This makes a paycheck read as Income even
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
  roots: RootNames = {},
  operatingCurrency?: string,
): string | typeof TRANSFER | null {
  // A currency exchange through Equity conversion legs is a transfer.
  if (isEquityConversion(postings, roots)) return TRANSFER;
  const categoryLegs = postings.filter((p) => {
    const root = getAccountRoot(p.account, roots);
    return root != null && CATEGORY_ROOTS.has(root);
  });

  if (categoryLegs.length > 0) {
    const withAmount = categoryLegs.filter(
      (p) => typeof p.amount === "number" && !Number.isNaN(p.amount),
    );
    if (withAmount.length > 0) {
      // 1,500 miles are not more than 500 dollars: legs compare only within
      // one currency (w21/211).
      const comparable = withAmount.filter(
        (p) =>
          (p.currency ?? "") ===
          comparableCurrency(withAmount, roots, operatingCurrency),
      );
      return comparable.reduce((best, p) =>
        Math.abs(p.amount as number) > Math.abs(best.amount as number)
          ? p
          : best,
      ).account;
    }
    return orderAccountsByRootPriority(
      categoryLegs.map((p) => p.account),
      roots,
    )[0];
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
export function matchCategory(
  account: string,
  roots: RootNames = {},
): string | null {
  if (getAccountRoot(account, roots) !== "expenses") return null;
  const segments = account.split(":").slice(1); // drop the "Expenses" root
  for (const segment of segments) {
    const tokens = tokenize(segment);
    for (const rule of CATEGORY_RULES) {
      if (segmentMatches(tokens, rule.keywords)) return rule.glyph;
    }
  }
  return null;
}

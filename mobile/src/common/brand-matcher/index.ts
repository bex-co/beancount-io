import { leafName } from "../account-util";
import { orderAccountsByRootPriority, type RootNames } from "../account-root";
import { foldQuotes } from "../merchant-key";

// Curated payee → domain map. Keys are lowercase; sorted longest-first at
// runtime so "uber eats" wins over "uber" when both could match.
const BRAND_MAP: Record<string, string> = {
  // Coffee & Cafe
  starbucks: "starbucks.com",
  "dunkin donuts": "dunkindonuts.com",
  "dunkin'": "dunkindonuts.com",
  dunkin: "dunkindonuts.com",
  "tim hortons": "timhortons.com",
  "peet's coffee": "peets.com",
  "peets coffee": "peets.com",

  // Food delivery
  "uber eats": "ubereats.com",
  doordash: "doordash.com",
  grubhub: "grubhub.com",
  instacart: "instacart.com",
  seamless: "seamless.com",
  postmates: "postmates.com",
  gopuff: "gopuff.com",

  // Rideshare
  uber: "uber.com",
  lyft: "lyft.com",

  // E-commerce
  "amazon.com": "amazon.com",
  "amazon prime video": "amazon.com",
  "amazon prime": "amazon.com",
  amazon: "amazon.com",
  ebay: "ebay.com",
  etsy: "etsy.com",
  walmart: "walmart.com",
  target: "target.com",
  costco: "costco.com",
  "best buy": "bestbuy.com",
  wayfair: "wayfair.com",
  shopify: "shopify.com",

  // Grocery
  "whole foods": "wholefoodsmarket.com",
  "trader joe's": "traderjoes.com",
  "trader joes": "traderjoes.com",
  kroger: "kroger.com",
  safeway: "safeway.com",
  publix: "publix.com",
  aldi: "aldi.com",
  sprouts: "sprouts.com",

  // Fast food & restaurants
  "mcdonald's": "mcdonalds.com",
  mcdonalds: "mcdonalds.com",
  "burger king": "bk.com",
  "taco bell": "tacobell.com",
  chipotle: "chipotle.com",
  subway: "subway.com",
  "pizza hut": "pizzahut.com",
  "domino's": "dominos.com",
  dominos: "dominos.com",
  "chick-fil-a": "chick-fil-a.com",
  chickfila: "chick-fil-a.com",
  "wendy's": "wendys.com",
  wendys: "wendys.com",
  kfc: "kfc.com",
  "panera bread": "panerabread.com",
  panera: "panerabread.com",
  "in-n-out": "in-n-out.com",
  "five guys": "fiveguys.com",
  "shake shack": "shakeshack.com",
  "olive garden": "olivegarden.com",
  applebees: "applebees.com",
  "applebee's": "applebees.com",

  // Streaming & digital services
  netflix: "netflix.com",
  spotify: "spotify.com",
  "disney plus": "disneyplus.com",
  "disney+": "disneyplus.com",
  hulu: "hulu.com",
  "hbo max": "max.com",
  "youtube premium": "youtube.com",
  youtube: "youtube.com",
  "google play": "google.com",
  "apple store": "apple.com",
  "app store": "apple.com",
  itunes: "apple.com",
  twitch: "twitch.tv",
  adobe: "adobe.com",
  dropbox: "dropbox.com",
  github: "github.com",
  slack: "slack.com",
  zoom: "zoom.us",

  // Tech
  apple: "apple.com",
  "apple.com": "apple.com",
  google: "google.com",
  microsoft: "microsoft.com",

  // Pharmacy & health
  cvs: "cvs.com",
  walgreens: "walgreens.com",
  "rite aid": "riteaid.com",
  "rite-aid": "riteaid.com",

  // Home improvement
  "the home depot": "homedepot.com",
  "home depot": "homedepot.com",
  "lowe's": "lowes.com",
  lowes: "lowes.com",
  ikea: "ikea.com",

  // Travel
  airbnb: "airbnb.com",
  "delta air lines": "delta.com",
  delta: "delta.com",
  "united airlines": "united.com",
  united: "united.com",
  "american airlines": "aa.com",
  "southwest airlines": "southwest.com",
  southwest: "southwest.com",
  marriott: "marriott.com",
  hilton: "hilton.com",
  hyatt: "hyatt.com",
  expedia: "expedia.com",
  "hotels.com": "hotels.com",
  "booking.com": "booking.com",
  vrbo: "vrbo.com",

  // Finance & payments
  paypal: "paypal.com",
  venmo: "venmo.com",
  "cash app": "cash.app",
  cashapp: "cash.app",
  zelle: "zellepay.com",
  coinbase: "coinbase.com",

  // Banking
  "bank of america": "bankofamerica.com",
  "wells fargo": "wellsfargo.com",
  "capital one": "capitalone.com",
  "american express": "americanexpress.com",
  citibank: "citi.com",
  chase: "chase.com",
  amex: "americanexpress.com",
  citi: "citi.com",

  // Gas
  chevron: "chevron.com",
  exxon: "exxon.com",
  shell: "shell.com",
  bp: "bp.com",

  // Clothing & retail
  nike: "nike.com",
  adidas: "adidas.com",
  "h&m": "hm.com",
  zara: "zara.com",
  gap: "gap.com",
  uniqlo: "uniqlo.com",

  // Telecom
  "at&t": "att.com",
  verizon: "verizon.com",
  "t-mobile": "t-mobile.com",
  tmobile: "t-mobile.com",
  comcast: "comcast.com",
  xfinity: "xfinity.com",
};

// Pre-sorted keys (longest first) so specific phrases win over short prefixes.
const SORTED_KEYS = Object.keys(BRAND_MAP).sort((a, b) => b.length - a.length);

/**
 * Keys that are also ordinary words or shared names. A word boundary cannot
 * tell "Delta Dental", "United Way" or "Target Date 2040 Fund" from the brand,
 * so these match only a payee that is the brand alone once card-processor
 * noise is stripped ("TARGET 00012345"), never a word inside a longer name.
 */
const COMMON_WORD_KEYS = new Set([
  "apple",
  "chase",
  "delta",
  "gap",
  "seamless",
  "shell",
  "slack",
  "southwest",
  "sprouts",
  "subway",
  "target",
  "united",
  "zoom",
]);

/**
 * Names a statement puts before `*` when the merchant follows it: payment
 * processors, which are never the merchant, and marketplaces that also sell
 * under their own name. "PAYPAL *NETFLIX" is Netflix, not PayPal (w21/270).
 */
const PAYMENT_PROCESSORS = new Set(["paypal", "square", "venmo", "stripe"]);
const AGGREGATORS = new Set([
  "google",
  "uber",
  "amazon",
  "doordash",
  "grubhub",
  "apple",
]);

/**
 * "PAYPAL *NETFLIX" → the merchant after the star. A processor with a merchant
 * we do not recognise has no logo (its own would be the wrong company); an
 * aggregator falls back to its own brand, read with the star as a space so
 * "UBER *EATS" is "uber eats". Null when the text is not that shape.
 */
function resolveStarMerchant(
  normalized: string,
): { text: string; fallback: string | null } | { brand: string | null } | null {
  const star = normalized.indexOf("*");
  if (star <= 0) return null;
  const head = normalized.slice(0, star).trim();
  const tail = normalized.slice(star + 1).trim();
  const isProcessor = PAYMENT_PROCESSORS.has(head);
  if (!tail || (!isProcessor && !AGGREGATORS.has(head))) return null;
  const byMerchant = matchBrand(tail);
  if (byMerchant) return { brand: byMerchant };
  // Read as "head tail" for a more specific key ("uber eats"); if nothing
  // matches, the head's own brand stands. "apple" is a common word that matches
  // only alone, so "APPLE *ICLOUD" (read "apple icloud") lost its logo (w21/407).
  return isProcessor
    ? { brand: null }
    : { text: `${head} ${tail}`, fallback: BRAND_MAP[head] ?? null };
}

/** Drop what card processors add around a merchant name. */
function stripTransactionNoise(lowered: string): string {
  return (
    lowered
      .replace(/^(?:sq|tst|sp|pp)\s*\*\s*/u, "") // "SQ *", "TST*" prefixes
      // "#1234" store numbers (three or more digits; "United #1 Plumbing" names
      // a business) and "*AB12345" references.
      .split(/\*|#(?=\s*\d{3})/u)[0]
      .split(/\s+/u)
      .filter((word) => !/\d/u.test(word)) // store and terminal numbers
      .join(" ")
      .replace(/[\s.,;:!-]+$/u, "")
  );
}

/**
 * Match a free-text string to a brand domain for logo display.
 *
 * Matching is case-insensitive and looks for the brand key at word boundaries,
 * so "Starbucks #1234" matches "starbucks" but "targeted" does not match "target".
 * A key that is also an ordinary word matches only on its own (see
 * `COMMON_WORD_KEYS`), so "Delta Dental" does not get Delta Air Lines' logo.
 * Matching runs entirely on-device; no payee text leaves the device.
 *
 * @returns The brand's domain string (e.g. "starbucks.com") or null if unrecognised.
 */
/**
 * A letter, digit or combining mark of a script that separates its words with
 * spaces. Han, Hiragana, Katakana and Thai do not, so an ASCII brand written
 * against them ("Amazon购物", "Netflix会员", "Uberタクシー") still sits on a word
 * boundary; counting them as word characters stopped those matching (w21/333).
 * "Café Amazonía" stays no match: its neighbours are Latin letters.
 */
const WORD_CHAR =
  /(?![\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}])[\p{L}\p{N}\p{M}]/u;

export function matchBrand(text: string): string | null {
  if (!text) return null;
  // Curly quotes as straight, as merchants are keyed: iOS Smart Punctuation
  // types "Trader Joe’s", which no brand key spells (w21/760).
  let normalized = foldQuotes(text).toLowerCase().trim();

  const starred = resolveStarMerchant(normalized);
  if (starred && "brand" in starred) return starred.brand;
  let fallback: string | null = null;
  if (starred) {
    normalized = starred.text;
    fallback = starred.fallback;
  }

  // Exact match is cheapest — try first, then without processor noise.
  if (BRAND_MAP[normalized]) return BRAND_MAP[normalized];
  const stripped = stripTransactionNoise(normalized);
  if (BRAND_MAP[stripped]) return BRAND_MAP[stripped];

  for (const key of SORTED_KEYS) {
    if (COMMON_WORD_KEYS.has(key)) continue;
    const idx = normalized.indexOf(key);
    if (idx === -1) continue;

    // Require word boundary: char before and after must be no letter, digit
    // or combining mark in any script. ASCII-only, an accent was a boundary
    // and "Café Amazonía" got the Amazon logo (w21/172).
    const charBefore = normalized[idx - 1];
    const charAfter = normalized[idx + key.length];
    const boundaryBefore = idx === 0 || !WORD_CHAR.test(charBefore);
    const boundaryAfter =
      idx + key.length === normalized.length || !WORD_CHAR.test(charAfter);

    if (boundaryBefore && boundaryAfter) return BRAND_MAP[key];
  }

  return fallback;
}

/**
 * Resolve the brand domain for a journal row: show a logo when the **payee** or
 * the **target account** is a recognised brand.
 *
 * The payee is tried first (a "Starbucks #1234" charge is Starbucks regardless
 * of which card paid it). Otherwise each account's leaf name is matched in
 * target-account priority order (Expenses/Income before the funding side), so a
 * transaction categorized to `Expenses:Shopping:Amazon` shows the Amazon logo
 * even with no payee. Returns null when nothing is recognised — the caller then
 * falls back to the neutral account-type glyph.
 */
export function resolveBrandDomain(
  payee: string | undefined,
  accounts: string[],
  roots: RootNames = {},
): string | null {
  if (payee) {
    const byPayee = matchBrand(payee);
    if (byPayee) return byPayee;
  }
  for (const account of orderAccountsByRootPriority(accounts ?? [], roots)) {
    const byAccount = matchBrand(leafName(account));
    if (byAccount) return byAccount;
  }
  return null;
}

/**
 * Build a proxied logo URL for a domain. Points at our opengraph-image service
 * (config.logoProxyUrl), which fetches from logo.dev once and caches the result,
 * so the app never talks to a third party directly. Returns null when no base URL
 * is configured, so the caller falls back to the account-type glyph.
 *
 * @param domain - Brand domain, e.g. "netflix.com".
 * @param baseUrl - Logo proxy endpoint, e.g. ".../api/logo".
 */
export function buildLogoUrl(domain: string, baseUrl: string): string | null {
  if (!domain || !baseUrl) return null;
  return `${baseUrl}?domain=${encodeURIComponent(domain)}`;
}

const sameServer = (left: string, right: string) =>
  left.trim().replace(/\/+$/, "").toLowerCase() ===
  right.trim().replace(/\/+$/, "").toLowerCase();

/**
 * The logo proxy to use for the selected server: the configured one only on
 * the build's own server. On a server the user chose themselves the logo
 * service would still learn every brand-matched payee in their private
 * ledger, and their IP (w21/155), so rows fall back to glyphs there.
 *
 * @param selectedServer - The server the app talks to now.
 * @param defaultServer - The build's default server.
 * @param proxyUrl - The configured logo proxy endpoint.
 */
export function logoProxyForServer(
  selectedServer: string,
  defaultServer: string,
  proxyUrl: string,
): string {
  return sameServer(selectedServer, defaultServer) ? proxyUrl : "";
}

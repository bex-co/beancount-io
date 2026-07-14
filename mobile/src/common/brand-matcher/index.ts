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
 * Match a payee string to a brand domain for logo display.
 *
 * Matching is case-insensitive and looks for the brand key at word boundaries,
 * so "Starbucks #1234" matches "starbucks" but "targeted" does not match "target".
 * Matching runs entirely on-device; no payee text leaves the device.
 *
 * @returns The brand's domain string (e.g. "starbucks.com") or null if unrecognised.
 */
export function matchBrand(payee: string): string | null {
  if (!payee) return null;
  const normalized = payee.toLowerCase().trim();

  // Exact match is cheapest — try first.
  if (BRAND_MAP[normalized]) return BRAND_MAP[normalized];

  for (const key of SORTED_KEYS) {
    const idx = normalized.indexOf(key);
    if (idx === -1) continue;

    // Require word boundary: char before and after must be non-alphanumeric.
    const charBefore = normalized[idx - 1];
    const charAfter = normalized[idx + key.length];
    const boundaryBefore = idx === 0 || !/[a-z0-9]/.test(charBefore);
    const boundaryAfter =
      idx + key.length === normalized.length || !/[a-z0-9]/.test(charAfter);

    if (boundaryBefore && boundaryAfter) return BRAND_MAP[key];
  }

  return null;
}

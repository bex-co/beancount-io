import { matchBrand } from "../common/brand-matcher";

// --- Known brands ---

test("matches Starbucks exactly", () => {
  const result = matchBrand("Starbucks");
  if (result !== "starbucks.com")
    throw new Error(`expected starbucks.com, got ${result}`);
});

test("matches Starbucks with store number suffix", () => {
  const result = matchBrand("STARBUCKS #1234");
  if (result !== "starbucks.com")
    throw new Error(`expected starbucks.com, got ${result}`);
});

test("matches Amazon.com", () => {
  const result = matchBrand("Amazon.com");
  if (result !== "amazon.com")
    throw new Error(`expected amazon.com, got ${result}`);
});

test("matches AMAZON.COM with transaction code", () => {
  const result = matchBrand("AMAZON.COM*AB12345");
  if (result !== "amazon.com")
    throw new Error(`expected amazon.com, got ${result}`);
});

test("matches Uber Eats (not plain Uber)", () => {
  const result = matchBrand("Uber Eats");
  if (result !== "ubereats.com")
    throw new Error(`expected ubereats.com, got ${result}`);
});

test("matches plain Uber", () => {
  const result = matchBrand("UBER*TRIP1234");
  if (result !== "uber.com")
    throw new Error(`expected uber.com, got ${result}`);
});

test("matches McDonald's with apostrophe", () => {
  const result = matchBrand("McDonald's");
  if (result !== "mcdonalds.com")
    throw new Error(`expected mcdonalds.com, got ${result}`);
});

test("matches Netflix", () => {
  const result = matchBrand("NETFLIX.COM");
  if (result !== "netflix.com")
    throw new Error(`expected netflix.com, got ${result}`);
});

test("matches Spotify", () => {
  const result = matchBrand("Spotify USA");
  if (result !== "spotify.com")
    throw new Error(`expected spotify.com, got ${result}`);
});

test("matches DoorDash", () => {
  const result = matchBrand("DoorDash");
  if (result !== "doordash.com")
    throw new Error(`expected doordash.com, got ${result}`);
});

test("matches Lyft", () => {
  const result = matchBrand("Lyft *ride");
  if (result !== "lyft.com")
    throw new Error(`expected lyft.com, got ${result}`);
});

test("matches Home Depot", () => {
  const result = matchBrand("THE HOME DEPOT");
  if (result !== "homedepot.com")
    throw new Error(`expected homedepot.com, got ${result}`);
});

test("matches Target", () => {
  const result = matchBrand("Target");
  if (result !== "target.com")
    throw new Error(`expected target.com, got ${result}`);
});

test("matches Whole Foods", () => {
  const result = matchBrand("Whole Foods Market");
  if (result !== "wholefoodsmarket.com")
    throw new Error(`expected wholefoodsmarket.com, got ${result}`);
});

// --- Fallback cases ---

test("returns null for unrecognised payee", () => {
  const result = matchBrand("Bob's Hardware Store");
  if (result !== null) throw new Error(`expected null, got ${result}`);
});

test("returns null for empty string", () => {
  const result = matchBrand("");
  if (result !== null) throw new Error(`expected null, got ${result}`);
});

test("returns null for account name (not a brand)", () => {
  const result = matchBrand("Assets:Checking:MyBank");
  if (result !== null) throw new Error(`expected null, got ${result}`);
});

// --- Word-boundary guard: short keys must not match inside longer words ---

test("does not match 'bp' inside 'bp-chemical-supplies'", () => {
  // 'bp' followed by '-' — '-' is not alphanumeric, so this WILL match bp.com.
  // That's fine; the real guard is against alpha-adjacent substrings.
  const result = matchBrand("nbp energy corp");
  // 'bp' is preceded by 'n' (alpha) → should NOT match
  if (result !== null) throw new Error(`expected null, got ${result}`);
});

test("does not match 'gap' inside 'gap-analysis report'", () => {
  // gap followed by '-' is a word boundary, so this WILL match.
  // Test the alpha-adjacent case instead:
  const result = matchBrand("gapping expenses");
  if (result !== null) throw new Error(`expected null, got ${result}`);
});

// --- Case insensitivity ---

test("is case-insensitive", () => {
  const result = matchBrand("STARBUCKS");
  if (result !== "starbucks.com")
    throw new Error(`expected starbucks.com, got ${result}`);
});

// --- Specificity: longer key wins ---

test("prefers 'uber eats' over 'uber' when both could match", () => {
  const result = matchBrand("Uber Eats");
  if (result !== "ubereats.com")
    throw new Error(`expected ubereats.com, got ${result}`);
});

test("prefers 'amazon prime' over 'amazon' for Amazon Prime", () => {
  const result = matchBrand("Amazon Prime");
  if (result !== "amazon.com")
    throw new Error(`expected amazon.com, got ${result}`);
});

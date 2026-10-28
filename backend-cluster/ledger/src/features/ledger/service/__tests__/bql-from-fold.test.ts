import { foldBqlColumnFrom } from "../bql-from-fold";

// w23/153: `id` stays out of the wrap's inner list (the id guard would
// trip on every wrapped query, and outer `id` refuses before running).
const INNER =
  "date, flag, payee, narration, account, position, accounts, balance, cost, cost_currency, cost_date, cost_label, cost_number, currency, day, description, entry, filename, lineno, links, location, meta, month, number, other_accounts, posting_flag, price, tags, type, units, weight, year";

describe("foldBqlColumnFrom", () => {
  it("inserts a terminator after a bare-EOF fold name", () => {
    expect(foldBqlColumnFrom("SELECT count(*) FROM payee")).toBe(
      "SELECT count(*) FROM payee;",
    );
  });

  it("inserts before trailing whitespace", () => {
    expect(foldBqlColumnFrom("SELECT count(*) FROM payee  \n")).toBe(
      "SELECT count(*) FROM payee;  \n",
    );
  });

  it("wraps a with-clause fold name with the explicit inner list", () => {
    expect(foldBqlColumnFrom("SELECT count(*) FROM payee LIMIT 1")).toBe(
      `SELECT count(*) FROM (SELECT ${INNER} FROM payee) LIMIT 1`,
    );
  });

  it.each([
    "SELECT count(*) FROM narration WHERE date > 2020-01-01",
    "SELECT flag, count(*) FROM flag GROUP BY flag",
    "SELECT * FROM narration ORDER BY date LIMIT 1",
  ])("wraps %s", (query) => {
    const wrapped = foldBqlColumnFrom(query);
    expect(wrapped).toContain("FROM (SELECT ");
    expect(wrapped).toContain(") ");
  });

  it("keeps a star inner for a star outer", () => {
    expect(foldBqlColumnFrom("SELECT * FROM payee LIMIT 1")).toBe(
      "SELECT * FROM (SELECT * FROM payee) LIMIT 1",
    );
  });

  it("keeps a star inner for SELECT DISTINCT *", () => {
    expect(foldBqlColumnFrom("SELECT DISTINCT * FROM payee LIMIT 1")).toBe(
      "SELECT DISTINCT * FROM (SELECT * FROM payee) LIMIT 1",
    );
  });

  it("leaves a trailing-terminator query alone (already folds)", () => {
    const query = "SELECT count(*) FROM payee;";
    expect(foldBqlColumnFrom(query)).toBe(query);
  });

  it("leaves a paren-terminated name alone (already folds)", () => {
    const query = "SELECT * FROM (SELECT * FROM payee)";
    expect(foldBqlColumnFrom(query)).toBe(query);
  });

  it.each([
    // Dual: stock tables it in every form.
    "accounts",
    // Stock crashes / errors: every form must error loudly instead.
    "balance",
    "cost",
    "units",
    "transaction",
    // Engine yields 0 natively while stock folds: loud, not silent [[0]] (w23/125).
    "filename",
    "lineno",
    "meta",
    "location",
    "id",
    // Tables and keywords: never folded.
    "entries",
    "postings",
    "prices",
    "close",
    "open",
    "clear",
    "nosuch",
  ])("leaves %s alone in bare and with-clause forms", (name) => {
    expect(foldBqlColumnFrom(`SELECT count(*) FROM ${name}`)).toBe(
      `SELECT count(*) FROM ${name}`,
    );
    expect(foldBqlColumnFrom(`SELECT count(*) FROM ${name} LIMIT 1`)).toBe(
      `SELECT count(*) FROM ${name} LIMIT 1`,
    );
  });

  it.each([
    "account",
    "cost_currency",
    "cost_date",
    "cost_label",
    "cost_number",
    "currency",
    "date",
    "day",
    "description",
    "entry",
    "flag",
    "links",
    "month",
    "narration",
    "number",
    "other_accounts",
    "payee",
    "position",
    "posting_flag",
    "price",
    "tags",
    "type",
    "weight",
    "year",
  ])("folds %s", (name) => {
    expect(foldBqlColumnFrom(`SELECT count(*) FROM ${name}`)).toBe(
      `SELECT count(*) FROM ${name};`,
    );
    expect(foldBqlColumnFrom(`SELECT count(*) FROM ${name} LIMIT 1`)).toBe(
      `SELECT count(*) FROM (SELECT ${INNER} FROM ${name}) LIMIT 1`,
    );
  });

  it("is case-sensitive on the fold name, insensitive on the keyword", () => {
    expect(foldBqlColumnFrom("SELECT count(*) FROM PAYEE LIMIT 1")).toBe(
      "SELECT count(*) FROM PAYEE LIMIT 1",
    );
    expect(foldBqlColumnFrom("select count(*) from payee limit 1")).toBe(
      `select count(*) from (SELECT ${INNER} FROM payee) limit 1`,
    );
  });

  it("ignores FROM inside a string literal", () => {
    const query = `SELECT * WHERE narration = 'FROM payee LIMIT 1' LIMIT 1`;
    expect(foldBqlColumnFrom(query)).toBe(query);
  });

  it("leaves a quoted name for the unquote stage", () => {
    const query = 'SELECT count(*) FROM "payee" LIMIT 1';
    expect(foldBqlColumnFrom(query)).toBe(query);
  });

  it("exposes a new inner column to hidden projections through the wrap", () => {
    expect(foldBqlColumnFrom("SELECT type FROM narration LIMIT 1")).toBe(
      `SELECT type FROM (SELECT ${INNER} FROM narration) LIMIT 1`,
    );
  });

  it("wraps an inner with-clause fold and reads its own owner", () => {
    expect(
      foldBqlColumnFrom("SELECT * FROM (SELECT date FROM payee LIMIT 1)"),
    ).toBe(`SELECT * FROM (SELECT date FROM (SELECT ${INNER} FROM payee) LIMIT 1)`);
  });

  it("wraps when a second statement follows the terminator", () => {
    expect(foldBqlColumnFrom("SELECT * FROM payee; SELECT 1")).toBe(
      "SELECT * FROM (SELECT * FROM payee); SELECT 1",
    );
  });

  it("uses the explicit inner with no owning SELECT", () => {
    expect(foldBqlColumnFrom("FROM payee LIMIT 1")).toBe(
      `FROM (SELECT ${INNER} FROM payee) LIMIT 1`,
    );
  });

  it("wraps past an alias the engine rejects either way", () => {
    expect(foldBqlColumnFrom("SELECT * FROM payee AS p")).toBe(
      "SELECT * FROM (SELECT * FROM payee) AS p",
    );
  });

  it("returns an unterminated literal unchanged", () => {
    const query = "SELECT * FROM payee WHERE narration = 'oops LIMIT 1";
    expect(foldBqlColumnFrom(query)).toBe(query);
  });
});

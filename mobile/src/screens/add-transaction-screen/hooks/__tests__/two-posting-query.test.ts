import fs from "fs";
import path from "path";
import { twoPostingSuggestionsQuery } from "../two-posting-query";

// w21/149: the raw payee was parsed as filter syntax and refused.
describe("twoPostingSuggestionsQuery", () => {
  it("quotes a payee with punctuation so the server reads it as text", () => {
    expect(twoPostingSuggestionsQuery("Dupar's")).toEqual({
      filter: `payee:"^\\s*Dupar['\u2018\u2019]s\\s*$"`,
      directiveTypes: ["Transaction"],
      limit: 50,
    });
    expect(twoPostingSuggestionsQuery("Mr. Marcel").filter).toBe(
      'payee:"^\\s*Mr\\.\\s+Marcel\\s*$"',
    );
    expect(twoPostingSuggestionsQuery("Chase:Slate").filter).toBe(
      'payee:"^\\s*Chase:Slate\\s*$"',
    );
    expect(twoPostingSuggestionsQuery("25 Degrees Burger Bar").filter).toBe(
      'payee:"^\\s*25\\s+Degrees\\s+Burger\\s+Bar\\s*$"',
    );
  });

  // w21/921: "Uber" matched as text sat behind 50 "Uber Eats" entries.
  it("matches the payee field whole, over transactions only", () => {
    const query = twoPostingSuggestionsQuery("Uber");
    expect(query.filter).toBe('payee:"^\\s*Uber\\s*$"');
    expect(query.directiveTypes).toEqual(["Transaction"]);
  });

  it("falls back to the plain filter for a pattern too long to send", () => {
    const long = "a".repeat(300);
    expect(twoPostingSuggestionsQuery(long).filter?.startsWith("payee:")).toBe(
      false,
    );
  });

  it("is what the hook queries with", () => {
    const hook = fs.readFileSync(
      path.join(__dirname, "..", "use-two-posting-suggestions.ts"),
      "utf8",
    );
    expect(hook.includes("query: twoPostingSuggestionsQuery(payee)")).toBe(
      true,
    );
  });
});

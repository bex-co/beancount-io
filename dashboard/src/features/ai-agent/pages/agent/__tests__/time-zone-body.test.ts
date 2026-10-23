import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// w21/856: the agent was never told where the user is, so "this month" was the
// model's guess and an undated receipt was filed under the server's UTC day.
describe("the agent chat request body", () => {
  const source = readFileSync(
    resolve(__dirname, "../page.tsx"),
    "utf8",
  ).replace(/\s+/g, "");

  it("carries the browser's time zone, read for each request", () => {
    expect(
      source.includes(
        "body:()=>({ledgerId:`${ledgerOwner}/${ledgerName}`,sessionId,timeZone:browserTimeZone(),...bodyExtra,}),",
      ),
    ).toBe(true);
  });

  it("reads the zone from Intl, or sends none", () => {
    expect(
      source.includes(
        "functionbrowserTimeZone():string|undefined{try{returnIntl.DateTimeFormat().resolvedOptions().timeZone||undefined;}catch{returnundefined;}}",
      ),
    ).toBe(true);
  });
});

import fs from "fs";
import path from "path";
import { revalidateOnEdit } from "../revalidate-on-edit";

// w21/238: a currency fixed from "US" to "USD" kept saying "Choose a currency
// code like USD or EUR" until Next was pressed again.
describe("revalidateOnEdit", () => {
  const harness = (errored: string[]) => {
    const events: string[] = [];
    const edit = (name: string) =>
      revalidateOnEdit({
        name,
        hasError: (field) => errored.includes(field),
        trigger: (field) => events.push(`trigger:${field}`),
        onChange: (text) => events.push(`change:${text}`),
      });
    return { events, edit };
  };

  it("re-checks a field that shows an error, after storing what was typed", () => {
    const { events, edit } = harness(["currency"]);
    edit("currency")("USD");
    expect(events).toEqual(["change:USD", "trigger:currency"]);
  });

  it("stays quiet on a field without an error", () => {
    const { events, edit } = harness(["currency"]);
    edit("name")("Household");
    expect(events).toEqual(["change:Household"]);
  });

  it("is what the form's validated fields use", () => {
    const form = fs
      .readFileSync(
        path.join(__dirname, "..", "create-ledger-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    for (const field of ["name"]) {
      expect(form.includes(`edited("${field}"`)).toBe(true);
    }
    // The description has no rule, so it has nothing to re-check.
    expect(form.includes('edited("description"')).toBe(false);
  });
});

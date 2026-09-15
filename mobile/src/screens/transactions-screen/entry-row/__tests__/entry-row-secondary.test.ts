import fs from "fs";
import path from "path";
import { entryRowSecondaryText } from "../entry-row-secondary";

describe("entryRowSecondaryText", () => {
  it("shows the narration under a payee that says something else", () => {
    expect(
      entryRowSecondaryText({
        payee: "Q2 2026 Expenses",
        narration: "Other cost of revenue",
      }),
    ).toBe("Other cost of revenue");
  });

  it("adds no line when the payee is the only text", () => {
    expect(entryRowSecondaryText({ payee: "Anthropic", narration: "" })).toBe(
      null,
    );
    expect(entryRowSecondaryText({ payee: "Anthropic" })).toBe(null);
  });

  it("adds no line when the narration is already the name", () => {
    expect(
      entryRowSecondaryText({ payee: null, narration: "Padding inserted" }),
    ).toBe(null);
  });

  it("adds no line when payee and narration match", () => {
    expect(
      entryRowSecondaryText({
        payee: "Cafe Medager",
        narration: " Cafe Medager ",
      }),
    ).toBe(null);
  });
});

describe("EntryRow secondary line wiring", () => {
  it("renders the narration line from the helper", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "index.tsx"),
      "utf8",
    );
    expect(source.includes("entryRowSecondaryText(entry)")).toBe(true);
    expect(source.includes("{secondary}")).toBe(true);
  });
});

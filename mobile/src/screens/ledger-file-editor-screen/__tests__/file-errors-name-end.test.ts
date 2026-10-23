import { filterFileErrors } from "../utils";

// w21/447: a message naming `main.beancount` matched `main.bean`, because the
// match never checked where the name ended.
const nameless = (message: string) => ({ message, filename: null });
const kept = (message: string, file: string) =>
  filterFileErrors([nameless(message)], file).length === 1;

describe("filterFileErrors, for an error that names its file in the message", () => {
  it("does not take a longer file name for this one", () => {
    expect(kept("parse errors in main.beancount", "main.bean")).toBe(false);
    expect(kept("Errors in main.bean.bak: oops", "main.bean")).toBe(false);
    expect(kept("parse errors in main.bean2", "main.bean")).toBe(false);
    expect(kept("parse errors in main.bean-old", "main.bean")).toBe(false);
  });

  it("still matches the longer files and the exact name", () => {
    expect(kept("parse errors in main.beancount", "main.beancount")).toBe(true);
    expect(kept("Errors in main.bean.bak: oops", "main.bean.bak")).toBe(true);
    expect(kept("parse errors in main.bean", "main.bean")).toBe(true);
  });

  it("accepts the name followed by punctuation, a space or a sentence's full stop", () => {
    for (const message of [
      "parse errors in main.bean: line 3",
      "parse errors in main.bean.",
      "parse errors in main.bean, line 3",
      "parse errors in main.bean line 3",
    ]) {
      expect(kept(message, "main.bean")).toBe(true);
    }
  });

  it("keeps a nested path's whole-path rule", () => {
    expect(kept("errors in sub/main.beancount", "sub/main.bean")).toBe(false);
    expect(kept("errors in sub/main.bean", "sub/main.bean")).toBe(true);
    expect(kept("parse errors in main.bean", "sub/main.bean")).toBe(false);
  });
});

// w21/773: a name in quotes kept its opening quote and never matched, so the
// file's banner never listed an unlocated "Duplicate filename parsed" error.
describe("filterFileErrors, for a quoted file name", () => {
  it("matches the name inside the quotes", () => {
    expect(
      kept('Duplicate filename parsed: "sub.beancount"', "sub.beancount"),
    ).toBe(true);
    expect(kept("include 'books/2024.bean' failed", "books/2024.bean")).toBe(
      true,
    );
    expect(
      kept('Duplicate filename parsed: "sub.beancount"', "main.beancount"),
    ).toBe(false);
  });
});

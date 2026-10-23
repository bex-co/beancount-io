import { duplicateEntryErrors } from "../noduplicates";

// w21/847: the engine compared transactions only; bean-check flags a repeated
// balance, note or event (not a price) on its later copy.
const SOURCE = `plugin "beancount.plugins.noduplicates"
2024-01-01 open Assets:Cash
2024-01-02 balance Assets:Cash 0 USD
2024-01-02 balance Assets:Cash 0 USD
2024-01-03 note Assets:Cash "hi"
2024-01-03 note Assets:Cash "hi"
2024-01-04 event "loc" "x"
2024-01-04 event "loc" "x"
2024-01-05 price AAA 1 USD
2024-01-05 price AAA 1 USD
`;

describe("duplicateEntryErrors", () => {
  it("flags a repeated balance, note and event on the later copy, and no price", () => {
    const errors = duplicateEntryErrors({ "main.bean": SOURCE }, "main.bean");
    expect(errors.map((error) => [error.file, error.line])).toEqual([
      ["main.bean", 4],
      ["main.bean", 6],
      ["main.bean", 8],
    ]);
    expect(errors[0]?.message).toMatch(/^Duplicate entry: Balance: /);
    expect(errors[1]?.message).toMatch(/^Duplicate entry: Note: /);
    expect(errors[2]?.message).toMatch(/^Duplicate entry: Event: /);
  });

  it("ignores metadata and spacing when comparing", () => {
    const source = `plugin "beancount.plugins.noduplicates"
2024-01-03 note Assets:Cash "hi"
  doc: "a"
2024-01-03  note  Assets:Cash   "hi" ; again
`;
    expect(
      duplicateEntryErrors({ "main.bean": source }, "main.bean").map(
        (error) => error.line,
      ),
    ).toEqual([4]);
  });

  it("tells copies in different files apart from distinct entries", () => {
    const files = {
      "main.bean": `plugin "beancount.plugins.noduplicates"\ninclude "b.bean"\n2024-01-03 note Assets:Cash "hi"\n`,
      "b.bean": `2024-01-03 note Assets:Cash "hi"\n2024-01-03 note Assets:Cash "other"\n`,
    };
    const errors = duplicateEntryErrors(files, "main.bean");
    // b.bean line 1 sorts before main.bean line 3, so the later copy is main's.
    expect(errors.map((error) => [error.file, error.line])).toEqual([
      ["main.bean", 3],
    ]);
  });

  it("does nothing unless the plugin is declared", () => {
    const source = SOURCE.replace(/^plugin.*\n/u, "");
    expect(duplicateEntryErrors({ "main.bean": source }, "main.bean")).toEqual(
      [],
    );
  });
});

import { addEntriesCommitMessage, entryCommitMessage } from "../commit-message";

describe("addEntriesCommitMessage", () => {
  it("uses the singular noun for one entry", () => {
    expect(addEntriesCommitMessage(1)).toBe("Add 1 entry");
  });

  it("uses the plural noun for every other count", () => {
    expect(addEntriesCommitMessage(0)).toBe("Add 0 entries");
    expect(addEntriesCommitMessage(2)).toBe("Add 2 entries");
    expect(addEntriesCommitMessage(37)).toBe("Add 37 entries");
  });
});

// w21/903: every history row read "Add 1 entry" or "Update entry".
describe("commit messages that name the entry", () => {
  const coffee = '2026-10-22 * "Blue Bottle" "Coffee"\n  Expenses:Food  5 USD';

  it("names a single added entry by its date and payee", () => {
    expect(addEntriesCommitMessage(1, [coffee])).toBe(
      'Add 2026-10-22 "Blue Bottle"',
    );
    expect(addEntriesCommitMessage(1, ['2026-10-22 * "Just narration"'])).toBe(
      'Add 2026-10-22 "Just narration"',
    );
  });

  it("keeps the count for several entries or an unreadable one", () => {
    expect(addEntriesCommitMessage(2, [coffee, coffee])).toBe("Add 2 entries");
    expect(addEntriesCommitMessage(1, ["not an entry"])).toBe("Add 1 entry");
  });

  it("names an updated or deleted entry, a directive by its first line", () => {
    expect(entryCommitMessage("Update", coffee)).toBe(
      'Update 2026-10-22 "Blue Bottle"',
    );
    expect(
      entryCommitMessage("Delete", "2026-01-01 open Assets:Cash USD"),
    ).toBe("Delete 2026-01-01 open Assets:Cash");
    expect(entryCommitMessage("Delete", "")).toBe("Delete entry");
  });
});

// w21/961: a quoted string is a transaction's name, not a directive's argument.
describe("commit messages for directives that are not transactions", () => {
  const add = (line: string) => addEntriesCommitMessage(1, [line]);

  it("names a budget by its account, so two budgets differ", () => {
    expect(
      add('2026-10-01 custom "budget" Expenses:Food "monthly" 300.00 USD'),
    ).toBe("Add 2026-10-01 custom budget Expenses:Food");
    expect(
      add('2026-10-01 custom "budget" Expenses:Rent "monthly" 1500.00 USD'),
    ).toBe("Add 2026-10-01 custom budget Expenses:Rent");
  });

  it("does not take a quoted string or a comment for the name", () => {
    expect(add('2026-01-01 open Assets:Cash USD "STRICT"')).toBe(
      "Add 2026-01-01 open Assets:Cash",
    );
    expect(add('2026-01-01 event "location" "Paris"')).toBe(
      "Add 2026-01-01 event location",
    );
    expect(add('2026-01-01 open Assets:Cash ; "main" account')).toBe(
      "Add 2026-01-01 open Assets:Cash",
    );
  });

  it("does not print empty strings for a transaction with no name", () => {
    expect(add('2026-10-22 * "" ""')).toBe("Add 2026-10-22 transaction");
    expect(add("2026-10-22 *")).toBe("Add 2026-10-22 transaction");
  });

  // w21/984: a flag with no space before the string was read as a directive.
  it("names a transaction whose flag touches its string", () => {
    expect(add('2026-10-22 *"Coffee" "x"')).toBe('Add 2026-10-22 "Coffee"');
    expect(add('2026-10-22 !"Coffee"')).toBe('Add 2026-10-22 "Coffee"');
    expect(add('2026-10-22 P "Coffee"')).toBe('Add 2026-10-22 "Coffee"');
    expect(entryCommitMessage("Update", '2026-10-22 *"Coffee" "x"')).toBe(
      'Update 2026-10-22 "Coffee"',
    );
  });

  it("still names a transaction by its payee, the flag or txn leading", () => {
    expect(add('2026-10-22 txn "Cafe" "latte"')).toBe('Add 2026-10-22 "Cafe"');
    expect(add('2026-10-22 ! "Cafe"')).toBe('Add 2026-10-22 "Cafe"');
  });
});

// w21/962: the cut counted UTF-16 units and could split an emoji.
describe("a long label", () => {
  it("is cut by code point, never through an emoji", () => {
    const text = `2026-10-22 * "${"x".repeat(46)}🍕 and more text"`;
    const subject = addEntriesCommitMessage(1, [text]);
    expect(subject.includes("\ufffd")).toBe(false);
    expect(/[\ud800-\udbff](?![\udc00-\udfff])/.test(subject)).toBe(false);
    expect(/(?<![\ud800-\udbff])[\udc00-\udfff]/.test(subject)).toBe(false);
    expect(Array.from(subject.replace(/^Add /, "")).length).toBe(60);
    expect(subject.endsWith("…")).toBe(true);
  });

  it("keeps a short one whole", () => {
    expect(addEntriesCommitMessage(1, ['2026-10-22 * "🍕"'])).toBe(
      'Add 2026-10-22 "🍕"',
    );
  });
});

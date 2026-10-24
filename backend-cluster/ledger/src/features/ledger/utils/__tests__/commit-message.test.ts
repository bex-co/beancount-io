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
    ).toBe("Delete 2026-01-01 open Assets:Cash USD");
    expect(entryCommitMessage("Delete", "")).toBe("Delete entry");
  });
});

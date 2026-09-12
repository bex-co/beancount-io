import { addEntriesCommitMessage } from "../commit-message";

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

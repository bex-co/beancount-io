import fs from "fs";
import path from "path";
import { journalRowKeys } from "../../transactions-screen/utils/merge-journal-page";

// w21/910: identical budget entries share a hash, hence a React key.
describe("budget history row keys", () => {
  it("tells identical entries apart", () => {
    const twins = [
      { entry_hash: "h", date: "2026-10-23" },
      { entry_hash: "h", date: "2026-10-23" },
    ];
    const keys = journalRowKeys(twins);
    expect(keys.get(twins[0]!)).toBe("h");
    expect(keys.get(twins[1]!)).toBe("h#1");
  });

  it("keys the rows by them", () => {
    const source = fs
      .readFileSync(
        path.join(__dirname, "../components/budget-history-rows.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(source.includes("constkeys=journalRowKeys(rows);")).toBe(true);
    expect(source.includes("key={keys.get(row)}")).toBe(true);
  });
});

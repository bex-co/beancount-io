import fs from "fs";
import path from "path";
import { isOpenableTextEntry } from "../common/ledger-file-types";

// w21/915: a symlink named like a ledger file opened the editor on "too large
// to open on your phone", because Gitea sends it with no content.
describe("isOpenableTextEntry", () => {
  it("opens a text file and no link or submodule, whatever its name", () => {
    expect(isOpenableTextEntry({ name: "prices.bean", type: "file" })).toBe(
      true,
    );
    expect(isOpenableTextEntry({ name: "prices.bean", type: "symlink" })).toBe(
      false,
    );
    expect(isOpenableTextEntry({ name: "2024", type: "symlink" })).toBe(false);
    expect(isOpenableTextEntry({ name: "shared", type: "submodule" })).toBe(
      false,
    );
  });

  it("still leaves a binary file to its extension", () => {
    expect(isOpenableTextEntry({ name: "scan.pdf", type: "file" })).toBe(false);
  });

  it("gives the browser's rows the same rule, with their own icon", () => {
    const source = fs
      .readFileSync(
        path.join(__dirname, "../screens/ledger-file-browser-screen/index.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      source.includes("consteditable=!isDir&&isOpenableTextEntry(entry);"),
    ).toBe(true);
    expect(source.includes("elseif(isOpenableTextEntry(entry)){")).toBe(true);
    expect(source.includes('"link-outline"')).toBe(true);
  });
});

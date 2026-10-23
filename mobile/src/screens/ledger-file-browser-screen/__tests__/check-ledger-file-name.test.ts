import fs from "fs";
import path from "path";
import { translationLocales } from "../../../translations/__tests__/locale-parity";
import {
  checkLedgerFileName,
  clashingFileName,
  listingHasFile,
  parentDirectory,
} from "../utils";

// New Ledger File used to grey out Create with no reason, and refused folder
// paths the server accepts (w21/014). Each refusal now names its rule.
describe("checkLedgerFileName", () => {
  const existing = ["main.bean", "accounts.beancount"];

  it("says a name already exists, after adding .bean", () => {
    expect(checkLedgerFileName("main", existing)).toEqual({
      ok: false,
      issue: "exists",
      filename: "main.bean",
      existing: "main.bean",
    });
  });

  // w21/787: "Main" beside main.bean said "A file named Main.bean already
  // exists", a file that did not.
  it("names the file there when the clash is only in letter case", () => {
    expect(checkLedgerFileName("Main", existing)).toEqual({
      ok: false,
      issue: "exists",
      filename: "Main.bean",
      existing: "main.bean",
    });
  });

  it("refuses traversal, backslashes and empty folder names as a path issue", () => {
    for (const input of [
      "../qa.bean",
      "sub/../x.bean",
      "./x.bean",
      "/abs.bean",
      "sub//x.bean",
      "sub\\x.bean",
      "x\u0007.bean",
    ]) {
      expect(checkLedgerFileName(input, existing)).toEqual({
        ok: false,
        issue: "path",
      });
    }
  });

  it("refuses another extension or a bare extension", () => {
    expect(checkLedgerFileName("notes.txt", existing).ok).toBe(false);
    expect(checkLedgerFileName("notes.txt", existing)).toEqual({
      ok: false,
      issue: "extension",
    });
    expect(checkLedgerFileName(".bean", existing)).toEqual({
      ok: false,
      issue: "extension",
    });
  });

  it("accepts a new name and a relative folder path", () => {
    expect(checkLedgerFileName("notes", existing)).toEqual({
      ok: true,
      filename: "notes.bean",
    });
    expect(checkLedgerFileName(" sub/notes.beancount ", existing)).toEqual({
      ok: true,
      filename: "sub/notes.beancount",
    });
  });

  it("leaves an empty field silently disabled", () => {
    expect(checkLedgerFileName("   ", existing)).toEqual({
      ok: false,
      issue: "empty",
    });
  });
});

describe("New Ledger File dialog", () => {
  const read = (...parts: string[]) =>
    fs.readFileSync(path.join(__dirname, ...parts), "utf8");

  it("maps each refusal to its message", () => {
    const screen = read("..", "index.tsx");
    expect(
      screen
        .replace(/\s+/g, " ")
        .includes(
          't("ledgerFileNameExists", { name: check.existing ?? check.filename, })',
        ),
    ).toBe(true);
    expect(screen.includes('t("ledgerFileNameExtension")')).toBe(true);
    expect(screen.includes('t("ledgerFileNamePath")')).toBe(true);
  });

  it("shows a string verdict under the field and disables Confirm on it", () => {
    const modal = read(
      "..",
      "..",
      "..",
      "components",
      "text-input-modal",
      "index.tsx",
    );
    expect(
      modal.includes("const isConfirmDisabled = validation !== true || busy;"),
    ).toBe(true);
    expect(
      modal.includes(
        'const inputError = typeof validation === "string" ? validation : null;',
      ),
    ).toBe(true);
  });
});

// w21/222: `sub/notes` passed at the root even when `sub/notes.bean` existed;
// the dialog closed and the create failed.
describe("a new file into a folder that already holds it", () => {
  it("is refused once the folder's listing says so", () => {
    const folder = [
      { path: "sub/notes.bean", type: "file" },
      { path: "sub/inner", type: "dir" },
    ];
    expect(listingHasFile(folder, "sub/notes.bean")).toBe(true);
    expect(listingHasFile(folder, "/sub/notes.bean")).toBe(true);
    expect(listingHasFile(folder, "sub/other.bean")).toBe(false);
    // A folder of that name is not the file.
    expect(listingHasFile(folder, "sub/inner")).toBe(false);
    expect(listingHasFile([], "sub/notes.bean")).toBe(false);
  });

  it("names the clash in the dialog by treating the found file as existing", () => {
    // The bare current-folder names do not see it...
    expect(checkLedgerFileName("sub/notes", ["main.bean", "sub"]).ok).toBe(
      true,
    );
    // ...and once the listing found it, the same input is refused with its name.
    expect(
      checkLedgerFileName("sub/notes", ["main.bean", "sub", "sub/notes.bean"]),
    ).toEqual({
      ok: false,
      issue: "exists",
      filename: "sub/notes.bean",
      existing: "sub/notes.bean",
    });
  });

  it("finds the folder to look in", () => {
    expect(parentDirectory("sub/notes.bean")).toBe("sub");
    expect(parentDirectory("a/b/c.bean")).toBe("a/b");
    expect(parentDirectory("main.bean")).toBe("");
  });

  it("checks that folder before the dialog closes", () => {
    const source = fs
      .readFileSync(path.join(__dirname, "..", "index.tsx"), "utf8")
      .replace(/\s+/g, "");
    const lookup = source.indexOf("query:GetLedgerDirContentDocument");
    const closes = source.indexOf("setCreateModalVisible(false);try{");
    expect(lookup > -1 && lookup < closes).toBe(true);
  });
});

// w21/565: backend-v2's portable-path rule (w23/054) refuses what Windows cannot
// store, so the dialog closed and a raw English toast followed. The client now
// shows it inline, with Create disabled. The cases restate the server's.
describe("checkLedgerFileName against the server's portable-path rule", () => {
  const issue = (input: string) => {
    const check = checkLedgerFileName(input);
    return check.ok ? "ok" : check.issue;
  };

  it("refuses names Windows cannot store, translated inline", () => {
    for (const name of [
      "Q1: taxes",
      "a?b",
      'say "hi"',
      "a|b",
      "x<y",
      "con",
      "nul.txt.bean",
      "COM1",
      "lpt9",
      "dir./notes",
      "dir /notes",
      "a‮b",
    ]) {
      expect(issue(name)).toBe("portable");
    }
  });

  it("refuses a part over 255 bytes, counted in UTF-8", () => {
    // The name is counted with the ".bean" it gets (5 bytes).
    expect(issue(`${"a".repeat(250)}`)).toBe("ok");
    expect(issue(`${"a".repeat(251)}`)).toBe("portable");
    expect(issue(`${"é".repeat(126)}`)).toBe("portable");
    expect(issue(`${"é".repeat(125)}`)).toBe("ok");
  });

  it("keeps accepting names the server accepts", () => {
    for (const name of [
      "notes",
      "2026/january",
      "accounts/bank.beancount",
      "my-book_2",
      "contacts",
      "console.bean",
    ]) {
      expect(issue(name)).toBe("ok");
    }
  });

  it("is worded in every shipped language", () => {
    for (const locale of translationLocales()) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const catalog = require(`../../../translations/${locale}`)[locale];
      expect(typeof catalog.ledgerFileNamePortable).toBe("string");
    }
  });
});

// w21/787: the server's conflict for a case twin names the file it kept.
describe("clashingFileName", () => {
  const conflict = (message: string) =>
    Object.assign(new Error(message), {
      graphQLErrors: [{ message, extensions: { code: "CONFLICT" } }],
    });

  it("reads the existing file from the server's conflict", () => {
    expect(
      clashingFileName(
        conflict("File conflict: Main.bean already exists as main.bean"),
        "Main.bean",
      ),
    ).toBe("main.bean");
    expect(
      clashingFileName(
        { graphQLErrors: [{ message: "x already exists as sub/main.bean" }] },
        "x",
      ),
    ).toBe("sub/main.bean");
  });

  it("keeps the name sent for an exact duplicate or an unknown error", () => {
    expect(
      clashingFileName(
        conflict("File conflict: main.bean exists"),
        "main.bean",
      ),
    ).toBe("main.bean");
    expect(clashingFileName(null, "main.bean")).toBe("main.bean");
  });

  it("is what the dialog and the conflict toast name", () => {
    const screen = fs
      .readFileSync(path.join(__dirname, "..", "index.tsx"), "utf8")
      .replace(/\s+/g, "");
    expect(
      screen.includes(
        't("ledgerFileNameExists",{name:check.existing??check.filename,})',
      ),
    ).toBe(true);
    expect(
      screen.includes("constexisting=clashingFileName(createError,filename);"),
    ).toBe(true);
    expect(screen.includes('t("ledgerFileNameExists",{name:existing})')).toBe(
      true,
    );
  });
});

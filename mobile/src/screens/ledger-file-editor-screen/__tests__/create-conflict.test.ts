import fs from "fs";
import path from "path";
import { isConflictFailure } from "../../../common/ledger-conflict";

/**
 * w21/564: since w23/032 the ledger service answers "repository file already
 * exists" with 409 and GraphQL returns CONFLICT; the app passed server text only
 * for three other codes, so a create over an existing file showed the generic
 * failure. Source checks (the screens need the native runtime), with the
 * classifier they depend on.
 */
const read = (...parts: string[]) =>
  fs
    .readFileSync(path.join(__dirname, "..", "..", ...parts), "utf8")
    .replace(/\s+/g, "");
const conflict = Object.assign(new Error("Ledger resource conflict"), {
  graphQLErrors: [{ message: "x", extensions: { code: "CONFLICT" } }],
});

describe("a create over a file that already exists", () => {
  it("is a conflict to the app", () => {
    expect(isConflictFailure(conflict)).toBe(true);
  });

  it("names the file in the browser and refreshes its list", () => {
    const browser = read("ledger-file-browser-screen", "index.tsx");
    const handler = browser.slice(
      browser.indexOf("if(isConflictFailure(createError)){"),
    );
    expect(handler.startsWith("if(isConflictFailure(createError)){")).toBe(
      true,
    );
    // The file the server says is there (w21/787), the name sent otherwise.
    expect(
      handler.includes(
        'constclash=createClash(createError,filename,filePath);constexisting=clash.name;voidinvalidateLedgerData(client,"file");',
      ),
    ).toBe(true);
    expect(handler.includes('t("ledgerFileNameExists",{name:existing})')).toBe(
      true,
    );
  });

  it("is the changed-elsewhere alert in the editor's Recreate, the one a lost save uses", () => {
    const editor = read("ledger-file-editor-screen", "index.tsx");
    const recreate = editor.slice(
      editor.indexOf("constrecreateFile=useCallback("),
      editor.indexOf("consthandleSave=useCallback("),
    );
    expect(
      recreate.includes(
        "if(isConflictFailure(err)){presentConflict(content,epoch,revision);return;}",
      ),
    ).toBe(true);
    const save = editor.slice(editor.indexOf("consthandleSave=useCallback("));
    expect(save.includes("presentConflict(content,epoch,revision);")).toBe(
      true,
    );
    expect(save.includes("presentConflict,recreateFile,")).toBe(true);
  });
});

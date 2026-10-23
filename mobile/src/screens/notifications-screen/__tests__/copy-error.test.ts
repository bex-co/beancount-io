import fs from "fs";
import path from "path";
import { errorCopyText } from "../formatting";

// w21/432: ledger error text could not be copied from Notifications, the
// transaction detail banner or the Entry Context source.
describe("copying a ledger error", () => {
  it("puts the message and its place on separate lines", () => {
    expect(
      errorCopyText({
        message: "Balance failed for Assets:Cash",
        filename: "main.bean",
        lineno: 12,
      }),
    ).toBe("Balance failed for Assets:Cash\nmain.bean:12");
    expect(
      errorCopyText({ message: "Duplicate open", filename: "a.bean" }),
    ).toBe("Duplicate open\na.bean");
  });

  it("is the message alone when it has no place", () => {
    expect(errorCopyText({ message: "Plugin failed" })).toBe("Plugin failed");
  });
});

describe("the texts a person may need to copy", () => {
  const read = (...parts: string[]) =>
    fs
      .readFileSync(path.join(__dirname, "..", "..", ...parts), "utf8")
      .replace(/\s+/g, "");

  it("copy from a Notifications row by long press or a VoiceOver action", () => {
    const source = read("notifications-screen", "notifications-screen.tsx");
    expect(source.includes("onLongPress={()=>voidcopyError()}")).toBe(true);
    expect(
      source.includes('accessibilityActions={[{name:"copy",label:t("copy")}]}'),
    ).toBe(true);
    expect(
      source.includes("Clipboard.setStringAsync(errorCopyText(err))"),
    ).toBe(true);
    // A row that cannot be tapped has its text selectable instead.
    expect(source.includes("selectable={!canFix}")).toBe(true);
  });

  it("are selectable in the detail banner and the Entry Context source", () => {
    expect(
      read(
        "transaction-detail-screen",
        "transaction-detail-screen.tsx",
      ).includes("<Textstyle={styles.errorText}selectable>{error.message}"),
    ).toBe(true);
    expect(
      read("transactions-screen", "entry-context", "index.tsx").includes(
        "<Textstyle={styles.sourceText}selectable>",
      ),
    ).toBe(true);
  });
});

// w21/433: at the tail, a long nested path cut the line number off first.
describe("the Entry Context location line", () => {
  it("keeps its line number by cutting the path's head", () => {
    const source = fs
      .readFileSync(
        path.join(
          __dirname,
          "..",
          "..",
          "transactions-screen",
          "entry-context",
          "index.tsx",
        ),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      source.includes(
        'numberOfLines={1}ellipsizeMode="head">{entryLocationLabel(entryFilename,entryLineNumber)}',
      ),
    ).toBe(true);
  });
});

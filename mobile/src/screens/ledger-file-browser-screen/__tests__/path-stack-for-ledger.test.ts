import fs from "fs";
import path from "path";
import { pathStackForLedger, popPathStack, pushPathStack } from "../utils";

describe("pathStackForLedger", () => {
  const inside2026 = { ledgerId: "open_ledger/alphabet", stack: ["", "2026"] };

  it("keeps the folder while the ledger stays the same", () => {
    expect(pathStackForLedger(inside2026, "open_ledger/alphabet")).toEqual([
      "",
      "2026",
    ]);
  });

  it("starts at the root of a newly selected ledger", () => {
    expect(pathStackForLedger(inside2026, "puncsky/example")).toEqual([""]);
  });

  it("navigates from the new ledger's root, not from the old folder", () => {
    const fresh = pathStackForLedger(inside2026, "puncsky/example");
    expect(pushPathStack(fresh, "docs")).toEqual(["", "docs"]);
    expect(popPathStack(fresh)).toEqual([""]);
  });
});

describe("file browser path state wiring", () => {
  it("reads its directory stack through the ledger-scoped accessor", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "index.tsx"),
      "utf8",
    );
    expect(source.includes("pathStackForLedger(pathState, ledgerId)")).toBe(
      true,
    );
    expect(source.includes('useState<string[]>([""])')).toBe(false);
  });
});

import fs from "fs";
import path from "path";
import { addEntriesSucceeded } from "../add-entries-result";

/**
 * When adding entries invalidates the ledger's cached views. This file used to
 * destructure hand-built tuples and assert they came back unchanged; the
 * decision now lives in a module the hook uses and this file imports.
 */
describe("addEntriesSucceeded", () => {
  it("counts only a payload that reports success as a write", () => {
    expect(
      addEntriesSucceeded({ data: { addEntries: { success: true } } }),
    ).toBe(true);
  });

  it("treats a rejection reported in the payload as no write", () => {
    expect(
      addEntriesSucceeded({ data: { addEntries: { success: false } } }),
    ).toBe(false);
    expect(addEntriesSucceeded({ data: { addEntries: null } })).toBe(false);
    expect(addEntriesSucceeded({ data: null })).toBe(false);
    expect(addEntriesSucceeded({})).toBe(false);
  });

  it("gates the hook's ledger invalidation", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "use-add-entries-to-remote.ts"),
      "utf8",
    );
    const gate = source.indexOf("if (addEntriesSucceeded(result)) {");
    expect(gate === -1).toBe(false);
    expect(source.indexOf("invalidateLedgerData(client", gate) > gate).toBe(
      true,
    );
  });
});

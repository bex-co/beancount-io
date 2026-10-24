import type { BeancountError } from "@rustledger/wasm";
import { toBeancountErrorsPublic } from "../ledger-data-mappers";

// w21/188: the engine marks a one-posting entry and closing an account with a
// balance as warnings while bean-check passes; the DTO dropped that.
const raw = (severity: BeancountError["severity"], message: string) =>
  ({
    message,
    code: "E3004",
    phase: "validate",
    hint: null,
    file: "main.bean",
    line: 90,
    column: 1,
    end_line: null,
    end_column: null,
    severity,
  }) as BeancountError;

describe("toBeancountErrorsPublic severity", () => {
  it("keeps a warning a warning and everything else an error", () => {
    expect(
      toBeancountErrorsPublic([
        raw("warning", "Transaction has only one posting"),
        raw("error", "Transaction does not balance"),
      ]).map((error) => error.severity),
    ).toEqual(["warning", "error"]);
  });
});

// w21/901: errors came phase by phase, an option error on line 2 listed last.
describe("toBeancountErrorsPublic order", () => {
  const at = (message: string, file: string | null, line: number | null) =>
    ({ ...raw("error", message), file, line }) as BeancountError;

  it("lists errors by file and line, those without a location last", () => {
    expect(
      toBeancountErrorsPublic([
        at("plugin", "main.bean", 27),
        at("nowhere", null, null),
        at("other", "other.bean", 1),
        at("first", "main.bean", 9),
        at("option", "main.bean", 2),
        at("same line, later", "main.bean", 9),
      ]).map((error) => error.message),
    ).toEqual([
      "option",
      "first",
      "same line, later",
      "plugin",
      "other",
      "nowhere",
    ]);
  });
});

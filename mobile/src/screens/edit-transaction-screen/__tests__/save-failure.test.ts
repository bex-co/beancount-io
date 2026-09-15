import fs from "fs";
import path from "path";
import { selectSaveFailure } from "../save-failure";

describe("selectSaveFailure", () => {
  it("treats a stale checksum or a conflict as a conflict", () => {
    expect(selectSaveFailure("sha256sum mismatch: the entry changed")).toEqual({
      kind: "conflict",
    });
    expect(selectSaveFailure("HTTP 409 Conflict")).toEqual({
      kind: "conflict",
    });
  });

  it("keeps the server's own explanation for any other rejection", () => {
    expect(selectSaveFailure("Invalid beancount: unexpected token")).toEqual({
      kind: "rejected",
      message: "Invalid beancount: unexpected token",
    });
    expect(selectSaveFailure(undefined)).toEqual({
      kind: "rejected",
      message: null,
    });
  });
});

/**
 * Static guardrail over the screen, which the unit runner cannot render: a
 * conflict shows the translated message and offers a reload rather than the
 * raw server text.
 */
describe("Edit Transaction save-failure wiring", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "edit-transaction-screen.tsx"),
    "utf8",
  );

  it("reports a conflict with editConflict and offers Reload", () => {
    expect(source.includes("selectSaveFailure(")).toBe(true);
    expect(source.includes('setSaveError(t("editConflict"))')).toBe(true);
    expect(source.includes("onPress: () => void handleReload()")).toBe(true);
  });
});

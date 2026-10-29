import fs from "fs";
import path from "path";
import {
  saveToastMessage,
  selectOutcomeFailure,
  selectSaveFailure,
} from "../save-failure";

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

// The edit that re-dates FARMERS MARKET past its balance assertion is refused
// (w21/m1); Edit Transaction shows what it would break inline.
describe("selectOutcomeFailure", () => {
  const i18n = {
    t: (key: string, params?: Record<string, string>) =>
      key === "ledgerWouldBreak"
        ? `This would add an error to your ledger: ${params?.detail}`
        : key,
  };
  const BALANCE_FAILED =
    "Balance failed for Assets:Cash: expected 49.75 USD, got 73.25 USD (main.bean:87)";

  it("names what a refused edit would break", () => {
    const error = Object.assign(
      new Error(
        `Validation failed for entry: this edit would introduce 1 new bean-check error: ${BALANCE_FAILED}`,
      ),
      {
        graphQLErrors: [
          {
            message: "Validation failed",
            extensions: {
              code: "VALIDATION_FAILED",
              field: "entry",
              newLedgerErrors: BALANCE_FAILED,
            },
          },
        ],
      },
    );
    expect(
      selectOutcomeFailure(
        { ok: false, message: "Couldn't save", error },
        i18n,
      ),
    ).toEqual({
      kind: "rejected",
      message: `This would add an error to your ledger: ${BALANCE_FAILED}`,
    });
  });

  it("still recognizes a stale checksum from the server's message", () => {
    expect(
      selectOutcomeFailure(
        {
          ok: false,
          message: "Couldn't save",
          error: new Error("sha256sum mismatch: the entry changed"),
        },
        i18n,
      ),
    ).toEqual({ kind: "conflict" });
  });

  // An entry changed elsewhere no longer resolves by its content hash, so the
  // save is answered NOT_FOUND, not as a checksum conflict (w21/028).
  it("offers Reload when the entry changed elsewhere", () => {
    const changed = Object.assign(new Error("Ledger resource not found"), {
      graphQLErrors: [
        {
          message: "Ledger resource not found",
          extensions: { code: "NOT_FOUND" },
        },
      ],
    });
    expect(
      selectOutcomeFailure(
        { ok: false, message: "Couldn't save", error: changed },
        i18n,
      ),
    ).toEqual({ kind: "conflict" });
  });

  it("falls back to the toast copy when the error says nothing", () => {
    expect(
      selectOutcomeFailure({ ok: false, message: "Couldn't save" }, i18n),
    ).toEqual({ kind: "rejected", message: "Couldn't save" });
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

  // w21/693: a plain Reload after a conflict could only adopt another slice
  // under the ID, so the alert offers Copy & Reload, which keeps the text.
  it("reports a conflict with editConflict and offers Copy & Reload only", () => {
    expect(source.includes("selectOutcomeFailure(outcome, i18n, {")).toBe(true);
    expect(source.includes('setSaveError(t("editConflict"))')).toBe(true);
    expect(source.includes("onPress: () => void handleReload()")).toBe(false);
  });

  // w21/817: Keep Editing could never save and Reload dropped the draft.
  it("offers to copy the draft before reloading, as the Files editor does", () => {
    const flat = source.replace(/\s+/g, "");
    const alert = flat.slice(
      flat.indexOf('Alert.alert("",t("editConflict"),['),
    );
    expect(
      alert.startsWith(
        'Alert.alert("",t("editConflict"),[{text:t("ledgerEditorKeepEditing"),style:"cancel"},{text:t("ledgerEditorCopyReload"),onPress:()=>voidcopyThenReload(content),},',
      ),
    ).toBe(true);
    const copy = flat.slice(flat.indexOf("constcopyThenReload=useCallback("));
    expect(
      copy.includes(
        "constcurrent=recoveryRef.current.latest()||content;try{awaitClipboard.setStringAsync(current);}catch{",
      ),
    ).toBe(true);
    // Reloading only once the text is kept.
    expect(
      copy.includes(
        'Alert.alert(t("ledgerEditorCopyFailed"));return;}awaithandleReload();',
      ),
    ).toBe(true);
  });
});

describe("Edit Transaction reload of an entry that is gone", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "edit-transaction-screen.tsx"),
    "utf8",
  );

  it("shows the changed-or-removed state and refreshes the lists", () => {
    expect(source.includes("if (!isEntryGone(error)) return;")).toBe(true);
    expect(source.includes("setEntryGone(true);")).toBe(true);
    expect(source.includes('message={t("transactionDetailRemoved")}')).toBe(
      true,
    );
    expect(
      source.includes('void invalidateLedgerData(client, "entries");'),
    ).toBe(true);
  });
});

// w21/507: a refused edit showed its refusal twice, once in the banner in
// editor terms and once in the toast with the file's line citation.
describe("saveToastMessage", () => {
  const i18n = {
    t: (key: string, params?: Record<string, string>) =>
      key === "ledgerWouldBreak"
        ? `This would add an error to your ledger: ${params?.detail}`
        : key,
  };
  const refusal = Object.assign(new Error("Validation failed for entry: x"), {
    graphQLErrors: [
      {
        message: "Validation failed",
        extensions: {
          code: "VALIDATION_FAILED",
          field: "entry",
          newLedgerErrors: "Balance failed for Assets:Cash (main.bean:87)",
        },
      },
    ],
  });

  it("says only that the save failed for a refusal the banner explains", () => {
    expect(saveToastMessage(refusal, i18n, "Couldn't save")).toBe(
      "Couldn't save",
    );
  });

  it("leaves any other failure to its own toast copy", () => {
    expect(saveToastMessage(new Error("boom"), i18n, "Couldn't save")).toBe(
      undefined,
    );
  });

  it("is what Edit Transaction's save passes as its failure toast", () => {
    const source = fs
      .readFileSync(
        path.join(__dirname, "..", "edit-transaction-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      source.includes(
        'failureMessageFor:(error)=>saveToastMessage(error,i18n,t("editFailed")),',
      ),
    ).toBe(true);
  });
});

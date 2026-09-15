import fs from "fs";
import path from "path";
import { isTransactionDraftDirty, TransactionDraft } from "../draft-dirty";

const seeded: TransactionDraft = {
  date: "2026-09-13",
  payee: "",
  narration: "",
  postings: [
    { account: "Assets:Bank:Checking", amountInput: "0.00" },
    { account: "Expenses:Internet", amountInput: "0.00" },
  ],
};

const edited = (changes: Partial<TransactionDraft>): TransactionDraft => ({
  ...seeded,
  ...changes,
});

describe("isTransactionDraftDirty", () => {
  it("lets an untouched draft close without asking", () => {
    expect(isTransactionDraftDirty(seeded, edited({}))).toBe(false);
  });

  it("asks once an amount is typed", () => {
    expect(
      isTransactionDraftDirty(
        seeded,
        edited({
          postings: [
            { account: "Assets:Bank:Checking", amountInput: "4321" },
            { account: "Expenses:Internet", amountInput: "-4321.00" },
          ],
        }),
      ),
    ).toBe(true);
  });

  it("asks when only the payee, narration, or date changed", () => {
    expect(isTransactionDraftDirty(seeded, edited({ payee: "Comcast" }))).toBe(
      true,
    );
    expect(
      isTransactionDraftDirty(seeded, edited({ narration: "September" })),
    ).toBe(true);
    expect(
      isTransactionDraftDirty(seeded, edited({ date: "2026-09-12" })),
    ).toBe(true);
  });

  it("asks when a posting was added, removed, or moved to another account", () => {
    const [first, second] = seeded.postings;
    expect(
      isTransactionDraftDirty(
        seeded,
        edited({
          postings: [first, second, { account: "", amountInput: "0.00" }],
        }),
      ),
    ).toBe(true);
    expect(isTransactionDraftDirty(seeded, edited({ postings: [first] }))).toBe(
      true,
    );
    expect(
      isTransactionDraftDirty(
        seeded,
        edited({ postings: [first, { ...second, account: "Expenses:Phone" }] }),
      ),
    ).toBe(true);
  });
});

/**
 * Static guardrail over the screen, which the unit runner cannot render: Back
 * on a dirty draft must ask first, and a successful Done — which leaves the
 * screen itself — must not.
 */
describe("New Transaction discard guard", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "multi-postings-transaction-screen.tsx"),
    "utf8",
  );

  it("asks before a dirty draft is removed, with the shared unsaved-changes strings", () => {
    expect(source.includes('addListener("beforeRemove"')).toBe(true);
    expect(source.includes("savedOutRef.current || !hasUnsavedChanges")).toBe(
      true,
    );
    expect(source.includes('t("ledgerEditorUnsavedTitle")')).toBe(true);
    expect(source.includes('t("ledgerEditorDiscardChanges")')).toBe(true);
    expect(source.includes("isTransactionDraftDirty(")).toBe(true);
  });

  it("marks a saved draft before leaving, so Done never raises the prompt", () => {
    const save = source.slice(
      source.indexOf("const handleSave = async"),
      source.indexOf("const pickAccountForPosting"),
    );
    expect(save.includes("goBackOnSuccess: false")).toBe(true);
    const marked = save.indexOf("savedOutRef.current = true");
    const leaves = save.indexOf("router.back()");
    expect(marked !== -1 && leaves !== -1 && marked < leaves).toBe(true);
  });
});

/**
 * A delete the server refuses because it would break a balance assertion
 * (w21/m1) must leave the user on the entry with the refusal readable. The
 * toast alone lasted two seconds; the dialog stays until dismissed.
 *
 * Relative requires: the runner has no `@/` alias for value imports.
 */
import {
  describeLedgerRefusal,
  ledgerWriteFailureMessage,
} from "../../../common/ledger-refusal";
import {
  runLedgerWrite,
  type LedgerWriteSpec,
} from "../../../common/ledger-write";
import { en } from "../../../translations/en";
import { classifyStaleDelete, deleteTransaction } from "../delete-transaction";

const BALANCE_FAILED =
  "Balance failed for Assets:Cash: expected 49.75 USD, got 73.25 USD (main.bean:84)";
const refused = Object.assign(
  new Error(
    `Validation failed for entry: this deletion would introduce 1 new bean-check error: ${BALANCE_FAILED}`,
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
const i18n = {
  t: (key: string, params?: Record<string, string>) =>
    key === "ledgerWouldBreak"
      ? `This would add an error to your ledger: ${params?.detail}`
      : key,
};

function harness(
  perform: () => Promise<unknown>,
  options: { withStale?: boolean } = {},
) {
  const record = {
    toasts: [] as string[],
    backs: 0,
    refreshed: 0,
    dialogs: [] as { title: string; message: string }[],
    stale: [] as string[],
  };
  const run = deleteTransaction({
    confirmWrite: (spec: LedgerWriteSpec<unknown>) =>
      runLedgerWrite(
        {
          showToast: (message) => {
            record.toasts.push(message);
            return () => undefined;
          },
          haptics: { success: () => undefined, error: () => undefined },
          goBack: () => {
            record.backs += 1;
          },
          describeRefusal: (error) => describeLedgerRefusal(error, i18n),
        },
        spec,
      ),
    perform,
    describeFailure: (error) => ledgerWriteFailureMessage(error, i18n),
    showRefusal: (title, message) => record.dialogs.push({ title, message }),
    messages: {
      loading: "Deleting...",
      success: "Transaction deleted",
      failure: "Failed to delete transaction",
      changed: "This transaction was changed elsewhere. It has been reloaded.",
    },
    afterSuccess: () => {
      record.refreshed += 1;
    },
    ...(options.withStale
      ? {
          onStale: async (kind) => {
            record.stale.push(kind);
          },
        }
      : {}),
  });
  return { run, record };
}

describe("deleteTransaction", () => {
  it("keeps the entry on screen and shows a refusal in a dialog", async () => {
    const { run, record } = harness(async () => {
      throw refused;
    });

    expect(await run).toBe(false);
    expect(record.dialogs).toEqual([
      {
        title: "Failed to delete transaction",
        message: `This would add an error to your ledger: ${BALANCE_FAILED}`,
      },
    ]);
    expect(record.toasts.includes("Transaction deleted")).toBe(false);
    expect(record.backs).toBe(0);
    expect(record.refreshed).toBe(0);
  });

  // w21/117: transport text showed raw, in English, as if the ledger refused.
  it("shows a lost connection as unconfirmed, not as nothing saved", async () => {
    const { run, record } = harness(async () => {
      throw new Error("Network request failed");
    });

    expect(await run).toBe(false);
    expect(record.dialogs[0]?.message).toBe("ledgerWriteUnconfirmed");
  });

  it("confirms, refreshes and returns on success with no dialog", async () => {
    const { run, record } = harness(async () => ({ data: {} }));

    expect(await run).toBe(true);
    expect(record.dialogs).toEqual([]);
    expect(record.toasts.includes("Transaction deleted")).toBe(true);
    expect(record.backs).toBe(1);
    expect(record.refreshed).toBe(1);
  });
});

// w21/197: with no feedback a user repeated Delete, and the second reported
// "couldn't delete" after the first had succeeded.
describe("delete feedback and repeats", () => {
  it("shows Deleting… while the delete runs", async () => {
    const { run, record } = harness(async () => ({ data: {} }));
    await run;
    expect(record.toasts[0]).toBe("Deleting...");
  });

  it("runs once however often the menu item is chosen", async () => {
    const screen = require("fs").readFileSync(
      require("path").join(__dirname, "..", "transaction-detail-screen.tsx"),
      "utf8",
    ) as string;
    const compact = screen.replace(/\s+/g, "");
    expect(compact.includes("||deleteFlight.busy())return;")).toBe(true);
    expect(
      compact.includes("voiddeleteFlight.run(()=>deleteTransaction({"),
    ).toBe(true);
    expect(compact.includes("disabled={deleting}")).toBe(true);
  });
});

// w21/119: the session ended under the delete; Welcome says why, and an alert
// on top read as a raw "OAuth grant is no longer valid".
describe("deleteTransaction when the session ends", () => {
  it("shows no dialog or error toast for UNAUTHENTICATED", async () => {
    const { run, record } = harness(async () => {
      throw Object.assign(new Error("Authentication required"), {
        graphQLErrors: [
          {
            message: "Authentication required",
            extensions: { code: "UNAUTHENTICATED" },
          },
        ],
      });
    });
    expect(await run).toBe(false);
    expect(record.dialogs).toEqual([]);
    // Only the "Deleting..." progress toast, dismissed when the delete ends.
    expect(record.toasts.filter((toast) => toast !== "Deleting...")).toEqual(
      [],
    );
  });

  it("shows no dialog for a refresh the server refused for good", async () => {
    const { run, record } = harness(async () => {
      throw Object.assign(new Error("Response not successful"), {
        networkError: Object.assign(
          new Error("OAuth grant is no longer valid"),
          {
            terminal: true,
          },
        ),
      });
    });
    expect(await run).toBe(false);
    expect(record.dialogs).toEqual([]);
  });
});

// w21/250: an entry changed elsewhere is answered NOT_FOUND (its content hash
// moved) or a conflict (its slice checksum), and every retry failed the same
// way with a bare "Failed to delete transaction".
describe("deleting an entry that changed elsewhere", () => {
  const gone = Object.assign(new Error("Ledger resource not found"), {
    graphQLErrors: [
      { message: "not found", extensions: { code: "NOT_FOUND" } },
    ],
  });

  it("reloads a removed entry and leaves it to its own state, with no dialog", async () => {
    const { run, record } = harness(
      async () => {
        throw gone;
      },
      { withStale: true },
    );
    expect(await run).toBe(false);
    expect(record.stale).toEqual(["gone"]);
    expect(record.dialogs).toEqual([]);
    expect(record.backs).toBe(0);
    // w21/385: no red toast over the screen that already explains it.
    expect(record.toasts.filter((toast) => toast !== "Deleting...")).toEqual(
      [],
    );
  });

  it("reloads on a checksum conflict and says to delete it again", async () => {
    const { run, record } = harness(
      async () => {
        throw new Error("sha does not match the file's current revision");
      },
      { withStale: true },
    );
    expect(await run).toBe(false);
    expect(record.toasts.filter((toast) => toast !== "Deleting...")).toEqual(
      [],
    );
    expect(record.stale).toEqual(["conflict"]);
    expect(record.dialogs).toEqual([
      {
        title: "Failed to delete transaction",
        message:
          "This transaction was changed elsewhere. It has been reloaded.",
      },
    ]);
  });

  it("treats any other failure as before", async () => {
    const { run, record } = harness(
      async () => {
        throw new Error("Network request failed");
      },
      { withStale: true },
    );
    expect(await run).toBe(false);
    expect(record.stale).toEqual([]);
    // A genuine failure still toasts (w21/385).
    expect(record.toasts.includes("ledgerWriteUnconfirmed")).toBe(true);
    expect(record.dialogs[0]?.message).toBe("ledgerWriteUnconfirmed");
  });

  it("classifies the two codes and nothing else", () => {
    expect(classifyStaleDelete(gone)).toBe("gone");
    expect(classifyStaleDelete(new Error("409 conflict"))).toBe("conflict");
    expect(classifyStaleDelete(new Error("boom"))).toBe(null);
    expect(classifyStaleDelete(undefined)).toBe(null);
  });

  it("is wired to reload the entry on the detail screen", () => {
    const source = require("fs")
      .readFileSync(
        require("path").join(__dirname, "..", "transaction-detail-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(source.includes("onStale:async()=>{")).toBe(true);
    expect(source.includes("awaitrefetchContext().catch(()=>undefined);")).toBe(
      true,
    );
    expect(source.includes('changed:t("deleteTransactionChanged")')).toBe(true);
  });
});

// w21/694: after a conflicting delete the screen reads "changed or removed" and
// has no Delete, so the alert must not tell the user to try deleting again.
describe("the changed-elsewhere delete alert", () => {
  it("sends the user back to reopen the entry, not to retry", () => {
    expect(/try deleting/i.test(en.deleteTransactionChanged)).toBe(false);
    expect(/open it again/i.test(en.deleteTransactionChanged)).toBe(true);
  });
});

// w21/254: VoiceOver called the transaction detail's menu "Details", the same
// word as the screen's section heading.
describe("the transaction detail's menu button", () => {
  it("is labelled by what it holds, not by the section heading's word", () => {
    const source = require("fs")
      .readFileSync(
        require("path").join(__dirname, "..", "transaction-detail-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      source.includes(
        '<MenuButtonaccessibilityLabel={t("transactionActions")}',
      ),
    ).toBe(true);
    expect(
      source.includes('<MenuButtonaccessibilityLabel={t("details")}'),
    ).toBe(false);
    const { en } = require("../../../translations/en");
    expect(en.transactionActions).toBe("Transaction actions");
    expect(en.transactionActions === en.details).toBe(false);
  });
});

// w21/387: a refused delete whose text happened to contain "sha", "409" or
// "conflict" was reported as "changed elsewhere".
describe("a refused delete that names Shares", () => {
  const detail =
    "Balance failed for Assets:Brokerage:Shares: expected 409.00 USD, got 73.25 USD (main.bean:1409)";
  const shares = Object.assign(
    new Error(`Validation failed for entry: ${detail}`),
    {
      graphQLErrors: [
        {
          message: "Validation failed",
          extensions: {
            code: "VALIDATION_FAILED",
            field: "entry",
            newLedgerErrors: detail,
          },
        },
      ],
    },
  );

  it("is not classified as stale", () => {
    expect(classifyStaleDelete(shares)).toBe(null);
    expect(classifyStaleDelete(new Error(detail))).toBe(null);
  });

  it("shows the refusal reason, not the changed-elsewhere dialog", async () => {
    const { run, record } = harness(
      async () => {
        throw shares;
      },
      { withStale: true },
    );
    expect(await run).toBe(false);
    expect(record.stale).toEqual([]);
    expect(record.dialogs).toEqual([
      {
        title: "Failed to delete transaction",
        message: `This would add an error to your ledger: ${detail}`,
      },
    ]);
  });
});

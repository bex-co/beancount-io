import {
  describeLedgerRefusal,
  ledgerWriteFailureMessage,
} from "../ledger-refusal";
import { runLedgerWrite, type LedgerWriteDeps } from "../ledger-write";

// A write that would add bean-check errors is refused as VALIDATION_FAILED,
// each new error named in `extensions.newLedgerErrors` (w0/m2). The app shows
// what it would break instead of a generic failure.
const refusal = (extensions: Record<string, unknown>) =>
  Object.assign(new Error("Validation failed for entries"), {
    graphQLErrors: [{ message: "Validation failed", extensions }],
  });
const wouldBreak = (named: string) =>
  refusal({
    code: "VALIDATION_FAILED",
    field: "entries",
    newLedgerErrors: named,
  });
const DUPLICATE_OPEN =
  "Duplicate open directive for Assets:Cash (main.bean:74)";
const i18n = {
  t: (key: string, params?: Record<string, string>) =>
    key === "ledgerWouldBreak" ? `Would break: ${params?.detail}` : key,
};

describe("describeLedgerRefusal", () => {
  it("names the error a refused write would add", () => {
    expect(describeLedgerRefusal(wouldBreak(DUPLICATE_OPEN), i18n)).toBe(
      `Would break: ${DUPLICATE_OPEN}`,
    );
  });

  it("keeps several named errors together, on either write path", () => {
    expect(
      describeLedgerRefusal(
        refusal({
          code: "VALIDATION_FAILED",
          field: "text",
          newLedgerErrors: "A (main.bean:1); B (main.bean:2)",
        }),
        i18n,
      ),
    ).toBe("Would break: A (main.bean:1); B (main.bean:2)");
  });

  it("ignores other refusals and failures", () => {
    expect(
      describeLedgerRefusal(
        refusal({ code: "VALIDATION_FAILED", field: "username" }),
        i18n,
      ),
    ).toBe(null);
    expect(
      describeLedgerRefusal(
        refusal({ code: "BAD_USER_INPUT", newLedgerErrors: DUPLICATE_OPEN }),
        i18n,
      ),
    ).toBe(null);
    expect(
      describeLedgerRefusal(
        refusal({ code: "VALIDATION_FAILED", newLedgerErrors: "  " }),
        i18n,
      ),
    ).toBe(null);
    expect(
      describeLedgerRefusal(new Error("Network request failed"), i18n),
    ).toBe(null);
    expect(describeLedgerRefusal(undefined, i18n)).toBe(null);
  });
});

describe("runLedgerWrite with a refusal it can describe", () => {
  const deps = (toasts: string[]): LedgerWriteDeps => ({
    showToast: (message) => {
      toasts.push(message);
      return () => undefined;
    },
    haptics: { success: () => undefined, error: () => undefined },
    goBack: () => undefined,
    describeRefusal: (error) => describeLedgerRefusal(error, i18n),
  });
  const failWith = (error: unknown) => async () => {
    throw error;
  };

  it("toasts what the write would break instead of the generic failure", async () => {
    const toasts: string[] = [];
    const outcome = await runLedgerWrite(deps(toasts), {
      perform: failWith(wouldBreak(DUPLICATE_OPEN)),
      successMessage: "Saved",
      failureMessage: "Could not save",
    });
    expect(outcome.ok).toBe(false);
    expect(toasts).toEqual([`Would break: ${DUPLICATE_OPEN}`]);
  });

  it("keeps the generic failure for anything else", async () => {
    const toasts: string[] = [];
    await runLedgerWrite(deps(toasts), {
      perform: failWith(new Error("Network request failed")),
      successMessage: "Saved",
      failureMessage: "Could not save",
    });
    expect(toasts).toEqual(["Could not save"]);
  });

  it("lets a screen's own failure copy win", async () => {
    const toasts: string[] = [];
    await runLedgerWrite(deps(toasts), {
      perform: failWith(wouldBreak(DUPLICATE_OPEN)),
      successMessage: "Saved",
      failureMessage: "Could not save",
      failureMessageFor: () => "Delete failed: entry changed",
    });
    expect(toasts).toEqual(["Delete failed: entry changed"]);
  });
});

// Open Account and Add Budget show the failure inline rather than through
// runLedgerWrite's toast.
describe("ledgerWriteFailureMessage", () => {
  it("describes a would-break refusal", () => {
    expect(ledgerWriteFailureMessage(wouldBreak(DUPLICATE_OPEN), i18n)).toBe(
      `Would break: ${DUPLICATE_OPEN}`,
    );
  });

  // w21/117: transport text reached the screen raw, in English, as if the
  // ledger had refused the write. w21/351: a dropped connection looks the same
  // as an offline one and the write may have committed, so only a failure
  // before the request left says nothing was saved.
  it("says nothing was saved only for a write that never left", () => {
    expect(
      ledgerWriteFailureMessage(new Error("OAuth refresh failed"), i18n),
    ).toBe(i18n.t("ledgerWriteOffline"));
    expect(
      ledgerWriteFailureMessage(
        Object.assign(new Error("Network request failed"), {
          networkError: new Error("OAuth refresh failed"),
        }),
        i18n,
      ),
    ).toBe(i18n.t("ledgerWriteOffline"));
  });

  it("cannot confirm a write whose connection failed", () => {
    expect(
      ledgerWriteFailureMessage(new Error("Network request failed"), i18n),
    ).toBe(i18n.t("ledgerWriteUnconfirmed"));
    expect(ledgerWriteFailureMessage(new Error("Failed to fetch"), i18n)).toBe(
      i18n.t("ledgerWriteUnconfirmed"),
    );
    expect(
      ledgerWriteFailureMessage(
        Object.assign(new Error("Network request failed"), {
          networkError: new Error("Network request failed"),
        }),
        i18n,
      ),
    ).toBe(i18n.t("ledgerWriteUnconfirmed"));
  });

  // w21/327: a response means the server was reached, so a gateway 5xx may have
  // committed the write; "Nothing was saved" invited a duplicate.
  it("says the save is unconfirmed for any non-2xx response, not offline", () => {
    const respondedWith = (status: number) =>
      Object.assign(new Error("Response not successful"), {
        networkError: Object.assign(
          new Error(`Received status code ${status}`),
          {
            statusCode: status,
          },
        ),
      });
    for (const status of [400, 413, 500, 502, 504]) {
      expect(ledgerWriteFailureMessage(respondedWith(status), i18n)).toBe(
        i18n.t("ledgerWriteUnconfirmed"),
      );
    }
    // Carried only in the text, as a thrown error from the link has it.
    expect(
      ledgerWriteFailureMessage(
        Object.assign(new Error("Response not successful"), {
          networkError: new Error("Received status code 502"),
        }),
        i18n,
      ),
    ).toBe(i18n.t("ledgerWriteUnconfirmed"));
    expect(i18n.t("ledgerWriteUnconfirmed")).not.toBe(
      i18n.t("ledgerWriteOffline"),
    );
  });

  it("keeps a ledger validation's own text", () => {
    const refused = Object.assign(new Error("Transaction does not balance"), {
      graphQLErrors: [
        {
          message: "Transaction does not balance",
          extensions: { code: "UNBALANCED" },
        },
      ],
    });
    expect(ledgerWriteFailureMessage(refused, i18n)).toBe(
      "Transaction does not balance",
    );
  });

  // w21/858: the server's hop to the ledger service timed out, in a 200 reply.
  it("says an internal or unavailable failure on a write is unconfirmed", () => {
    for (const code of ["SERVICE_UNAVAILABLE", "INTERNAL_SERVER_ERROR"]) {
      const failed = Object.assign(new Error("Service unavailable"), {
        graphQLErrors: [{ message: "x", extensions: { code } }],
      });
      expect(ledgerWriteFailureMessage(failed, i18n)).toBe(
        i18n.t("ledgerWriteUnconfirmed"),
      );
    }
  });

  it("names rate limiting, and leaves anything else to the screen", () => {
    const limited = Object.assign(new Error("Too many requests"), {
      graphQLErrors: [
        { message: "Too many requests", extensions: { code: "RATE_LIMITED" } },
      ],
    });
    expect(ledgerWriteFailureMessage(limited, i18n)).toBe(
      i18n.t("ledgerWriteRateLimited"),
    );
    expect(
      ledgerWriteFailureMessage(new Error("Internal server error"), i18n),
    ).toBe(null);
  });

  it("returns null when there is nothing to say, so the screen's copy shows", () => {
    expect(ledgerWriteFailureMessage("boom", i18n)).toBe(null);
  });
});

// w21/351: New Transaction said "Failed to save" for a dropped connection; the
// shared write hook now words every write failure through this module.
describe("useLedgerWrite", () => {
  it("describes a failed write with ledgerWriteFailureMessage", () => {
    const fs = require("fs");
    const path = require("path");
    const src = fs
      .readFileSync(
        path.join(__dirname, "../hooks/use-ledger-write.ts"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      src.includes(
        "describeRefusal:(error)=>ledgerWriteFailureMessage(error,i18n)",
      ),
    ).toBe(true);
  });
});

// w21/369: the refusal cited lines of the file (often the next entry's) that the
// editor does not show, and repeated the same parse error.
describe("a refusal read in the editor's terms", () => {
  const words = {
    t: (key: string, params?: Record<string, string>) =>
      key === "ledgerWouldBreak"
        ? `Would break: ${params?.detail}`
        : key === "ledgerRefusalLine"
          ? `line ${params?.line}`
          : key === "ledgerRefusalQuoteHint"
            ? "HINT"
            : key === "ledgerRefusalNearEntry"
              ? "near this entry"
              : key,
  };
  const parse =
    'parse error: unexpected "J" in transaction header (2024.bean:7); ' +
    "parse error: unexpected input (2024.bean:7); " +
    "parse error: unexpected input (2024.bean:7); " +
    "parse error: unexpected input (2024.bean:7)";
  const where = { filename: "2024.bean", lineno: 7, lineCount: 3 };

  it("shows each message once", () => {
    expect(describeLedgerRefusal(wouldBreak(parse), words)).toBe(
      'Would break: parse error: unexpected "J" in transaction header (2024.bean:7); parse error: unexpected input (2024.bean:7)',
    );
  });

  it("names the editor's line for a line inside the entry", () => {
    expect(describeLedgerRefusal(wouldBreak(parse), words, { where })).toBe(
      'Would break: parse error: unexpected "J" in transaction header (line 1); parse error: unexpected input (line 1)',
    );
    expect(
      describeLedgerRefusal(
        wouldBreak("Transaction does not balance (2024.bean:9)"),
        words,
        { where },
      ),
    ).toBe("Would break: Transaction does not balance (line 3)");
  });

  // w21/464: the hint was glued on with a bare space.
  it("ends the refusal before the quote hint", () => {
    const draft = '2024-03-05 * "Shop" "Dinner at "Joe\'s""\n';
    const refusal = describeLedgerRefusal(
      wouldBreak("parse errors in main.bean"),
      words,
      { draft },
    );
    expect(refusal).toBe("Would break: parse errors in main.bean. HINT");
    // A message that already ends a sentence is not given a second stop.
    const stopped = describeLedgerRefusal(
      wouldBreak("parse error: bad quote."),
      words,
      { draft },
    );
    expect(stopped).toBe("Would break: parse error: bad quote. HINT");
  });

  it("says near this entry for a line just outside it", () => {
    for (const line of [6, 10, 12]) {
      expect(
        describeLedgerRefusal(
          wouldBreak(`parse error: unexpected input (2024.bean:${line})`),
          words,
          { where },
        ),
      ).toBe("Would break: parse error: unexpected input (near this entry)");
    }
  });

  // w21/619: a far-away balance assertion, or another file, was "near this
  // entry", and since w21/507 its real location appeared nowhere.
  it("keeps the location of a line far from the entry or in another file", () => {
    expect(
      describeLedgerRefusal(
        wouldBreak("Balance failed for Assets:Cash (2024.bean:87)"),
        words,
        { where },
      ),
    ).toBe("Would break: Balance failed for Assets:Cash (2024.bean:87)");
    expect(
      describeLedgerRefusal(
        wouldBreak("Duplicate open directive (main.bean:7)"),
        words,
        { where },
      ),
    ).toBe("Would break: Duplicate open directive (main.bean:7)");
  });

  it("suggests escaping a quote when the header's quotes do not pair up", () => {
    const hinted = (draft: string) =>
      describeLedgerRefusal(wouldBreak(parse), words, { where, draft }) ?? "";
    expect(
      hinted('2024-03-05 * "Shop" "Dinner at "Joe\'s""\n').endsWith(" HINT"),
    ).toBe(true);
    expect(hinted('2024-03-05 * "Shop" "Dinner\\"\n').endsWith(" HINT")).toBe(
      true,
    );
    expect(
      hinted('2024-03-05 * "Shop" "Dinner at \\"Joe\\""\n').endsWith(" HINT"),
    ).toBe(false);
    // Not for an error that is not a parse error.
    expect(
      describeLedgerRefusal(
        wouldBreak("Transaction does not balance (2024.bean:9)"),
        words,
        { where, draft: '2024-03-05 * "Shop" "x' },
      )!.endsWith("HINT"),
    ).toBe(false);
  });

  it("is what Edit Transaction reports", () => {
    const fs = require("fs");
    const path = require("path");
    const src = fs
      .readFileSync(
        path.join(
          __dirname,
          "../../screens/edit-transaction-screen/edit-transaction-screen.tsx",
        ),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      src.includes("selectOutcomeFailure(outcome,i18n,{draft:content,"),
    ).toBe(true);
  });
});

// w21/659: the ledger's entry-token refusal reached the screen as English API
// text naming wire fields ("entry 0: postings[0].account … is not a valid
// account") in every language.
describe("ledgerWriteFailureMessage with a token refusal", () => {
  const named = {
    t: (key: string, params?: Record<string, string>) =>
      `${key}(${params?.value ?? ""})`,
  };
  const badInput = (message: string) =>
    Object.assign(new Error(message), {
      graphQLErrors: [{ message, extensions: { code: "BAD_USER_INPUT" } }],
    });

  it("names the value of each kind, not its field", () => {
    const cases: [string, string][] = [
      [
        'entry 0: postings[0].account "Assets:Bank:x y" is not a valid account',
        "ledgerInvalidAccount(Assets:Bank:x y)",
      ],
      [
        'entry 0: postings[1].units.currency "usd" is not a valid currency',
        "ledgerInvalidCurrency(usd)",
      ],
      ['entry 0: tags[0] "旅行" is not a valid tag', "ledgerInvalidTag(旅行)"],
      ['entry 2: links[0] "a b" is not a valid link', "ledgerInvalidLink(a b)"],
      [
        'entry 0: postings[0].flag "%" is not a valid flag: the ledger engine cannot read a "%" flag yet, and would drop the posting; use another flag',
        "ledgerInvalidFlag(%)",
      ],
      [
        'entry 0: flag "\'X" is not a valid transaction flag',
        "ledgerInvalidFlag('X)",
      ],
      [
        'entry 0: account "Assets:\\"Q\\"" is not a valid account',
        'ledgerInvalidAccount(Assets:"Q")',
      ],
    ];
    for (const [message, expected] of cases) {
      expect(ledgerWriteFailureMessage(badInput(message), named)).toBe(
        expected,
      );
    }
  });

  it("shows the generic failure for a kind it has no words for", () => {
    expect(
      ledgerWriteFailureMessage(
        badInput('entry 0: meta.Key "Key" is not a valid metadata key'),
        named,
      ),
    ).toBe(null);
  });

  it("keeps the ledger's text for any other bad input", () => {
    expect(
      ledgerWriteFailureMessage(
        badInput("entry 0: renders as more than one directive"),
        named,
      ),
    ).toBe("entry 0: renders as more than one directive");
  });
});

// w21/620: the server's single-entry check (w23/036) put API wording ("newContent
// must be one dated directive", "use updateLedgerFiles") on the Edit banner.
describe("ledgerWriteFailureMessage with a single-entry refusal", () => {
  const keyed = { t: (key: string) => key };
  const badInput = (message: string) =>
    Object.assign(new Error(message), {
      graphQLErrors: [{ message, extensions: { code: "BAD_USER_INPUT" } }],
    });

  it("is the app's own copy, without API names", () => {
    const cases: [string, string][] = [
      [
        "newContent must be one dated directive: Assets:Cash -23.50 USD",
        "ledgerEntryIndent",
      ],
      [
        "newContent holds 2 entries; edit them one at a time or use updateLedgerFiles",
        "ledgerEntryOneAtATime",
      ],
      [
        "newContent holds no entry; remove the entry with deleteEntrySource instead",
        "editTransactionEmpty",
      ],
      // w21/814: an indented date line is not an empty entry.
      [
        `newContent's date line is indented; a dated directive starts at column zero: 2026-10-20 * "Qa20261020 Cafe" "Lunch"`,
        "ledgerEntryDateIndented",
      ],
      [
        '`option` configures the ledger and is not an entry; change it with updateLedgerFiles: option "title" "x"',
        "ledgerEntryNotAnEntry",
      ],
    ];
    for (const [message, expected] of cases) {
      expect(ledgerWriteFailureMessage(badInput(message), keyed)).toBe(
        expected,
      );
    }
  });

  it("leaves other bad input as the server wrote it", () => {
    expect(
      ledgerWriteFailureMessage(badInput("limit must be positive"), keyed),
    ).toBe("limit must be positive");
  });
});

// w21/935: every offline delete said "The server didn't confirm the save".
describe("ledgerWriteFailureMessage for a delete", () => {
  const offline = new Error("Network request failed");

  it("says the delete, never the save, when the connection drops after it went out", () => {
    expect(ledgerWriteFailureMessage(offline, i18n, undefined, "delete")).toBe(
      "ledgerDeleteUnconfirmed",
    );
    expect(
      ledgerWriteFailureMessage(
        Object.assign(new Error("Response not successful"), {
          networkError: new Error("Received status code 502"),
        }),
        i18n,
        undefined,
        "delete",
      ),
    ).toBe("ledgerDeleteUnconfirmed");
  });

  it("says nothing was deleted when it failed before the request went out", () => {
    expect(
      ledgerWriteFailureMessage(offline, i18n, undefined, "delete-unsent"),
    ).toBe("ledgerDeleteOffline");
  });

  it("keeps the save wording for a save", () => {
    expect(ledgerWriteFailureMessage(offline, i18n)).toBe(
      "ledgerWriteUnconfirmed",
    );
  });

  it("is worded for a delete in every language", () => {
    const { en } = require("../../translations/en");
    expect(en.ledgerDeleteOffline).toBe("You're offline. Nothing was deleted.");
    expect(en.ledgerDeleteUnconfirmed.includes("save")).toBe(false);
  });

  it("is what the budget, transaction and file deletes ask for", () => {
    const fs = require("fs");
    const path = require("path");
    const read = (...parts: string[]) =>
      fs
        .readFileSync(path.join(__dirname, "..", "..", ...parts), "utf8")
        .replace(/\s+/g, "");
    expect(
      read(
        "screens",
        "budget-screen",
        "hooks",
        "use-delete-budget-entry.ts",
      ).includes('sent?"delete":"delete-unsent"'),
    ).toBe(true);
    expect(
      read(
        "screens",
        "transaction-detail-screen",
        "transaction-detail-screen.tsx",
      ).includes('ledgerWriteFailureMessage(e,i18n,undefined,"delete")'),
    ).toBe(true);
    expect(
      read("screens", "ledger-file-browser-screen", "index.tsx").includes(
        'ledgerWriteFailureMessage(deleteError,{t},undefined,"delete",)',
      ),
    ).toBe(true);
  });
});

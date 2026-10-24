import { translationLocales } from "../../../translations/__tests__/locale-parity";
import {
  classifyCreateLedgerError,
  LEDGER_DESCRIPTION_MAX,
  setupTitle,
  createRequestFingerprint,
  generateDefaultLedgerName,
  isNewCreateRequest,
  isNewLedgerName,
  isRequestIdReuse,
  ledgerSlugPreview,
  slugifyLedgerName,
} from "../ledger-name";

describe("slugifyLedgerName", () => {
  it("lowercases, replaces spaces, and strips invalid characters", () => {
    expect(slugifyLedgerName("My Book!")).toBe("my-book");
    expect(slugifyLedgerName("  Hello__World  ")).toBe("hello__world");
    expect(slugifyLedgerName("---")).toBe("");
  });
});

describe("ledgerSlugPreview", () => {
  it("previews a name the slugifier changes", () => {
    expect(ledgerSlugPreview("My Book!")).toBe("my-book");
  });

  it("shows nothing when the name needs no change", () => {
    expect(ledgerSlugPreview("my-book")).toBe(null);
    expect(ledgerSlugPreview("")).toBe(null);
  });

  // w21/477: the server takes only lowercase, so a name differing in case alone
  // is created under another name than it was typed.
  it("previews a name that differs from its slug in case alone", () => {
    expect(ledgerSlugPreview("MyBook")).toBe("mybook");
    expect(ledgerSlugPreview("Family")).toBe("family");
    expect(ledgerSlugPreview("My-Book")).toBe("my-book");
    expect(ledgerSlugPreview("HOUSEHOLD_2026")).toBe("household_2026");
    // Surrounding spaces are not part of the name.
    expect(ledgerSlugPreview("  my-book  ")).toBe(null);
  });

  it("shows nothing when the name slugifies away, instead of a dangling hint", () => {
    expect(ledgerSlugPreview("!!!")).toBe(null);
    expect(ledgerSlugPreview("---")).toBe(null);
    expect(ledgerSlugPreview("@@@")).toBe(null);
  });
});

describe("generateDefaultLedgerName", () => {
  it("starts at my-book and increments past collisions", () => {
    expect(generateDefaultLedgerName([])).toBe("my-book");
    expect(generateDefaultLedgerName(["my-book"])).toBe("my-book-1");
    expect(generateDefaultLedgerName(["my-book", "my-book-1"])).toBe(
      "my-book-2",
    );
  });
});

describe("classifyCreateLedgerError", () => {
  it("maps name conflicts and tier limits", () => {
    expect(
      classifyCreateLedgerError(
        new Error("A ledger with the name 'x' already exists."),
      ),
    ).toBe("conflict");
    expect(
      classifyCreateLedgerError({
        graphQLErrors: [{ extensions: { code: "RESOURCE_LIMIT_REACHED" } }],
      }),
    ).toBe("tier");
    expect(classifyCreateLedgerError(new Error("network down"))).toBe("other");
  });
});

// w21/437: every CONFLICT was the name's, though a create still running under
// the same requestId answers CONFLICT too.
describe("a CONFLICT from createLedger", () => {
  const conflict = (message: string, extensions: Record<string, unknown>) => ({
    graphQLErrors: [
      { message, extensions: { code: "CONFLICT", ...extensions } },
    ],
  });

  it("is the name's error only for a name clash", () => {
    expect(
      classifyCreateLedgerError(
        conflict("Ledger conflict: Name already exists", {
          reasonCode: "LEDGER_NAME_ALREADY_EXISTS",
          field: "name",
        }),
      ),
    ).toBe("conflict");
    expect(
      classifyCreateLedgerError(conflict("Ledger conflict", { field: "name" })),
    ).toBe("conflict");
  });

  it("is still creating when the first attempt has not finished", () => {
    const message =
      "Ledger creation conflict: A creation with this requestId is still in progress";
    expect(classifyCreateLedgerError(conflict(message, {}))).toBe("creating");
    expect(classifyCreateLedgerError(new Error(message))).toBe("creating");
  });

  it("is neither for a conflict that says nothing about a name", () => {
    expect(
      classifyCreateLedgerError(conflict("Entry conflict: stale hash", {})),
    ).toBe("other");
  });
});

describe("Sample-only template payload", () => {
  it("omits template for Starter and sends SAMPLE for Sample", () => {
    const buildVariables = (template: "STARTER" | "SAMPLE") => ({
      name: "my-book",
      private: true,
      ...(template === "SAMPLE" ? { template: "SAMPLE" } : {}),
    });
    expect(buildVariables("STARTER")).toEqual({
      name: "my-book",
      private: true,
    });
    expect(buildVariables("SAMPLE")).toEqual({
      name: "my-book",
      private: true,
      template: "SAMPLE",
    });
  });
});

// w21/434: a resumed draft lost its amount, so its next create was a different
// request under the old id, and the server refused it for a day.
describe("a create request's id", () => {
  const request = (amount: string) => ({
    name: "household",
    private: true,
    setup: { accounts: [{ name: "Assets:Bank", amount }] },
  });

  it("is told apart by what the request sends", () => {
    const first = createRequestFingerprint(request("1250.00"));
    expect(createRequestFingerprint(request("1250.00"))).toBe(first);
    expect(createRequestFingerprint(request("1300.00"))).not.toBe(first);
    expect(createRequestFingerprint(request("1250.00").setup)).not.toBe(first);
  });

  it("is kept for the same request and replaced for a changed one", () => {
    const sent = createRequestFingerprint(request("1250.00"));
    // Nothing sent yet: the id is the first request's.
    expect(isNewCreateRequest(undefined, sent)).toBe(false);
    // A retry of the same request stays idempotent.
    expect(isNewCreateRequest(sent, sent)).toBe(false);
    // A resumed draft with a retyped amount is a request of its own.
    expect(
      isNewCreateRequest(sent, createRequestFingerprint(request("99.00"))),
    ).toBe(true);
  });

  it("recognises the server's refusal of a reused id", () => {
    const refusal =
      "requestId was already used with a different creation request";
    expect(isRequestIdReuse(new Error(refusal))).toBe(true);
    expect(isRequestIdReuse({ graphQLErrors: [{ message: refusal }] })).toBe(
      true,
    );
    expect(isRequestIdReuse(new Error("Name conflict"))).toBe(false);
    expect(isRequestIdReuse(null)).toBe(false);
  });

  it("is minted again by the screen when the request changes", () => {
    const source = require("fs")
      .readFileSync(
        require("path").join(__dirname, "..", "create-ledger-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "") as string;
    expect(
      source.includes(
        "if(isNewCreateRequest(sentFingerprintRef.current,fingerprint)){requestIdRef.current=newRequestId();",
      ),
    ).toBe(true);
    expect(source.includes("if(isRequestIdReuse(error)){")).toBe(true);
  });
});

describe("the Review step", () => {
  const source = require("fs")
    .readFileSync(
      require("path").join(__dirname, "..", "create-ledger-screen.tsx"),
      "utf8",
    )
    .replace(/\s+/g, "") as string;

  it("shows the name the ledger will get, and whether it is private (w21/477)", () => {
    expect(
      source.includes('{slugifyLedgerName(nameValue??"")||nameValue}'),
    ).toBe(true);
    expect(source.includes("{slugPreview||nameValue}")).toBe(false);
    expect(
      source.includes(
        '{privateValue?t("createLedgerPrivate"):t("createLedgerPublic")}',
      ),
    ).toBe(true);
  });

  it("has the visibility words in every language", () => {
    const fs = require("fs");
    const dir = require("path").join(__dirname, "../../../translations");
    const missing = (fs.readdirSync(dir) as string[])
      .filter((name) => /^[a-z]{2}\.ts$/.test(name))
      .filter(
        (name) =>
          !fs
            .readFileSync(require("path").join(dir, name), "utf8")
            .includes("createLedgerPublic:"),
      );
    expect(missing).toEqual([]);
  });
});

// w21/547: "___" slugified to something, so the form passed it and the server
// refused it (backend-v2's NEW_LEDGER_NAME_PATTERN wants a letter or digit).
describe("isNewLedgerName", () => {
  it("refuses a name with no letter or digit once slugified", () => {
    for (const name of ["___", "_", "_-", "!!_", "  _  ", "-_-"]) {
      expect(isNewLedgerName(name)).toBe(false);
    }
  });

  it("accepts what the server creates", () => {
    for (const name of ["a", "My Book!", "2026", "_a", "a_", "Hello__World"]) {
      expect(isNewLedgerName(name)).toBe(true);
    }
  });

  it("agrees with the server's pattern on the slug", () => {
    // The server's `NEW_LEDGER_NAME_PATTERN`, restated here to pin the client.
    const server = /^(?=[a-z0-9_-]*[a-z0-9])[a-z0-9_]+(?:-[a-z0-9_]+)*$/;
    for (const name of ["x-", "a--b", "a-b", "__", "_x_", "---", "9"]) {
      expect(isNewLedgerName(name)).toBe(server.test(slugifyLedgerName(name)));
    }
  });
});

// w21/566: a renamed ledger's former name is reserved, not taken by a ledger the
// list does not show.
describe("classifyCreateLedgerError for a reserved name", () => {
  const failure = (reasonCode: string, message: string) =>
    Object.assign(new Error(message), {
      graphQLErrors: [
        {
          message,
          extensions: { code: "CONFLICT", reasonCode, field: "name" },
        },
      ],
    });

  it("is its own kind, whatever the message says", () => {
    expect(
      classifyCreateLedgerError(
        failure(
          "LEDGER_NAME_RESERVED",
          "Ledger resource conflict: 'books-a' is the former name of alice/books-b. Choose a different name.",
        ),
      ),
    ).toBe("reserved");
  });

  it("leaves a name that exists a conflict", () => {
    expect(
      classifyCreateLedgerError(
        failure("LEDGER_NAME_ALREADY_EXISTS", "Choose a different name."),
      ),
    ).toBe("conflict");
  });

  it("is worded in every language", () => {
    for (const locale of translationLocales()) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const catalog = require(`../../../translations/${locale}`)[locale];
      expect(typeof catalog.createLedgerNameReserved).toBe("string");
      expect(catalog.createLedgerNameReserved).not.toBe(
        catalog.createLedgerNameConflict,
      );
    }
  });
});

// w21/949: a description over 2048 characters failed Create with advice to retry.
describe("a ledger description over the server's limit", () => {
  it("is classified as the description's error, not a general one", () => {
    expect(
      classifyCreateLedgerError(
        new Error("A ledger description can be at most 2048 characters"),
      ),
    ).toBe("description");
    expect(
      classifyCreateLedgerError({
        graphQLErrors: [
          {
            message: "A ledger description can be at most 2048 characters",
            extensions: { code: "BAD_USER_INPUT" },
          },
        ],
      }),
    ).toBe("description");
    expect(classifyCreateLedgerError(new Error("boom"))).toBe("other");
  });

  it("is checked in the form, with its field error, and returns to the form step", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs
      .readFileSync(
        path.join(__dirname, "..", "create-ledger-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(LEDGER_DESCRIPTION_MAX).toBe(2048);
    expect(source.includes("[...value].length<=LEDGER_DESCRIPTION_MAX")).toBe(
      true,
    );
    expect(source.includes("maxLength={LEDGER_DESCRIPTION_MAX}")).toBe(true);
    expect(
      source.includes(
        'if(kind==="description"){//Thedescription\'serrorrendersontheformsteptoo.setError("description",{message:t("createLedgerDescriptionMaxLength"),});setStep(FORM_STEP);return;}',
      ),
    ).toBe(true);
  });
});

// w21/950: a name pasted with a tab or newline was refused as the setup's title.
describe("setupTitle", () => {
  it("turns control characters into spaces and trims the ends", () => {
    expect(setupTitle("Family\tBudget")).toBe("Family Budget");
    expect(setupTitle("Household\n")).toBe("Household");
    expect(setupTitle("  Family  ")).toBe("Family");
    expect(setupTitle("A\r\n\tB")).toBe("A B");
  });

  it("never holds a control character or a padded end", () => {
    for (const name of ["x\u0000y", "\u0007bell", "a\u001fb\n", "\t\t"]) {
      const title = setupTitle(name);
      expect(/\p{Cc}/u.test(title)).toBe(false);
      expect(title).toBe(title.trim());
    }
  });

  it("is what the setup sends as its title", () => {
    const source = require("fs")
      .readFileSync(
        require("path").join(__dirname, "..", "create-ledger-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(source.includes("title:setupTitle(values.name),")).toBe(true);
  });
});

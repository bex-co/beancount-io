import type { BeancountError } from "@rustledger/wasm";
import { reportUrlIncludes } from "../url-include-errors";

/**
 * Engine-shaped errors, captured live from `@rustledger/wasm` 0.21.0: a URL
 * include is joined to the including file's directory, its `//` normalized to
 * `/`, and the result reported missing with no source location.
 */
function readFailure(path: string): BeancountError {
  return {
    message: `failed to read file ${path}: file not found in virtual filesystem: ${path}`,
    code: "LOAD",
    phase: "parse",
    hint: null,
    file: null,
    line: null,
    column: null,
    end_line: null,
    end_column: null,
    severity: "error",
  };
}

const ORIGINS = ["https://beancount.io"];
const UNAVAILABLE =
  "managed price source is unavailable; no validated price feed could be fetched yet (see the ledger's managed price status)";
const notAllowed = (detail: string): string =>
  `not an allowed managed price source (${detail}); include targets must be paths inside the ledger repository or an allowed managed price URL`;
/** A scheme followed by a single slash, e.g. `https:/host`. */
const COLLAPSED_SCHEME = /[a-z]:\/(?!\/)/iu;

describe("reportUrlIncludes", () => {
  it("quotes a URL include as written and points at its line", () => {
    const files = {
      "main.bean":
        '2020-01-01 open Assets:Cash USD\ninclude "https://beancount.io/prices/BTC-USD"\n',
    };
    const [error] = reportUrlIncludes(
      [readFailure("https:/beancount.io/prices/BTC-USD")],
      files,
      "main.bean",
      ORIGINS,
    );

    expect(error).toEqual({
      ...readFailure("https:/beancount.io/prices/BTC-USD"),
      message: `include "https://beancount.io/prices/BTC-USD": ${UNAVAILABLE}`,
      file: "main.bean",
      line: 2,
    });
    expect(COLLAPSED_SCHEME.test(error.message)).toBe(false);
  });

  it("matches a URL included from a nested file under the engine's joined path", () => {
    const files = {
      "main.bean": 'include "books/prices.bean"\n',
      "books/prices.bean": 'include "s3://bucket/prices.bean"\n',
    };
    const [error] = reportUrlIncludes(
      [readFailure("books/s3:/bucket/prices.bean")],
      files,
      "main.bean",
      ORIGINS,
    );

    expect([error.message, error.file, error.line]).toEqual([
      `include "s3://bucket/prices.bean": ${notAllowed("origin s3://bucket is not an allowed managed price source")}`,
      "books/prices.bean",
      1,
    ]);
  });

  // w21/189: a missing plain include read "failed to read file X: file not
  // found in virtual filesystem: X", with no file or line.
  it("locates a missing repository include and quotes it as written", () => {
    const files = {
      "main.bean":
        '2020-01-01 open Assets:Cash USD\ninclude "qa-missing.bean"\n',
    };
    const [error] = reportUrlIncludes(
      [readFailure("qa-missing.bean")],
      files,
      "main.bean",
      ORIGINS,
    );
    expect([error.message, error.file, error.line]).toEqual([
      "Included file not found: qa-missing.bean",
      "main.bean",
      2,
    ]);
    expect(error.message.includes("virtual filesystem")).toBe(false);
  });

  it("names a nested include as written, not as the engine resolved it", () => {
    const files = {
      "main.bean": 'include "books/jan.bean"\n',
      "books/jan.bean": 'include "../typo.bean"\n',
    };
    const [error] = reportUrlIncludes(
      [readFailure("typo.bean")],
      files,
      "main.bean",
      ORIGINS,
    );
    expect([error.message, error.file, error.line]).toEqual([
      "Included file not found: ../typo.bean",
      "books/jan.bean",
      1,
    ]);
  });

  it("leaves other errors, and a missing file nothing includes, untouched", () => {
    const other = { ...readFailure("x"), code: "E1001", message: "other" };
    const stray = readFailure("not-included.bean");
    const files = { "main.bean": 'include "typo.bean"\n' };
    const out = reportUrlIncludes([other, stray], files, "main.bean", ORIGINS);

    expect(out[0]).toBe(other);
    expect(out[1]).toBe(stray);
  });

  it("returns the engine's errors as they are when nothing is included", () => {
    const errors = [readFailure("typo.bean")];
    expect(
      reportUrlIncludes(errors, { "main.bean": "" }, "main.bean", ORIGINS),
    ).toBe(errors);
  });

  it("says why a URL on an allowed origin is still not a managed price source", () => {
    const files = {
      "main.bean":
        'include "https://beancount.io/prices/BTC-USD?from=2026-01-01"\ninclude "https://beancount.io/catalog"\n',
    };
    const out = reportUrlIncludes(
      [
        readFailure("https:/beancount.io/prices/BTC-USD?from=2026-01-01"),
        readFailure("https:/beancount.io/catalog"),
      ],
      files,
      "main.bean",
      ORIGINS,
    );
    expect(out.map((error) => error.message)).toEqual([
      `include "https://beancount.io/prices/BTC-USD?from=2026-01-01": ${notAllowed("a managed price URL must not carry a query string or fragment")}`,
      `include "https://beancount.io/catalog": ${notAllowed("the path must be /prices/<ALIAS> (letters, digits, . _ -)")}`,
    ]);
  });

  // w21/772: every error for a target went to its first include in the
  // repository, so a second include was never pointed to, and a file the
  // ledger does not read could be blamed.
  it("gives each include of a missing file its own error", () => {
    const twice = reportUrlIncludes(
      [readFailure("qa-missing.bean"), readFailure("qa-missing.bean")],
      { "main.bean": 'include "qa-missing.bean"\ninclude "qa-missing.bean"\n' },
      "main.bean",
      ORIGINS,
    );
    expect(twice.map((error) => [error.file, error.line])).toEqual([
      ["main.bean", 1],
      ["main.bean", 2],
    ]);
    const nested = reportUrlIncludes(
      [readFailure("qa-missing.bean"), readFailure("qa-missing.bean")],
      {
        "main.bean": 'include "sub.bean"\ninclude "qa-missing.bean"\n',
        "sub.bean": '2020-01-01 open Assets:Cash\ninclude "qa-missing.bean"\n',
      },
      "main.bean",
      ORIGINS,
    );
    expect(nested.map((error) => [error.file, error.line]).sort()).toEqual([
      ["main.bean", 2],
      ["sub.bean", 2],
    ]);
  });

  it("never blames a file the ledger does not read", () => {
    const [error] = reportUrlIncludes(
      [readFailure("qa-missing.bean")],
      {
        "archive/old.bean": 'include "../qa-missing.bean"\n',
        "main.bean": '2020-01-01 open Assets:Cash\ninclude "qa-missing.bean"\n',
      },
      "main.bean",
      ORIGINS,
    );
    expect([error.file, error.line]).toEqual(["main.bean", 2]);
  });

  it("reports every URL as disallowed when managed prices are disabled", () => {
    const files = {
      "main.bean": 'include "https://beancount.io/prices/BTC-USD"\n',
    };
    const [error] = reportUrlIncludes(
      [readFailure("https:/beancount.io/prices/BTC-USD")],
      files,
      "main.bean",
      [],
    );
    expect(error.message).toBe(
      `include "https://beancount.io/prices/BTC-USD": ${notAllowed("managed price includes are disabled on this server")}`,
    );
  });
});

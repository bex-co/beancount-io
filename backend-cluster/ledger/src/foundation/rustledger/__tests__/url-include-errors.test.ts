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

const REMOTE_NOT_SUPPORTED =
  "include targets must be paths inside the ledger repository; remote URLs are not supported";
/** A scheme followed by a single slash, e.g. `https:/host`. */
const COLLAPSED_SCHEME = /[a-z]:\/(?!\/)/iu;

describe("reportUrlIncludes", () => {
  it("quotes a URL include as written and points at its line", () => {
    const files = {
      "main.bean":
        '2020-01-01 open Assets:Cash USD\ninclude "https://beancount.io/prices/BTCUSD"\n',
    };
    const [error] = reportUrlIncludes(
      [readFailure("https:/beancount.io/prices/BTCUSD")],
      files,
    );

    expect(error).toEqual({
      ...readFailure("https:/beancount.io/prices/BTCUSD"),
      message: `include "https://beancount.io/prices/BTCUSD": ${REMOTE_NOT_SUPPORTED}`,
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
    );

    expect([error.message, error.file, error.line]).toEqual([
      `include "s3://bucket/prices.bean": ${REMOTE_NOT_SUPPORTED}`,
      "books/prices.bean",
      1,
    ]);
  });

  it("leaves a missing repository include and other errors untouched", () => {
    const missing = readFailure("typo.bean");
    const other = { ...readFailure("x"), code: "E1001", message: "other" };
    const files = {
      "main.bean": 'include "typo.bean"\ninclude "https://example.com/a"\n',
    };
    const out = reportUrlIncludes([missing, other], files);

    expect(out[0]).toBe(missing);
    expect(out[1]).toBe(other);
  });

  it("returns the engine's errors as they are when no include is a URL", () => {
    const errors = [readFailure("typo.bean")];
    expect(
      reportUrlIncludes(errors, { "main.bean": 'include "typo.bean"\n' }),
    ).toBe(errors);
  });
});

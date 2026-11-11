import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { describe, expect, it } from "vitest";
import {
  existingNameFor,
  portablePathKey,
  portableTwinOf,
} from "../portable-path-key";

/**
 * The server refuses a path that differs from an existing one only by letter
 * case, Unicode form or an invisible character (w21/770). The dashboard
 * checks the same rule before a write, and names the twin after one (w2/113).
 */
describe("portable path key", () => {
  const folder = ["main.bean", "\u00e9.bean", "books"];

  it.each([
    ["Main.bean", "main.bean"],
    ["MAIN.BEAN", "main.bean"],
    ["ma\u200bin.bean", "main.bean"],
    ["main.bean\ufeff", "main.bean"],
    // NFD "e" + combining acute beside the composed "\u00e9".
    ["e\u0301.bean", "\u00e9.bean"],
    ["\u00c9.BEAN", "\u00e9.bean"],
    ["Books", "books"],
  ])("finds %j as a twin of %s", (name, twin) => {
    expect(existingNameFor(name, folder)).toBe(twin);
  });

  it("prefers the exact spelling and finds nothing for a new name", () => {
    expect(existingNameFor("main.bean", ["Main.bean", "main.bean"])).toBe(
      "main.bean",
    );
    expect(existingNameFor("new.bean", folder)).toBeNull();
    expect(existingNameFor("main.beans", folder)).toBeNull();
  });

  it("matches backend-v2's key", () => {
    expect(portablePathKey("Re\u0301\u00adceipts/MA\u2060IN.bean")).toBe(
      "r\u00e9ceipts/main.bean",
    );
  });

  const conflict = (message: string, code = "CONFLICT") =>
    new CombinedGraphQLErrors({ errors: [{ message, extensions: { code } }] });

  it("reads the existing path from the server's twin refusal", () => {
    expect(
      portableTwinOf(
        conflict("File conflict: Main.bean already exists as main.bean"),
      ),
    ).toBe("main.bean");
    expect(
      portableTwinOf(
        conflict("File conflict: Receipts/a.bean already exists as receipts"),
      ),
    ).toBe("receipts");
  });

  it("leaves other conflicts and codes to the generic message", () => {
    expect(
      portableTwinOf(conflict("File conflict: a.bean cannot be created")),
    ).toBeNull();
    expect(
      portableTwinOf(
        conflict("a.bean already exists as A.bean", "BAD_USER_INPUT"),
      ),
    ).toBeNull();
    expect(
      portableTwinOf(conflict("a already exists as b\u001b[0m")),
    ).toBeNull();
    expect(portableTwinOf(new Error("a already exists as b"))).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { Route as LoginRoute } from "../auth.login.index";
import { Route as SignUpRoute } from "../auth.sign-up";
import { Route as BlobRoute } from "../ledger.$ledgerOwner.$ledgerName.files.blob.$branch.$";
import { Route as FilesContentRoute } from "../ledger.$ledgerOwner.$ledgerName.files.content";
import { Route as LegacyUploadRoute } from "../ledger.$ledgerOwner.$ledgerName.files.upload";
import { Route as LegacyCreateRoute } from "../ledger.$ledgerOwner.$ledgerName.files.create";
import { Route as AskRoute } from "../ledger.$ledgerOwner.$ledgerName.ask";
import { Route as QueryRoute } from "../ledger.$ledgerOwner.$ledgerName.query";
import { userProfileSearchSchema } from "@/features/user-profile/lib/search";

/** Run a route's real search validation, function or schema alike. */
function validate(
  validator: unknown,
  search: Record<string, unknown>,
): Record<string, unknown> {
  return typeof validator === "function"
    ? validator(search)
    : (validator as { parse: (v: unknown) => Record<string, unknown> }).parse(
        search,
      );
}

const routes = {
  "/auth/login": [LoginRoute.options.validateSearch, ["next", "reason"]],
  "/auth/sign-up": [
    SignUpRoute.options.validateSearch,
    ["next", "withDefaultLedger", "src", "by"],
  ],
  "files/blob": [BlobRoute.options.validateSearch, ["editMode", "lineNumber"]],
  "files/content": [
    FilesContentRoute.options.validateSearch,
    ["type", "path", "editMode", "lineNumber"],
  ],
  "files/upload": [LegacyUploadRoute.options.validateSearch, ["dirPath"]],
  "files/create": [LegacyCreateRoute.options.validateSearch, ["dirPath"]],
  ask: [AskRoute.options.validateSearch, ["q"]],
  query: [QueryRoute.options.validateSearch, ["query"]],
  profile: [userProfileSearchSchema, ["tab"]],
} as const;

// What TanStack's JSON search parsing hands over for ordinary typos.
const typos: unknown[] = [123, true, [1], { a: 1 }, null, "Misspelled"];

describe("mistyped search values never throw (w3/630)", () => {
  for (const [route, [validator, keys]] of Object.entries(routes)) {
    for (const key of keys) {
      it.each(typos.map((value) => [JSON.stringify(value), value]))(
        `${route} ?${key}=%s`,
        (_label, value) => {
          expect(() => validate(validator, { [key]: value })).not.toThrow();
        },
      );
    }
  }
});

describe("typed spellings read as meant, unusable ones as the default", () => {
  const blob = (search: Record<string, unknown>) =>
    validate(BlobRoute.options.validateSearch, search);

  it.each([
    [1, true],
    ["yes", true],
    ["TRUE", true],
    [0, false],
    ["maybe", undefined],
  ])("editMode=%s is %s", (editMode, expected) => {
    expect(blob({ editMode }).editMode).toBe(expected);
  });

  it.each([
    [12, 12],
    ["12", 12],
    ["12a", undefined],
    [-3, undefined],
  ])("lineNumber=%s is %s", (lineNumber, expected) => {
    expect(blob({ lineNumber }).lineNumber).toBe(expected);
  });

  it("matches enum values without regard to case, dropping unknown ones", () => {
    expect(userProfileSearchSchema.parse({ tab: "Followers" }).tab).toBe(
      "followers",
    );
    expect(userProfileSearchSchema.parse({ tab: "follower" }).tab).toBe(
      undefined,
    );
    expect(
      validate(LoginRoute.options.validateSearch, { reason: "foo" }).reason,
    ).toBe(undefined);
  });

  it("reads a number back as the text typed", () => {
    expect(validate(QueryRoute.options.validateSearch, { query: 123 })).toEqual(
      { query: "123" },
    );
    expect(
      validate(LoginRoute.options.validateSearch, { next: 123 }).next,
    ).toBe("123");
    expect(
      validate(LoginRoute.options.validateSearch, { next: ["x"] }),
    ).toEqual({});
  });

  it("keeps defaults and valid values exactly as before", () => {
    expect(validate(FilesContentRoute.options.validateSearch, {})).toEqual({
      type: "dir",
      path: "",
    });
    expect(
      validate(FilesContentRoute.options.validateSearch, {
        type: "file",
        path: "main.bean",
        editMode: true,
        lineNumber: 12,
      }),
    ).toEqual({
      type: "file",
      path: "main.bean",
      editMode: true,
      lineNumber: 12,
    });
    expect(blob({ editMode: true, lineNumber: 12 })).toEqual({
      editMode: true,
      lineNumber: 12,
    });
    expect(
      validate(LegacyUploadRoute.options.validateSearch, { dirPath: 123 }),
    ).toEqual({ dirPath: "123" });
  });
});

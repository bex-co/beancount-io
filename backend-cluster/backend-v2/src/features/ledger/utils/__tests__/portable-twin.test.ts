import { ConflictError, NotFoundError } from "@/shared/errors";
import {
  assertNoPortableTwin,
  assertNoTwinsAmong,
  portablePathKey,
} from "../portable-twin";

/**
 * w21/770: "Main" beside main.bean was created, and so were a decomposed
 * "café" beside the composed one and a name with a zero-width space; a clone on
 * macOS or Windows keeps one of each pair.
 */
const repository: Record<string, string[]> = {
  "": [
    "main.bean",
    "qa20261020-notes.bean",
    "qa20261020-caf\u00e9.bean",
    "sub",
  ],
  sub: ["sub/2024.bean"],
};
const list = async (dir: string | undefined) => {
  const entries = repository[dir ?? ""];
  if (entries === undefined) throw new NotFoundError(`Directory '${dir}'`);
  return entries.map((path) => ({ path }));
};
const refusal = (path: string) =>
  assertNoPortableTwin(path, list).then(
    () => null,
    (error: unknown) =>
      error instanceof ConflictError ? error.message : error,
  );

describe("assertNoPortableTwin", () => {
  it("refuses a name an existing file's differs from only by case, form or an invisible character", async () => {
    expect(await refusal("Main.bean")).toBe(
      "File conflict: Main.bean already exists as main.bean",
    );
    expect(await refusal("QA20261020-Notes.bean")).not.toBe(null);
    expect(await refusal("qa20261020-cafe\u0301.bean")).not.toBe(null);
    expect(await refusal("main\u200b.bean")).not.toBe(null);
  });

  it("refuses a folder that differs from one the repository has", async () => {
    expect(await refusal("Sub/notes.bean")).toBe(
      "File conflict: Sub/notes.bean already exists as sub",
    );
    expect(await refusal("sub/2024.BEAN")).not.toBe(null);
  });

  it("leaves a new name, a new folder and an exact one to the create itself", async () => {
    expect(await refusal("notes.bean")).toBe(null);
    expect(await refusal("archive/2023.bean")).toBe(null);
    expect(await refusal("sub/2025.bean")).toBe(null);
    expect(await refusal("main.bean")).toBe(null);
  });
});

describe("assertNoTwinsAmong", () => {
  it("refuses a batch creating two names of one file", () => {
    expect(() => assertNoTwinsAmong(["notes.bean", "Notes.bean"])).toThrow(
      ConflictError,
    );
    expect(() => assertNoTwinsAmong(["a.bean", "b.bean"])).not.toThrow();
    expect(portablePathKey("Cafe\u0301\u200b.Bean")).toBe("caf\u00e9.bean");
  });
});

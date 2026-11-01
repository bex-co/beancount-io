import { probeFailedWrite, type CurrentFile } from "../failed-write-probe";

const b64 = (text: string) => Buffer.from(text).toString("base64");
const files = (table: Record<string, CurrentFile>) => async (path: string) =>
  table[path] ?? null;

describe("probeFailedWrite (w23/072)", () => {
  const update = {
    operation: "update" as const,
    path: "main.bean",
    sha: "old",
    contentBase64: b64("mine"),
  };

  it("reads a file holding the intended bytes as landed, so it is never written twice", async () => {
    await expect(
      probeFailedWrite(
        [update],
        files({ "main.bean": { sha: "new", contentBase64: b64("mine") } }),
      ),
    ).resolves.toBe("landed");
  });

  it("reads a file on another blob without the intended bytes as a lost race", async () => {
    await expect(
      probeFailedWrite(
        [update],
        files({ "main.bean": { sha: "theirs", contentBase64: b64("theirs") } }),
      ),
    ).resolves.toBe("lost-race");
  });

  it("leaves a file still on the sent blob as unchanged: the failure stands", async () => {
    await expect(
      probeFailedWrite(
        [update],
        files({ "main.bean": { sha: "old", contentBase64: b64("old text") } }),
      ),
    ).resolves.toBe("unchanged");
  });

  it("decides nothing for a changed file whose content cannot be read", async () => {
    await expect(
      probeFailedWrite(
        [update],
        files({ "main.bean": { sha: "theirs", contentBase64: null } }),
      ),
    ).resolves.toBe("unchanged");
  });

  it("reads a create over a file that now exists with other content as a lost race", async () => {
    const create = {
      operation: "create" as const,
      path: "new.bean",
      contentBase64: b64("mine"),
    };
    await expect(
      probeFailedWrite(
        [create],
        files({ "new.bean": { sha: "x", contentBase64: b64("theirs") } }),
      ),
    ).resolves.toBe("lost-race");
    await expect(probeFailedWrite([create], files({}))).resolves.toBe(
      "unchanged",
    );
  });

  it("calls a multi-file commit landed only when every file holds its bytes", async () => {
    const other = {
      operation: "update" as const,
      path: "b.bean",
      sha: "b0",
      contentBase64: b64("b mine"),
    };
    const table = {
      "main.bean": { sha: "n", contentBase64: b64("mine") },
      "b.bean": { sha: "b1", contentBase64: b64("b theirs") },
    };
    await expect(probeFailedWrite([update, other], files(table))).resolves.toBe(
      "lost-race",
    );
  });

  it("never calls a delete landed or lost on its own", async () => {
    await expect(
      probeFailedWrite(
        [{ operation: "delete", path: "x.bean", sha: "s" }],
        files({}),
      ),
    ).resolves.toBe("unchanged");
  });
});

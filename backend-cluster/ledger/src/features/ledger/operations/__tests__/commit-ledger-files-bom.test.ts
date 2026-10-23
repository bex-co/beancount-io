import { commitLedgerFiles } from "@/features/ledger/operations/commit-ledger-files";

/**
 * w21/368. A file starting with a UTF-8 byte-order mark: the ledger load drops
 * it, but the commit read kept it, and on line 0 it hid the first entry's date
 * from the block splitter, so that entry could be opened but never saved or
 * deleted.
 */
const BOM = "﻿";
const ENTRY =
  '2024-03-05 * "Shop" "Groceries"\n  Expenses:Food  10 USD\n  Assets:Bank\n';

function clientFor(remote: string | Buffer) {
  const sent: string[] = [];
  const client = {
    repos: {
      repoGetContents: jest.fn(async () => ({
        data: {
          content: Buffer.from(remote).toString("base64"),
          encoding: "base64",
          sha: "blob-1",
        },
      })),
      repoChangeFiles: jest.fn(
        async (
          _o: string,
          _r: string,
          body: { files: Array<{ content: string }> },
        ) => {
          sent.push(
            Buffer.from(body.files[0]!.content, "base64").toString("utf-8"),
          );
        },
      ),
    },
  };
  return { client, sent };
}

const commit = (
  client: unknown,
  transform: (content: string | null) => string,
) =>
  commitLedgerFiles(
    client as never,
    "alice",
    "books",
    new Map([["2024.bean", transform]]),
    "edit",
    { directiveLimit: { exempt: true } },
  );

describe("a file that starts with a byte-order mark", () => {
  it("hands the transform the text without the mark, so line 0 is the entry", async () => {
    const { client } = clientFor(BOM + ENTRY);
    let seen = "";
    await commit(client, (content) => {
      seen = content ?? "";
      return seen;
    });
    expect(seen.startsWith("2024-03-05")).toBe(true);
  });

  it("writes the mark back when the entry is edited", async () => {
    const { client, sent } = clientFor(BOM + ENTRY);
    await commit(client, (content) =>
      (content ?? "").replace("Groceries", "Food"),
    );
    expect(sent).toHaveLength(1);
    expect(sent[0]!.startsWith(BOM + "2024-03-05")).toBe(true);
    expect(sent[0]!.includes('"Food"')).toBe(true);
    expect(sent[0]!.indexOf(BOM)).toBe(sent[0]!.lastIndexOf(BOM));
  });

  it("writes nothing for a transform that changes nothing", async () => {
    const { client, sent } = clientFor(BOM + ENTRY);
    await commit(client, (content) => content ?? "");
    expect(sent).toEqual([]);
  });

  it("leaves a file without a mark as it was", async () => {
    const { client, sent } = clientFor(ENTRY);
    await commit(client, (content) => (content ?? "") + "; end\n");
    expect(sent[0]!.startsWith(BOM)).toBe(false);
    expect(sent[0]!.endsWith("; end\n")).toBe(true);
  });
});

// w21/691: a lenient read wrote each undecodable byte back as U+FFFD.
describe("a file that is not valid UTF-8", () => {
  it("is refused by name, and nothing is committed", async () => {
    const { client, sent } = clientFor(
      Buffer.from("; Caf\xe9 latin-1\n" + ENTRY, "latin1"),
    );
    await expect(
      commit(client, (content) => (content ?? "").replace("Groceries", "Food")),
    ).rejects.toThrow("2024.bean is not valid UTF-8 text");
    expect(sent).toEqual([]);
  });

  it("still edits a valid multibyte file", async () => {
    const { client, sent } = clientFor("; café 咖啡\n" + ENTRY);
    await commit(client, (content) =>
      (content ?? "").replace("Groceries", "Food"),
    );
    expect(sent[0]!.startsWith("; café 咖啡")).toBe(true);
  });
});

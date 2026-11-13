import { directiveToText } from "@/foundation/rustledger/journal-serialize";
import { entryInputToText } from "@/foundation/rustledger/entry-build";
import type { DirectiveJson } from "@rustledger/wasm";

/**
 * w23/238: a `document` or `note` with tags and links was written
 * `#t1#t2^l1^l2`, where stock beancount's `printer.format_entry` prints
 * `#t1 #t2 ^l1 ^l2` and a transaction's header here already did. The expected
 * text below is stock beancount 3.2.3 `printer.format_entry` for the same
 * directives (tags and links given out of order, to pin the sort).
 */
const document = (extra: Record<string, unknown>) =>
  ({
    type: "document",
    date: "2026-11-11",
    account: "Assets:Cash",
    path: "qa.pdf",
    ...extra,
  }) as unknown as DirectiveJson;
const note = (extra: Record<string, unknown>) =>
  ({
    type: "note",
    date: "2026-11-11",
    account: "Assets:Cash",
    comment: "hello",
    ...extra,
  }) as unknown as DirectiveJson;

const tags = ["t2", "t1"];
const links = ["l2", "l1"];

describe("a document's or note's tags and links render as stock beancount prints them", () => {
  it.each([
    [
      "a document with tags and links",
      document({ tags, links }),
      '2026-11-11 document Assets:Cash "qa.pdf" #t1 #t2 ^l1 ^l2\n',
    ],
    [
      "a document with tags only",
      document({ tags }),
      '2026-11-11 document Assets:Cash "qa.pdf" #t1 #t2\n',
    ],
    [
      "a document with links only",
      document({ links }),
      '2026-11-11 document Assets:Cash "qa.pdf" ^l1 ^l2\n',
    ],
    [
      "a document with one tag and one link",
      document({ tags: ["t1"], links: ["l1"] }),
      '2026-11-11 document Assets:Cash "qa.pdf" #t1 ^l1\n',
    ],
    [
      "a document with neither",
      document({}),
      '2026-11-11 document Assets:Cash "qa.pdf"\n',
    ],
    [
      "a note with tags and links",
      note({ tags, links }),
      '2026-11-11 note Assets:Cash "hello" #t1 #t2 ^l1 ^l2\n',
    ],
    [
      "a note with one tag",
      note({ tags: ["t1"] }),
      '2026-11-11 note Assets:Cash "hello" #t1\n',
    ],
  ])("journal text for %s", (_name, directive, expected) => {
    expect(directiveToText(directive)).toBe(expected);
  });

  it("the typed addLedgerEntries path writes a document the same way", () => {
    expect(
      entryInputToText({
        type: "document",
        entry: {
          date: "2026-11-11",
          account: "Assets:Cash",
          filename: "qa.pdf",
          tags,
          links,
        },
      }),
    ).toBe('2026-11-11 document Assets:Cash "qa.pdf" #t1 #t2 ^l1 ^l2\n\n');
  });

  it("every tag and link stays a separate token a lexer can split on", () => {
    const text = directiveToText(document({ tags, links }));
    expect(text.trim().split(" ").slice(-4)).toEqual([
      "#t1",
      "#t2",
      "^l1",
      "^l2",
    ]);
  });
});

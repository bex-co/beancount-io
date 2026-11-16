import type { DirectiveJson } from "@rustledger/wasm";
import {
  keepOwnMetaOverPushed,
  sourceMayShadowPushedMeta,
  withoutMetaStacks,
} from "../pushed-meta";

/**
 * w31/028: inside `pushmeta qa-c: "pushed"`, an entry that writes `qa-c: "own"`
 * keeps `"own"` in Beancount; rustledger 0.24 let the push win. The engine's
 * two parses are scripted here (WASM-free); `yarn verify:rustledger` runs the
 * same fixture through the live engine.
 */
const coffee = (
  payee: string,
  meta?: Record<string, string>,
  date = "2026-09-26",
): DirectiveJson => ({
  type: "transaction",
  date,
  flag: "*",
  payee,
  narration: "coffee",
  tags: [],
  links: [],
  ...(meta === undefined ? {} : { meta }),
  postings: [
    {
      account: "Expenses:Food:Coffee",
      units: { number: "1.00", currency: "USD" },
    },
    { account: "Assets:Cash" },
  ],
});

const FIXTURE = [
  'pushmeta qa-c: "pushed"',
  '2026-09-26 * "PAYEE-C1" "own key"',
  '  qa-c: "own"',
  "  Expenses:Food:Coffee   1.00 USD",
  "  Assets:Cash",
  "popmeta qa-c:",
  "",
].join("\n");

describe("sourceMayShadowPushedMeta", () => {
  it("sees an entry writing a key its file pushes", () => {
    expect(sourceMayShadowPushedMeta({ "main.bean": FIXTURE })).toBe(true);
  });

  it("ignores a push no line of its file writes", () => {
    const pushedOnly = FIXTURE.replace('  qa-c: "own"\n', "");
    expect(sourceMayShadowPushedMeta({ "main.bean": pushedOnly })).toBe(false);
    expect(
      sourceMayShadowPushedMeta({
        "main.bean": pushedOnly,
        "other.bean": '2026-09-26 * "x"\n  qa-c: "own"\n',
      }),
    ).toBe(false);
  });

  it("ignores a file without pushmeta", () => {
    expect(
      sourceMayShadowPushedMeta({
        "main.bean": '2026-09-26 * "x"\n  qa-c: "own"\n',
      }),
    ).toBe(false);
  });
});

describe("withoutMetaStacks", () => {
  it("blanks pushmeta and popmeta line for line and keeps everything else", () => {
    const source = [
      "pushtag #trip",
      'pushmeta qa-c: "pushed" ; why',
      '2026-09-26 * "PAYEE-C1"',
      '  qa-c: "own"',
      "  Assets:Cash",
      "popmeta qa-c:",
      "poptag #trip",
      "",
    ].join("\r\n");
    const blanked = withoutMetaStacks({ "main.bean": source })["main.bean"];
    expect(blanked.split("\n")).toEqual([
      "pushtag #trip\r",
      "",
      '2026-09-26 * "PAYEE-C1"\r',
      '  qa-c: "own"\r',
      "  Assets:Cash\r",
      "",
      "poptag #trip\r",
      "",
    ]);
  });

  it("leaves a pushmeta line inside a string, and a file without stacks, as they are", () => {
    const narration = '2026-09-26 * "PAYEE" "first\npushmeta qa-c: 1\nlast"\n';
    const files = {
      "main.bean": narration,
      "plain.bean": '2026-09-26 * "PAYEE"\n  qa-c: "own"\n  Assets:Cash\n',
    };
    const blanked = withoutMetaStacks(files);
    expect(blanked["main.bean"]).toBe(narration);
    expect(blanked["plain.bean"]).toBe(files["plain.bean"]);
  });
});

describe("keepOwnMetaOverPushed", () => {
  it("gives an entry back the key it writes and keeps a pushed key it does not", () => {
    const own = coffee("PAYEE-C1", { "qa-c": "pushed", "qa-x": "pushed" });
    const bare = coffee("PAYEE-C2", { "qa-c": "pushed" }, "2026-09-27");
    keepOwnMetaOverPushed(
      [own, bare],
      [
        coffee("PAYEE-C1", { "qa-c": "own" }),
        coffee("PAYEE-C2", undefined, "2026-09-27"),
      ],
    );
    expect(own.meta).toEqual({ "qa-c": "own", "qa-x": "pushed" });
    expect(Object.keys(own.meta ?? {})).toEqual(["qa-c", "qa-x"]);
    expect(bare.meta).toEqual({ "qa-c": "pushed" });
  });

  it("matches identical entries by their order, as their entry IDs do", () => {
    const first = coffee("SAME", { "qa-c": "pushed" });
    const second = coffee("SAME", { "qa-c": "pushed" });
    keepOwnMetaOverPushed(
      [first, second],
      [coffee("SAME"), coffee("SAME", { "qa-c": "second" })],
    );
    expect(first.meta).toEqual({ "qa-c": "pushed" });
    expect(second.meta).toEqual({ "qa-c": "second" });
  });

  it("changes nothing when the parses agree", () => {
    const entry = coffee("PAYEE-C1", { "qa-c": "own" });
    const meta = entry.meta;
    keepOwnMetaOverPushed([entry], [coffee("PAYEE-C1", { "qa-c": "own" })]);
    expect(entry.meta).toBe(meta);
    expect(entry.meta).toEqual({ "qa-c": "own" });
  });
});

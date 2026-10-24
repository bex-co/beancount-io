import type { BeancountError } from "@rustledger/wasm";
import { locateParseErrors } from "../parse-errors";

/**
 * w21/187: a syntax error in any file came back as one `LOAD` error per file,
 * "parse errors in main.bean", with no file and no line. The shapes below are
 * the real engine's, checked against rustledger 0.24.
 */
const error = (over: Partial<BeancountError>): BeancountError => ({
  message: "",
  code: null,
  phase: null,
  hint: null,
  file: null,
  line: null,
  column: null,
  end_line: null,
  end_column: null,
  severity: "error",
  ...over,
});
const summary = (file: string) =>
  error({ message: `parse errors in ${file}`, code: "LOAD", phase: "load" });
const located = (file: string, line: number) =>
  error({
    message: `${file}: parse error: unexpected input`,
    code: "P0012",
    phase: "parse",
    file,
    line,
    column: 16,
  });
const warning = error({
  message: "one posting",
  code: "E3002",
  file: "main.bean",
  line: 4,
});

describe("locateParseErrors", () => {
  const engine = {
    parseMultiFile: () => [
      located("main.bean", 5),
      located("2026/jan.bean", 2),
    ],
  };

  it("replaces each summary with the located errors, file prefix dropped", () => {
    const result = locateParseErrors(
      [summary("main.bean"), summary("2026/jan.bean"), warning],
      {},
      "main.bean",
      engine,
    );
    expect(result.map((e) => [e.message, e.file, e.line, e.code])).toEqual([
      ["parse error: unexpected input", "main.bean", 5, "P0012"],
      ["parse error: unexpected input", "2026/jan.bean", 2, "P0012"],
      ["one posting", "main.bean", 4, "E3002"],
    ]);
  });

  it("reads a result shaped { errors }", () => {
    const result = locateParseErrors([summary("main.bean")], {}, "main.bean", {
      parseMultiFile: () => ({ errors: [located("main.bean", 5)] }),
    });
    expect(result.map((e) => e.line)).toEqual([5]);
  });

  it("leaves the errors alone without a summary, a locator or a result", () => {
    const plain = [warning];
    expect(locateParseErrors(plain, {}, "main.bean", engine)).toEqual(plain);
    const summaries = [summary("main.bean")];
    expect(locateParseErrors(summaries, {}, "main.bean", {})).toEqual(
      summaries,
    );
    expect(
      locateParseErrors(summaries, {}, "main.bean", {
        parseMultiFile: () => [],
      }),
    ).toEqual(summaries);
    expect(
      locateParseErrors(summaries, {}, "main.bean", {
        parseMultiFile: () => {
          throw new Error("boom");
        },
      }),
    ).toEqual(summaries);
  });
});

// w21/899: one bad line came back twice with the same message.
describe("locateParseErrors with a repeated error", () => {
  it("keeps one error per file, line and message", () => {
    const result = locateParseErrors([summary("main.bean")], {}, "main.bean", {
      parseMultiFile: () => [
        located("main.bean", 90),
        located("main.bean", 90),
        located("main.bean", 91),
      ],
    });
    expect(result.map((e) => [e.file, e.line])).toEqual([
      ["main.bean", 90],
      ["main.bean", 91],
    ]);
  });
});

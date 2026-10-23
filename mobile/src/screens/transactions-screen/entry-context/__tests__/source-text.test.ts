import fs from "fs";
import path from "path";
import { entryLocationLabel, entrySourceText } from "../source-text";
import { isolatePath, isolateSourceLine } from "../../../../common/bidi";

// w21/864: a Persian folder drew "qa/2026/بانک.bean" for qa/بانک/2026.bean.
describe("entryLocationLabel", () => {
  it("isolates a right-to-left path, root first", () => {
    expect(entryLocationLabel("qa20261020/بانک/2026.bean", 1)).toBe(
      isolatePath("qa20261020/بانک/2026.bean:1"),
    );
  });

  it("leaves an ASCII path as it was", () => {
    expect(entryLocationLabel("main.bean", 94)).toBe("main.bean:94");
  });
});

// w21/865, w21/866: the Source Code block drew a Persian line in the wrong
// order and split a narration at a lone carriage return.
describe("entrySourceText", () => {
  it("isolates each line, so an amount stays after the account", () => {
    const line = "  Assets:Qa20261020Bank:بانک:ملی      100.00 USD";
    expect(entrySourceText(`2026-10-21 * "x"\n${line}\n`)).toBe(
      `${isolateSourceLine('2026-10-21 * "x"')}\n${isolateSourceLine(line)}\n${isolateSourceLine("")}`,
    );
  });

  it("shows a lone carriage return as ␍ on one line", () => {
    const text = entrySourceText('2026-10-21 * "Order 12\r34"\n  A  1 USD');
    expect(text.split("\n").length).toBe(2);
    expect(text.includes("Order 12␍34")).toBe(true);
    expect(text.includes("\r")).toBe(false);
  });

  it("drops the carriage return of a CRLF file's line breaks", () => {
    expect(entrySourceText("a\r\nb")).toBe("a\nb");
  });
});

describe("the Entry Context screen", () => {
  const source = fs
    .readFileSync(path.join(__dirname, "..", "index.tsx"), "utf8")
    .replace(/\s+/g, "");

  it("draws the location and the source through them", () => {
    expect(
      source.includes("{entryLocationLabel(entryFilename,entryLineNumber)}"),
    ).toBe(true);
    expect(source.includes('{entrySourceText(entryContext.slice||"")}')).toBe(
      true,
    );
  });
});

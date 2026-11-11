import { describe, expect, it, vi } from "vitest";
import { isolateRtlText } from "../rtl-isolation";

/** Monaco's Range, by position: (line, startColumn, line, endColumn). */
class Range {
  constructor(
    public startLineNumber: number,
    public startColumn: number,
    public endLineNumber: number,
    public endColumn: number,
  ) {}
}

function fakeEditor(lines: string[]) {
  let content = [...lines];
  const listeners: Array<() => void> = [];
  const decorations = { set: vi.fn(), clear: vi.fn() };
  const editor = {
    getModel: () => ({
      getValue: () => content.join("\n"),
      getLineCount: () => content.length,
      getLineContent: (line: number) => content[line - 1]!,
    }),
    createDecorationsCollection: () => decorations,
    onDidChangeModelContent: (listener: () => void) => {
      listeners.push(listener);
      return { dispose: vi.fn() };
    },
    onDidChangeModel: () => ({ dispose: vi.fn() }),
    onDidDispose: vi.fn(),
  };
  return {
    decorations,
    edit(next: string[]) {
      content = next;
      listeners.forEach((listener) => listener());
    },
    mount() {
      isolateRtlText(editor as never, { Range } as never);
    },
  };
}

/** Entry Context and the file view drew `Assets:Qa:ملی` wrongly (w2/118). */
describe("isolateRtlText", () => {
  it("marks each RTL part of the source with the isolating class", () => {
    const view = fakeEditor([
      "2026-01-01 open Assets:Qa:ملی",
      "  Assets:Qa:ملی   1.00 USD",
      "  Assets:Cash  -1.00 USD",
    ]);
    view.mount();
    expect(view.decorations.set).toHaveBeenLastCalledWith([
      {
        range: new Range(1, 27, 1, 30),
        options: { inlineClassName: "bidi-isolate" },
      },
      {
        range: new Range(2, 13, 2, 16),
        options: { inlineClassName: "bidi-isolate" },
      },
    ]);
  });

  it("follows edits, and clears once no RTL text is left", () => {
    const view = fakeEditor(["  Assets:Cash  -1.00 USD"]);
    view.mount();
    expect(view.decorations.clear).toHaveBeenCalledTimes(1);
    view.edit(["  Assets:Qa:ملی  1.00 USD"]);
    expect(view.decorations.set).toHaveBeenLastCalledWith([
      {
        range: new Range(1, 13, 1, 16),
        options: { inlineClassName: "bidi-isolate" },
      },
    ]);
    view.edit(["  Assets:Cash  -1.00 USD"]);
    expect(view.decorations.clear).toHaveBeenCalledTimes(2);
  });
});

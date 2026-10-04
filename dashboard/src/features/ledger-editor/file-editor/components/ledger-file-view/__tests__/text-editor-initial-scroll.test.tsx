import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const editor = {
  revealLine: vi.fn(),
  revealLineInCenter: vi.fn(),
  setPosition: vi.fn(),
  focus: vi.fn(),
  deltaDecorations: vi.fn(() => []),
  onDidScrollChange: vi.fn(),
  getVisibleRanges: vi.fn(() => []),
  getDomNode: vi.fn(() => null),
  getModel: vi.fn(() => ({
    getLineCount: () => 120,
    getLineMaxColumn: () => 1,
  })),
};

const monaco = {
  Range: class {
    constructor(..._args: number[]) {}
  },
  editor: { setModelLanguage: vi.fn(), setModelMarkers: vi.fn() },
};

vi.mock("@/common/components/monaco-editor", async () => {
  const { useEffect } = await import("react");
  return {
    MonacoEditor: ({
      onMount,
    }: {
      onMount: (editor: unknown, monaco: unknown) => void;
    }) => {
      useEffect(() => onMount(editor, monaco), [onMount]);
      return null;
    },
  };
});

vi.mock("@/common/hooks/use-theme", () => ({ useIsDarkTheme: () => false }));
vi.mock("@/common/lib/editor/monaco-beancount-language-vscode", () => ({
  registerBeancountLanguage: vi.fn(),
}));
vi.mock("@/common/lib/editor/monaco-beancount-actions", () => ({
  registerEditorShortcuts: vi.fn(),
}));

import { TextEditor } from "../text-editor";

describe("TextEditor initial scroll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["main.bean", "accounts.beancount"])(
    "opens the ledger %s at its latest line",
    (filename) => {
      render(<TextEditor content="" filename={filename} readOnly />);
      expect(editor.revealLine).toHaveBeenCalledWith(120);
    },
  );

  it.each(["README.md", "importers/config.py", "notes.txt"])(
    "opens %s at line 1",
    (filename) => {
      render(<TextEditor content="" filename={filename} readOnly />);
      expect(editor.revealLine).not.toHaveBeenCalled();
      expect(editor.setPosition).not.toHaveBeenCalled();
    },
  );

  it("centres a deep-linked line in any file", () => {
    render(
      <TextEditor content="" filename="README.md" lineNumber={42} readOnly />,
    );
    expect(editor.revealLineInCenter).toHaveBeenCalledWith(42);
    expect(editor.revealLine).not.toHaveBeenCalled();
  });

  it("still focuses a non-ledger file opened for editing", () => {
    render(<TextEditor content="" filename="README.md" />);
    expect(editor.focus).toHaveBeenCalled();
    expect(editor.revealLine).not.toHaveBeenCalled();
  });
});

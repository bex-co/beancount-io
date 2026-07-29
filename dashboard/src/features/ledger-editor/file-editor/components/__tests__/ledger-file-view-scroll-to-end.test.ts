import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for the auto-scroll-to-end behavior in the Monaco editor.
 *
 * When no specific lineNumber is provided:
 * - Both read-only and edit modes scroll to the end of the file
 * - Edit mode also sets the cursor position and focuses the editor
 * - Read-only mode only scrolls (no cursor/focus)
 *
 * When a specific lineNumber IS provided:
 * - Both modes scroll to that line (existing behavior, unchanged)
 *
 * Also tests that the onScrollChange listener does NOT cause an early return
 * that would skip the rest of the onMount callback.
 */

// Helper to create a mock Monaco editor
const createMockEditor = (lineCount = 53, lastLineLength = 20) => ({
  getModel: vi.fn(() => ({
    uri: "test",
    getLineCount: vi.fn(() => lineCount),
    getLineMaxColumn: vi.fn((line: number) =>
      line === lineCount ? lastLineLength : 40,
    ),
  })),
  revealLineInCenter: vi.fn(),
  revealLine: vi.fn(),
  setPosition: vi.fn(),
  focus: vi.fn(),
  deltaDecorations: vi.fn(() => ["decoration-1"]),
  getValue: vi.fn(() => "content"),
  getDomNode: vi.fn(() => ({ classList: { add: vi.fn() } })),
  onDidScrollChange: vi.fn(() => ({ dispose: vi.fn() })),
  getVisibleRanges: vi.fn(() => [{ startLineNumber: 1 }]),
});

const createMockMonaco = () => ({
  Range: class {
    constructor(
      public startLine: number,
      public startCol: number,
      public endLine: number,
      public endCol: number,
    ) {}
  },
  editor: {
    setModelLanguage: vi.fn(),
    setTheme: vi.fn(),
    setModelMarkers: vi.fn(),
    getEditors: vi.fn(() => []),
  },
  MarkerSeverity: {
    Hint: 1,
    Info: 2,
    Warning: 4,
    Error: 8,
  },
  languages: {
    register: vi.fn(),
    setMonarchTokensProvider: vi.fn(),
    setLanguageConfiguration: vi.fn(),
    registerFoldingRangeProvider: vi.fn(),
  },
  KeyMod: { CtrlCmd: 2048, Alt: 512 },
  KeyCode: { KeyD: 34, Slash: 85, BracketLeft: 87, BracketRight: 88 },
});

/**
 * Simulates the onMount callback logic from TextEditor component.
 * This mirrors the actual implementation to test behavior without
 * rendering the full component (which requires Monaco Editor).
 */
function simulateOnMount({
  editor,
  monaco,
  lineNumber,
  readOnly,
  onScrollChange,
  errors = [],
}: {
  editor: ReturnType<typeof createMockEditor>;
  monaco: ReturnType<typeof createMockMonaco>;
  lineNumber?: number;
  readOnly: boolean;
  onScrollChange?: (line: number) => void;
  errors?: { lineno: number | null; message: string }[];
}) {
  // Register scroll change listener (should NOT early-return anymore)
  if (onScrollChange) {
    editor.onDidScrollChange(() => {
      const visibleRanges = editor.getVisibleRanges();
      if (visibleRanges.length > 0) {
        const topVisibleLine = visibleRanges[0].startLineNumber;
        onScrollChange(topVisibleLine);
      }
    });
  }

  // Register editor shortcuts (only in edit mode)
  // (skipped in test - not relevant to scroll behavior)

  // Force set language for beancount files
  // (skipped in test - not relevant to scroll behavior)

  // Hide cursor in read-only mode
  if (readOnly) {
    const domNode = editor.getDomNode();
    if (domNode) {
      domNode.classList.add("hide-cursor");
    }
  }

  // Apply error markers
  if (errors.length > 0) {
    const model = editor.getModel();
    if (model) {
      const markers = errors
        .filter((e) => e.lineno != null)
        .map((e) => ({
          severity: monaco.MarkerSeverity.Error,
          startLineNumber: e.lineno!,
          startColumn: 1,
          endLineNumber: e.lineno!,
          endColumn: Number.MAX_VALUE,
          message: e.message,
          source: "beancount",
        }));
      monaco.editor.setModelMarkers(model, "beancount", markers);
    }
  }

  // Highlight and scroll to the specified line if provided
  if (lineNumber && lineNumber > 0) {
    editor.revealLineInCenter(lineNumber);

    const model = editor.getModel();
    if (model) {
      const maxColumn = model.getLineMaxColumn(lineNumber);
      editor.setPosition({ lineNumber, column: maxColumn });
    }

    editor.focus();

    const decorations = editor.deltaDecorations(
      [],
      [
        {
          range: new monaco.Range(lineNumber, 1, lineNumber, 1),
          options: {
            isWholeLine: true,
            className: "highlighted-line",
            inlineClassName: "highlighted-line-inline",
          },
        },
      ],
    );

    return { decorations };
  } else {
    // No specific line number: scroll to end of file
    const model = editor.getModel();
    if (model) {
      const lastLine = model.getLineCount();
      const lastColumn = model.getLineMaxColumn(lastLine);
      editor.revealLine(lastLine);
      if (!readOnly) {
        editor.setPosition({ lineNumber: lastLine, column: lastColumn });
        editor.focus();
      }
    }
  }

  return { decorations: [] };
}

describe("TextEditor - Auto Scroll to End of File", () => {
  let mockEditor: ReturnType<typeof createMockEditor>;
  let mockMonaco: ReturnType<typeof createMockMonaco>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEditor = createMockEditor();
    mockMonaco = createMockMonaco();
  });

  describe("Edit mode without lineNumber", () => {
    it("should scroll to the last line of the file", () => {
      simulateOnMount({
        editor: mockEditor,
        monaco: mockMonaco,
        lineNumber: undefined,
        readOnly: false,
      });

      expect(mockEditor.revealLine).toHaveBeenCalledWith(53);
    });

    it("should set cursor position at end of last line", () => {
      simulateOnMount({
        editor: mockEditor,
        monaco: mockMonaco,
        lineNumber: undefined,
        readOnly: false,
      });

      expect(mockEditor.setPosition).toHaveBeenCalledWith({
        lineNumber: 53,
        column: 20,
      });
    });

    it("should focus the editor", () => {
      simulateOnMount({
        editor: mockEditor,
        monaco: mockMonaco,
        lineNumber: undefined,
        readOnly: false,
      });

      expect(mockEditor.focus).toHaveBeenCalled();
    });

    it("should not add line highlight decorations", () => {
      simulateOnMount({
        editor: mockEditor,
        monaco: mockMonaco,
        lineNumber: undefined,
        readOnly: false,
      });

      expect(mockEditor.deltaDecorations).not.toHaveBeenCalled();
    });

    it("should not call revealLineInCenter (only revealLine)", () => {
      simulateOnMount({
        editor: mockEditor,
        monaco: mockMonaco,
        lineNumber: undefined,
        readOnly: false,
      });

      expect(mockEditor.revealLineInCenter).not.toHaveBeenCalled();
      expect(mockEditor.revealLine).toHaveBeenCalledWith(53);
    });
  });

  describe("Read-only mode without lineNumber", () => {
    it("should scroll to the last line of the file", () => {
      simulateOnMount({
        editor: mockEditor,
        monaco: mockMonaco,
        lineNumber: undefined,
        readOnly: true,
      });

      expect(mockEditor.revealLine).toHaveBeenCalledWith(53);
    });

    it("should NOT set cursor position", () => {
      simulateOnMount({
        editor: mockEditor,
        monaco: mockMonaco,
        lineNumber: undefined,
        readOnly: true,
      });

      expect(mockEditor.setPosition).not.toHaveBeenCalled();
    });

    it("should NOT focus the editor", () => {
      simulateOnMount({
        editor: mockEditor,
        monaco: mockMonaco,
        lineNumber: undefined,
        readOnly: true,
      });

      expect(mockEditor.focus).not.toHaveBeenCalled();
    });
  });

  describe("With specific lineNumber (both modes)", () => {
    it("should scroll to the specified line in edit mode", () => {
      simulateOnMount({
        editor: mockEditor,
        monaco: mockMonaco,
        lineNumber: 10,
        readOnly: false,
      });

      expect(mockEditor.revealLineInCenter).toHaveBeenCalledWith(10);
      expect(mockEditor.revealLine).not.toHaveBeenCalled();
    });

    it("should scroll to the specified line in read-only mode", () => {
      simulateOnMount({
        editor: mockEditor,
        monaco: mockMonaco,
        lineNumber: 10,
        readOnly: true,
      });

      expect(mockEditor.revealLineInCenter).toHaveBeenCalledWith(10);
      expect(mockEditor.revealLine).not.toHaveBeenCalled();
    });

    it("should set cursor at end of specified line", () => {
      simulateOnMount({
        editor: mockEditor,
        monaco: mockMonaco,
        lineNumber: 10,
        readOnly: false,
      });

      expect(mockEditor.setPosition).toHaveBeenCalledWith({
        lineNumber: 10,
        column: 40,
      });
    });

    it("should add highlight decoration to the specified line", () => {
      simulateOnMount({
        editor: mockEditor,
        monaco: mockMonaco,
        lineNumber: 10,
        readOnly: false,
      });

      expect(mockEditor.deltaDecorations).toHaveBeenCalledWith(
        [],
        [
          expect.objectContaining({
            options: expect.objectContaining({
              isWholeLine: true,
              className: "highlighted-line",
            }),
          }),
        ],
      );
    });
  });

  describe("onScrollChange does not block onMount execution", () => {
    it("should still scroll to end when onScrollChange is provided in edit mode", () => {
      const onScrollChange = vi.fn();

      simulateOnMount({
        editor: mockEditor,
        monaco: mockMonaco,
        lineNumber: undefined,
        readOnly: false,
        onScrollChange,
      });

      // Scroll listener should be registered
      expect(mockEditor.onDidScrollChange).toHaveBeenCalled();

      // AND scroll-to-end should still execute
      expect(mockEditor.revealLine).toHaveBeenCalledWith(53);
      expect(mockEditor.setPosition).toHaveBeenCalledWith({
        lineNumber: 53,
        column: 20,
      });
      expect(mockEditor.focus).toHaveBeenCalled();
    });

    it("should still scroll to end when onScrollChange is provided in read-only mode", () => {
      const onScrollChange = vi.fn();

      simulateOnMount({
        editor: mockEditor,
        monaco: mockMonaco,
        lineNumber: undefined,
        readOnly: true,
        onScrollChange,
      });

      expect(mockEditor.onDidScrollChange).toHaveBeenCalled();
      expect(mockEditor.revealLine).toHaveBeenCalledWith(53);
      expect(mockEditor.setPosition).not.toHaveBeenCalled();
      expect(mockEditor.focus).not.toHaveBeenCalled();
    });

    it("should still scroll to specific line when onScrollChange is provided", () => {
      const onScrollChange = vi.fn();

      simulateOnMount({
        editor: mockEditor,
        monaco: mockMonaco,
        lineNumber: 10,
        readOnly: false,
        onScrollChange,
      });

      expect(mockEditor.onDidScrollChange).toHaveBeenCalled();
      expect(mockEditor.revealLineInCenter).toHaveBeenCalledWith(10);
    });

    it("should still apply error markers when onScrollChange is provided", () => {
      const onScrollChange = vi.fn();
      const errors = [{ lineno: 5, message: "Test error" }];

      simulateOnMount({
        editor: mockEditor,
        monaco: mockMonaco,
        lineNumber: undefined,
        readOnly: false,
        onScrollChange,
        errors,
      });

      expect(mockEditor.onDidScrollChange).toHaveBeenCalled();
      expect(mockMonaco.editor.setModelMarkers).toHaveBeenCalledWith(
        expect.any(Object),
        "beancount",
        expect.arrayContaining([
          expect.objectContaining({
            startLineNumber: 5,
            message: "Test error",
          }),
        ]),
      );
    });

    it("should still hide cursor in read-only mode when onScrollChange is provided", () => {
      const onScrollChange = vi.fn();
      const mockClassList = { add: vi.fn() };
      mockEditor.getDomNode.mockReturnValue({ classList: mockClassList });

      simulateOnMount({
        editor: mockEditor,
        monaco: mockMonaco,
        lineNumber: undefined,
        readOnly: true,
        onScrollChange,
      });

      expect(mockEditor.onDidScrollChange).toHaveBeenCalled();
      expect(mockClassList.add).toHaveBeenCalledWith("hide-cursor");
    });
  });

  describe("Edge cases", () => {
    it("should handle a file with only 1 line", () => {
      const singleLineEditor = createMockEditor(1, 10);

      simulateOnMount({
        editor: singleLineEditor,
        monaco: mockMonaco,
        lineNumber: undefined,
        readOnly: false,
      });

      expect(singleLineEditor.revealLine).toHaveBeenCalledWith(1);
      expect(singleLineEditor.setPosition).toHaveBeenCalledWith({
        lineNumber: 1,
        column: 10,
      });
    });

    it("should handle lineNumber of 0 as no line number (scroll to end)", () => {
      simulateOnMount({
        editor: mockEditor,
        monaco: mockMonaco,
        lineNumber: 0,
        readOnly: false,
      });

      // lineNumber 0 is falsy, so it should scroll to end
      expect(mockEditor.revealLine).toHaveBeenCalledWith(53);
      expect(mockEditor.revealLineInCenter).not.toHaveBeenCalled();
    });

    it("should handle null model gracefully", () => {
      mockEditor.getModel.mockReturnValue(null);

      // Should not throw
      expect(() =>
        simulateOnMount({
          editor: mockEditor,
          monaco: mockMonaco,
          lineNumber: undefined,
          readOnly: false,
        }),
      ).not.toThrow();

      expect(mockEditor.revealLine).not.toHaveBeenCalled();
      expect(mockEditor.setPosition).not.toHaveBeenCalled();
    });
  });
});

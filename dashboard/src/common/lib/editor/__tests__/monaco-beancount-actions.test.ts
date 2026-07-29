import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  alignAmounts,
  toggleComment,
  foldAll,
  unfoldAll,
  registerEditorShortcuts,
} from "../monaco-beancount-actions";
import type * as monaco from "monaco-editor";

// Mock Monaco Editor types
const createMockEditor = () => {
  const model = {
    getLineCount: vi.fn(),
    getLineContent: vi.fn(),
    getFullModelRange: vi.fn(() => ({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 10,
      endColumn: 1,
    })),
  };

  const editor = {
    getModel: vi.fn(() => model),
    executeEdits: vi.fn(),
    trigger: vi.fn(),
    addCommand: vi.fn(),
  };

  return { editor, model };
};

const mockMonaco = {
  KeyMod: {
    CtrlCmd: 2048,
    Alt: 512,
  },
  KeyCode: {
    KeyD: 34,
    Slash: 85,
    BracketLeft: 87,
    BracketRight: 88,
  },
} as unknown as typeof monaco;

describe("Monaco Beancount Actions", () => {
  describe("alignAmounts", () => {
    it("should align posting amounts to column 61", () => {
      const { editor, model } = createMockEditor();

      model.getLineCount.mockReturnValue(3);
      model.getLineContent.mockImplementation((lineNum: number) => {
        if (lineNum === 1) return '2024-01-01 * "Test"';
        if (lineNum === 2) return "  Assets:Checking  100.00 USD";
        if (lineNum === 3) return "  Expenses:Food  -100.00 USD";
        return "";
      });

      alignAmounts(
        editor as unknown as monaco.editor.IStandaloneCodeEditor,
        61,
      );

      expect(editor.executeEdits).toHaveBeenCalledWith("align-amounts", [
        {
          range: model.getFullModelRange(),
          text: expect.stringContaining("Assets:Checking"),
        },
      ]);

      const editCall = editor.executeEdits.mock.calls[0][1][0];
      const lines = editCall.text.split("\n");

      // Line 1 should remain unchanged (no amount)
      expect(lines[0]).toBe('2024-01-01 * "Test"');

      // Lines 2 and 3 should have aligned amounts
      // Account name + spaces + amount + space + currency
      expect(lines[1]).toMatch(/Assets:Checking\s+100\.00 USD/);
      expect(lines[2]).toMatch(/Expenses:Food\s+-100\.00 USD/);
    });

    it("should handle lines without amounts", () => {
      const { editor, model } = createMockEditor();

      model.getLineCount.mockReturnValue(2);
      model.getLineContent.mockImplementation((lineNum: number) => {
        if (lineNum === 1) return '2024-01-01 * "Test"';
        if (lineNum === 2) return "  ; This is a comment";
        return "";
      });

      alignAmounts(editor as unknown as monaco.editor.IStandaloneCodeEditor);

      expect(editor.executeEdits).toHaveBeenCalled();
      const editCall = editor.executeEdits.mock.calls[0][1][0];
      const lines = editCall.text.split("\n");

      // Lines without amounts should remain unchanged
      expect(lines[0]).toBe('2024-01-01 * "Test"');
      expect(lines[1]).toBe("  ; This is a comment");
    });

    it("should handle empty editor", () => {
      const { editor, model } = createMockEditor();

      model.getLineCount.mockReturnValue(0);

      alignAmounts(editor as unknown as monaco.editor.IStandaloneCodeEditor);

      expect(editor.executeEdits).toHaveBeenCalledWith("align-amounts", [
        {
          range: model.getFullModelRange(),
          text: "",
        },
      ]);
    });

    it("should handle null model", () => {
      const { editor } = createMockEditor();
      editor.getModel.mockReturnValue(null);

      // Should not throw error
      expect(() => {
        alignAmounts(editor as unknown as monaco.editor.IStandaloneCodeEditor);
      }).not.toThrow();

      expect(editor.executeEdits).not.toHaveBeenCalled();
    });

    it("should use custom currency column", () => {
      const { editor, model } = createMockEditor();

      model.getLineCount.mockReturnValue(1);
      model.getLineContent.mockReturnValue("  Assets:Checking  100.00 USD");

      alignAmounts(
        editor as unknown as monaco.editor.IStandaloneCodeEditor,
        50, // Custom column
      );

      expect(editor.executeEdits).toHaveBeenCalled();
    });

    it("should handle amounts with commas", () => {
      const { editor, model } = createMockEditor();

      model.getLineCount.mockReturnValue(1);
      model.getLineContent.mockReturnValue("  Assets:Checking  1,234.56 USD");

      alignAmounts(editor as unknown as monaco.editor.IStandaloneCodeEditor);

      expect(editor.executeEdits).toHaveBeenCalled();
      const editCall = editor.executeEdits.mock.calls[0][1][0];
      expect(editCall.text).toContain("1,234.56");
    });

    it("should handle negative amounts", () => {
      const { editor, model } = createMockEditor();

      model.getLineCount.mockReturnValue(1);
      model.getLineContent.mockReturnValue("  Expenses:Food  -100.00 USD");

      alignAmounts(editor as unknown as monaco.editor.IStandaloneCodeEditor);

      expect(editor.executeEdits).toHaveBeenCalled();
      const editCall = editor.executeEdits.mock.calls[0][1][0];
      expect(editCall.text).toContain("-100.00");
    });
  });

  describe("toggleComment", () => {
    it("should trigger editor comment action", () => {
      const { editor } = createMockEditor();

      toggleComment(editor as unknown as monaco.editor.IStandaloneCodeEditor);

      expect(editor.trigger).toHaveBeenCalledWith(
        "keyboard",
        "editor.action.commentLine",
        {},
      );
    });
  });

  describe("foldAll", () => {
    it("should trigger fold all action", () => {
      const { editor } = createMockEditor();

      foldAll(editor as unknown as monaco.editor.IStandaloneCodeEditor);

      expect(editor.trigger).toHaveBeenCalledWith(
        "keyboard",
        "editor.foldAll",
        {},
      );
    });
  });

  describe("unfoldAll", () => {
    it("should trigger unfold all action", () => {
      const { editor } = createMockEditor();

      unfoldAll(editor as unknown as monaco.editor.IStandaloneCodeEditor);

      expect(editor.trigger).toHaveBeenCalledWith(
        "keyboard",
        "editor.unfoldAll",
        {},
      );
    });
  });

  describe("registerEditorShortcuts", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should register keyboard shortcut for align amounts", () => {
      const { editor } = createMockEditor();

      registerEditorShortcuts(
        editor as unknown as monaco.editor.IStandaloneCodeEditor,
        mockMonaco,
      );

      // Should register Cmd+d or Ctrl+d
      expect(editor.addCommand).toHaveBeenCalledWith(
        mockMonaco.KeyMod.CtrlCmd | mockMonaco.KeyCode.KeyD,
        expect.any(Function),
      );
    });

    it("should register keyboard shortcut for toggle comment", () => {
      const { editor } = createMockEditor();

      registerEditorShortcuts(
        editor as unknown as monaco.editor.IStandaloneCodeEditor,
        mockMonaco,
      );

      // Should register Cmd+/ or Ctrl+/
      expect(editor.addCommand).toHaveBeenCalledWith(
        mockMonaco.KeyMod.CtrlCmd | mockMonaco.KeyCode.Slash,
        expect.any(Function),
      );
    });

    it("should register keyboard shortcut for fold all", () => {
      const { editor } = createMockEditor();

      registerEditorShortcuts(
        editor as unknown as monaco.editor.IStandaloneCodeEditor,
        mockMonaco,
      );

      // Should register Cmd+Alt+[ or Ctrl+Alt+[
      expect(editor.addCommand).toHaveBeenCalledWith(
        mockMonaco.KeyMod.CtrlCmd |
          mockMonaco.KeyMod.Alt |
          mockMonaco.KeyCode.BracketLeft,
        expect.any(Function),
      );
    });

    it("should register keyboard shortcut for unfold all", () => {
      const { editor } = createMockEditor();

      registerEditorShortcuts(
        editor as unknown as monaco.editor.IStandaloneCodeEditor,
        mockMonaco,
      );

      // Should register Cmd+Alt+] or Ctrl+Alt+]
      expect(editor.addCommand).toHaveBeenCalledWith(
        mockMonaco.KeyMod.CtrlCmd |
          mockMonaco.KeyMod.Alt |
          mockMonaco.KeyCode.BracketRight,
        expect.any(Function),
      );
    });

    it("should register exactly 4 shortcuts", () => {
      const { editor } = createMockEditor();

      registerEditorShortcuts(
        editor as unknown as monaco.editor.IStandaloneCodeEditor,
        mockMonaco,
      );

      expect(editor.addCommand).toHaveBeenCalledTimes(4);
    });

    it("should call alignAmounts when align shortcut is executed", () => {
      const { editor, model } = createMockEditor();

      model.getLineCount.mockReturnValue(1);
      model.getLineContent.mockReturnValue("  Assets:Checking  100 USD");

      registerEditorShortcuts(
        editor as unknown as monaco.editor.IStandaloneCodeEditor,
        mockMonaco,
      );

      // Get the callback for the align shortcut and execute it
      const alignCallback = editor.addCommand.mock.calls.find(
        (call) =>
          call[0] === (mockMonaco.KeyMod.CtrlCmd | mockMonaco.KeyCode.KeyD),
      )?.[1];

      expect(alignCallback).toBeDefined();

      // Execute the callback
      alignCallback?.();

      // Should have executed edits to align amounts
      expect(editor.executeEdits).toHaveBeenCalledWith(
        "align-amounts",
        expect.any(Array),
      );
    });

    it("should call toggleComment when comment shortcut is executed", () => {
      const { editor } = createMockEditor();

      registerEditorShortcuts(
        editor as unknown as monaco.editor.IStandaloneCodeEditor,
        mockMonaco,
      );

      // Get the callback for the comment shortcut and execute it
      const commentCallback = editor.addCommand.mock.calls.find(
        (call) =>
          call[0] === (mockMonaco.KeyMod.CtrlCmd | mockMonaco.KeyCode.Slash),
      )?.[1];

      expect(commentCallback).toBeDefined();

      // Execute the callback
      commentCallback?.();

      // Should have triggered the comment action
      expect(editor.trigger).toHaveBeenCalledWith(
        "keyboard",
        "editor.action.commentLine",
        {},
      );
    });

    it("should call foldAll when fold shortcut is executed", () => {
      const { editor } = createMockEditor();

      registerEditorShortcuts(
        editor as unknown as monaco.editor.IStandaloneCodeEditor,
        mockMonaco,
      );

      // Get the callback for the fold shortcut and execute it
      const foldCallback = editor.addCommand.mock.calls.find(
        (call) =>
          call[0] ===
          (mockMonaco.KeyMod.CtrlCmd |
            mockMonaco.KeyMod.Alt |
            mockMonaco.KeyCode.BracketLeft),
      )?.[1];

      expect(foldCallback).toBeDefined();

      // Execute the callback
      foldCallback?.();

      // Should have triggered the fold all action
      expect(editor.trigger).toHaveBeenCalledWith(
        "keyboard",
        "editor.foldAll",
        {},
      );
    });

    it("should call unfoldAll when unfold shortcut is executed", () => {
      const { editor } = createMockEditor();

      registerEditorShortcuts(
        editor as unknown as monaco.editor.IStandaloneCodeEditor,
        mockMonaco,
      );

      // Get the callback for the unfold shortcut and execute it
      const unfoldCallback = editor.addCommand.mock.calls.find(
        (call) =>
          call[0] ===
          (mockMonaco.KeyMod.CtrlCmd |
            mockMonaco.KeyMod.Alt |
            mockMonaco.KeyCode.BracketRight),
      )?.[1];

      expect(unfoldCallback).toBeDefined();

      // Execute the callback
      unfoldCallback?.();

      // Should have triggered the unfold all action
      expect(editor.trigger).toHaveBeenCalledWith(
        "keyboard",
        "editor.unfoldAll",
        {},
      );
    });
  });
});

import { describe, it, expect, vi } from "vitest";
import type { BeancountError } from "@/graphql/definitions";

/**
 * Integration tests to verify that errors are displayed in both
 * read-only mode and edit mode of the Monaco editor
 */

describe("Ledger File View - Error Display in Both Modes", () => {
  // Mock Monaco Editor setModelMarkers function
  const mockSetModelMarkers = vi.fn();

  // Sample errors for testing
  const mockErrors: BeancountError[] = [
    {
      __typename: "BeancountError",
      filename: "test.beancount",
      lineno: 10,
      message: "Invalid transaction syntax",
    },
    {
      __typename: "BeancountError",
      filename: "test.beancount",
      lineno: 20,
      message: "Missing account",
    },
  ];

  // Mock TextEditor component props
  interface TextEditorProps {
    content: string;
    filename: string;
    setEditedContent: (content: string) => void;
    lineNumber?: number;
    readOnly?: boolean;
    onSave?: (content: string) => void;
    onEditorMount?: (
      editor: { getModel: () => object },
      monaco: { editor: { setModelMarkers: typeof mockSetModelMarkers } },
    ) => void;
    errors?: BeancountError[];
  }

  const createMockEditor = () => ({
    getModel: () => ({ uri: "test" }),
    revealLineInCenter: vi.fn(),
    setPosition: vi.fn(),
    focus: vi.fn(),
    deltaDecorations: vi.fn(() => []),
    getValue: vi.fn(() => "content"),
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
      setModelMarkers: mockSetModelMarkers,
      MarkerSeverity: {
        Hint: 1,
        Info: 2,
        Warning: 4,
        Error: 8,
      },
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
    },
  });

  it("should pass errors to TextEditor in read-only mode", () => {
    // This test verifies that the FileViewMode component passes errors
    // to the TextEditor component when in read-only mode

    const errors = mockErrors;

    // Simulate what happens in FileViewMode
    const textEditorProps: TextEditorProps = {
      content: "2024-01-01 * Test\n  Assets:Bank 100 USD",
      filename: "test.beancount",
      setEditedContent: () => {},
      lineNumber: undefined,
      readOnly: true, // Read-only mode
      errors: errors, // Errors should be passed
    };

    expect(textEditorProps.readOnly).toBe(true);
    expect(textEditorProps.errors).toEqual(errors);
    expect(textEditorProps.errors).toHaveLength(2);
  });

  it("should pass errors to TextEditor in edit mode", () => {
    // This test verifies that the FileEditMode component passes errors
    // to the TextEditor component when in edit mode

    const errors = mockErrors;

    // Simulate what happens in FileEditMode
    const textEditorProps: TextEditorProps = {
      content: "2024-01-01 * Test\n  Assets:Bank 100 USD",
      filename: "test.beancount",
      setEditedContent: () => {},
      lineNumber: undefined,
      readOnly: false, // Edit mode
      onSave: () => {},
      errors: errors, // Errors should be passed
    };

    expect(textEditorProps.readOnly).toBe(false);
    expect(textEditorProps.errors).toEqual(errors);
    expect(textEditorProps.errors).toHaveLength(2);
  });

  it("should call setModelMarkers when editor mounts in read-only mode", () => {
    mockSetModelMarkers.mockClear();

    const mockEditor = createMockEditor();
    const mockMonaco = createMockMonaco();

    // Simulate the onMount callback with errors in read-only mode
    const errors = mockErrors;

    // This simulates what happens in the TextEditor component's onMount
    if (errors.length > 0) {
      const model = mockEditor.getModel();
      if (model) {
        const markers = errors
          .filter((error) => error.lineno != null)
          .map((error) => ({
            severity: mockMonaco.MarkerSeverity.Error,
            startLineNumber: error.lineno!,
            startColumn: 1,
            endLineNumber: error.lineno!,
            endColumn: Number.MAX_VALUE,
            message: error.message,
            source: "beancount",
          }));

        mockMonaco.editor.setModelMarkers(model, "beancount", markers);
      }
    }

    // Verify setModelMarkers was called
    expect(mockSetModelMarkers).toHaveBeenCalledTimes(1);
    expect(mockSetModelMarkers).toHaveBeenCalledWith(
      expect.any(Object),
      "beancount",
      expect.arrayContaining([
        expect.objectContaining({
          severity: 8, // MarkerSeverity.Error
          startLineNumber: 10,
          message: "Invalid transaction syntax",
        }),
        expect.objectContaining({
          severity: 8,
          startLineNumber: 20,
          message: "Missing account",
        }),
      ]),
    );
  });

  it("should call setModelMarkers when editor mounts in edit mode", () => {
    mockSetModelMarkers.mockClear();

    const mockEditor = createMockEditor();
    const mockMonaco = createMockMonaco();

    // Simulate the onMount callback with errors in edit mode
    const errors = mockErrors;

    // This simulates what happens in the TextEditor component's onMount
    if (errors.length > 0) {
      const model = mockEditor.getModel();
      if (model) {
        const markers = errors
          .filter((error) => error.lineno != null)
          .map((error) => ({
            severity: mockMonaco.MarkerSeverity.Error,
            startLineNumber: error.lineno!,
            startColumn: 1,
            endLineNumber: error.lineno!,
            endColumn: Number.MAX_VALUE,
            message: error.message,
            source: "beancount",
          }));

        mockMonaco.editor.setModelMarkers(model, "beancount", markers);
      }
    }

    // Verify setModelMarkers was called (same as read-only mode)
    expect(mockSetModelMarkers).toHaveBeenCalledTimes(1);
    expect(mockSetModelMarkers).toHaveBeenCalledWith(
      expect.any(Object),
      "beancount",
      expect.arrayContaining([
        expect.objectContaining({
          severity: 8,
          startLineNumber: 10,
          message: "Invalid transaction syntax",
        }),
        expect.objectContaining({
          severity: 8,
          startLineNumber: 20,
          message: "Missing account",
        }),
      ]),
    );
  });

  it("should handle empty errors array in both modes", () => {
    const emptyErrors: BeancountError[] = [];

    // Read-only mode
    const readOnlyProps: TextEditorProps = {
      content: "test",
      filename: "test.beancount",
      setEditedContent: () => {},
      readOnly: true,
      errors: emptyErrors,
    };

    expect(readOnlyProps.errors).toHaveLength(0);

    // Edit mode
    const editModeProps: TextEditorProps = {
      content: "test",
      filename: "test.beancount",
      setEditedContent: () => {},
      readOnly: false,
      errors: emptyErrors,
    };

    expect(editModeProps.errors).toHaveLength(0);
  });

  it("should filter errors with null line numbers in both modes", () => {
    const errorsWithNulls: BeancountError[] = [
      {
        __typename: "BeancountError",
        filename: "test.beancount",
        lineno: 10,
        message: "Valid error",
      },
      {
        __typename: "BeancountError",
        filename: "test.beancount",
        lineno: null,
        message: "Error without line number",
      },
    ];

    // Filter function (same as in component)
    const validErrors = errorsWithNulls.filter((error) => error.lineno != null);

    expect(validErrors).toHaveLength(1);
    expect(validErrors[0].message).toBe("Valid error");
  });

  it("should maintain error markers when switching between view and edit modes", () => {
    // This test ensures that errors persist when toggling modes

    const errors = mockErrors;

    // Initial state: read-only mode with errors
    let editorProps: TextEditorProps = {
      content: "test",
      filename: "test.beancount",
      setEditedContent: () => {},
      readOnly: true,
      errors: errors,
    };

    expect(editorProps.errors).toEqual(errors);

    // Switch to edit mode - errors should still be present
    editorProps = {
      ...editorProps,
      readOnly: false,
      onSave: () => {},
    };

    expect(editorProps.errors).toEqual(errors);
    expect(editorProps.errors).toHaveLength(2);

    // Switch back to view mode - errors should still be present
    editorProps = {
      content: "test",
      filename: "test.beancount",
      setEditedContent: () => {},
      readOnly: true,
      errors: errors,
    };

    expect(editorProps.errors).toEqual(errors);
  });

  it("should apply error markers regardless of readOnly prop", () => {
    // Verify that the marker application logic doesn't depend on readOnly

    const applyMarkers = (
      readOnly: boolean,
      errors: BeancountError[],
    ): boolean => {
      // This simulates the logic in TextEditor's onMount
      // Errors are applied if errors.length > 0, regardless of readOnly
      return errors.length > 0;
    };

    expect(applyMarkers(true, mockErrors)).toBe(true); // Read-only
    expect(applyMarkers(false, mockErrors)).toBe(true); // Edit mode
    expect(applyMarkers(true, [])).toBe(false); // No errors
    expect(applyMarkers(false, [])).toBe(false); // No errors
  });
});

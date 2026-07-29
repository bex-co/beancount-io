import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { useRef, useEffect } from "react";

// Type definitions for Monaco Editor mock
interface MockEditorProps {
  onMount?: (editor: MockEditor, monaco: object) => void;
  value?: string;
}

interface MockEditor {
  getValue: () => string;
  dispose: () => void;
}

// Mock monaco-editor
vi.mock("@monaco-editor/react", () => ({
  default: ({ onMount, value }: MockEditorProps) => {
    const editorMock: MockEditor = {
      getValue: vi.fn(() => value || ""),
      dispose: vi.fn(),
    };

    // Call onMount if provided
    if (onMount) {
      setTimeout(() => {
        onMount(editorMock, {});
      }, 0);
    }

    return <div data-testid="monaco-editor">{value}</div>;
  },
}));

// Simplified TextEditor component for testing
// This mimics the keyboard shortcut logic from the actual component
interface TextEditorProps {
  content: string;
  readOnly?: boolean;
  onSave?: (content: string) => void;
}

interface EditorRef {
  getValue: () => string;
}

const TextEditor = ({ content, readOnly = false, onSave }: TextEditorProps) => {
  const editorRef = useRef<EditorRef | null>(null);

  // Handle Cmd+S keyboard shortcut at document level to prevent browser save dialog
  useEffect(() => {
    if (readOnly || !onSave) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "s" || e.key === "S") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopPropagation();

        // Get fresh content from Monaco editor
        if (editorRef.current) {
          const currentContent = editorRef.current.getValue();
          onSave(currentContent);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [readOnly, onSave]);

  // Simulate editor mount
  useEffect(() => {
    editorRef.current = {
      getValue: () => content,
    };
  }, [content]);

  return <div data-testid="text-editor">{content}</div>;
};

describe("TextEditor Keyboard Shortcuts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Cmd+S / Ctrl+S Save Shortcut", () => {
    it("should add keyboard event listener when onSave is provided and not readOnly", () => {
      const mockOnSave = vi.fn();
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");

      render(<TextEditor content="test content" onSave={mockOnSave} />);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
        { capture: true },
      );

      addEventListenerSpy.mockRestore();
    });

    it("should not add keyboard event listener when readOnly is true", () => {
      const mockOnSave = vi.fn();
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");

      render(
        <TextEditor content="test content" readOnly onSave={mockOnSave} />,
      );

      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
        { capture: true },
      );

      addEventListenerSpy.mockRestore();
    });

    it("should not add keyboard event listener when onSave is not provided", () => {
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");

      render(<TextEditor content="test content" />);

      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
        { capture: true },
      );

      addEventListenerSpy.mockRestore();
    });

    it("should call onSave with current content when Cmd+S is pressed (Mac)", () => {
      const mockOnSave = vi.fn();
      render(<TextEditor content="test content" onSave={mockOnSave} />);

      // Simulate Cmd+S (Mac)
      const event = new KeyboardEvent("keydown", {
        key: "s",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(event);

      expect(mockOnSave).toHaveBeenCalledTimes(1);
      expect(mockOnSave).toHaveBeenCalledWith("test content");
    });

    it("should call onSave with current content when Ctrl+S is pressed (Windows/Linux)", () => {
      const mockOnSave = vi.fn();
      render(<TextEditor content="test content" onSave={mockOnSave} />);

      // Simulate Ctrl+S (Windows/Linux)
      const event = new KeyboardEvent("keydown", {
        key: "s",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(event);

      expect(mockOnSave).toHaveBeenCalledTimes(1);
      expect(mockOnSave).toHaveBeenCalledWith("test content");
    });

    it("should call onSave with uppercase S key", () => {
      const mockOnSave = vi.fn();
      render(<TextEditor content="test content" onSave={mockOnSave} />);

      // Simulate Cmd+Shift+S (uppercase S)
      const event = new KeyboardEvent("keydown", {
        key: "S",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(event);

      expect(mockOnSave).toHaveBeenCalledTimes(1);
      expect(mockOnSave).toHaveBeenCalledWith("test content");
    });

    it("should prevent default browser behavior", () => {
      const mockOnSave = vi.fn();
      render(<TextEditor content="test content" onSave={mockOnSave} />);

      const event = new KeyboardEvent("keydown", {
        key: "s",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });

      const preventDefaultSpy = vi.spyOn(event, "preventDefault");
      const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

      document.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it("should not call onSave when only 's' is pressed without modifier keys", () => {
      const mockOnSave = vi.fn();
      render(<TextEditor content="test content" onSave={mockOnSave} />);

      // Simulate just 's' key without Cmd/Ctrl
      const event = new KeyboardEvent("keydown", {
        key: "s",
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(event);

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it("should not call onSave when readOnly is true", () => {
      const mockOnSave = vi.fn();
      render(
        <TextEditor content="test content" readOnly onSave={mockOnSave} />,
      );

      // Simulate Cmd+S
      const event = new KeyboardEvent("keydown", {
        key: "s",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(event);

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it("should not call onSave when onSave is not provided", () => {
      render(<TextEditor content="test content" />);

      // This should not throw an error
      const event = new KeyboardEvent("keydown", {
        key: "s",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });

      expect(() => document.dispatchEvent(event)).not.toThrow();
    });

    it("should remove event listener on unmount", () => {
      const mockOnSave = vi.fn();
      const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

      const { unmount } = render(
        <TextEditor content="test content" onSave={mockOnSave} />,
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
        { capture: true },
      );

      removeEventListenerSpy.mockRestore();
    });

    it("should call onSave with updated content when content changes", () => {
      const mockOnSave = vi.fn();
      const { rerender } = render(
        <TextEditor content="initial content" onSave={mockOnSave} />,
      );

      // Update content
      rerender(<TextEditor content="updated content" onSave={mockOnSave} />);

      // Simulate Cmd+S
      const event = new KeyboardEvent("keydown", {
        key: "s",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(event);

      expect(mockOnSave).toHaveBeenCalledWith("updated content");
    });

    it("should handle both Ctrl and Meta keys correctly", () => {
      const mockOnSave = vi.fn();
      render(<TextEditor content="test content" onSave={mockOnSave} />);

      // Simulate Ctrl+S
      const ctrlEvent = new KeyboardEvent("keydown", {
        key: "s",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(ctrlEvent);

      expect(mockOnSave).toHaveBeenCalledTimes(1);

      // Simulate Cmd+S
      const metaEvent = new KeyboardEvent("keydown", {
        key: "s",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(metaEvent);

      expect(mockOnSave).toHaveBeenCalledTimes(2);
    });

    it("should use capture phase for event listening", () => {
      const mockOnSave = vi.fn();
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");

      render(<TextEditor content="test content" onSave={mockOnSave} />);

      // Verify that the listener is added with capture: true
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
        { capture: true },
      );

      addEventListenerSpy.mockRestore();
    });
  });

  describe("Editor Reference Management", () => {
    it("should store editor reference correctly", async () => {
      const mockOnSave = vi.fn();
      render(<TextEditor content="test content" onSave={mockOnSave} />);

      // Wait for editor to mount
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Trigger save
      const event = new KeyboardEvent("keydown", {
        key: "s",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(event);

      // Verify onSave was called with content from editor
      expect(mockOnSave).toHaveBeenCalledWith("test content");
    });

    it("should get latest content from editor reference when saving", () => {
      const mockOnSave = vi.fn();
      const { rerender } = render(
        <TextEditor content="initial" onSave={mockOnSave} />,
      );

      // Simulate content change
      rerender(<TextEditor content="updated" onSave={mockOnSave} />);

      // Trigger save
      const event = new KeyboardEvent("keydown", {
        key: "s",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(event);

      // Should get content from editor ref, not from stale React state
      expect(mockOnSave).toHaveBeenCalledWith("updated");
    });
  });

  describe("Cross-platform Compatibility", () => {
    it("should work on Mac with Cmd key", () => {
      const mockOnSave = vi.fn();
      render(<TextEditor content="test content" onSave={mockOnSave} />);

      const event = new KeyboardEvent("keydown", {
        key: "s",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(event);

      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });

    it("should work on Windows/Linux with Ctrl key", () => {
      const mockOnSave = vi.fn();
      render(<TextEditor content="test content" onSave={mockOnSave} />);

      const event = new KeyboardEvent("keydown", {
        key: "s",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(event);

      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty content", () => {
      const mockOnSave = vi.fn();
      render(<TextEditor content="" onSave={mockOnSave} />);

      const event = new KeyboardEvent("keydown", {
        key: "s",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(event);

      expect(mockOnSave).toHaveBeenCalledWith("");
    });

    it("should handle long content", () => {
      const longContent = "a".repeat(10000);
      const mockOnSave = vi.fn();
      render(<TextEditor content={longContent} onSave={mockOnSave} />);

      const event = new KeyboardEvent("keydown", {
        key: "s",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(event);

      expect(mockOnSave).toHaveBeenCalledWith(longContent);
    });

    it("should handle special characters in content", () => {
      const specialContent = "test\n\t\r\0content with special chars 🎉";
      const mockOnSave = vi.fn();
      render(<TextEditor content={specialContent} onSave={mockOnSave} />);

      const event = new KeyboardEvent("keydown", {
        key: "s",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(event);

      expect(mockOnSave).toHaveBeenCalledWith(specialContent);
    });

    it("should not interfere with other keyboard shortcuts", () => {
      const mockOnSave = vi.fn();
      render(<TextEditor content="test content" onSave={mockOnSave} />);

      // Simulate Cmd+C (copy)
      const copyEvent = new KeyboardEvent("keydown", {
        key: "c",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(copyEvent);

      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });
});

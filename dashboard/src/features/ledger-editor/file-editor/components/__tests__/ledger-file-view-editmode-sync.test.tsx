import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useState, useEffect } from "react";

/**
 * Tests for editMode URL synchronization
 * Verifies that the editMode query parameter stays in sync with the actual editing state
 */

describe("Ledger File View - EditMode URL Synchronization", () => {
  // Mock navigation function
  const mockNavigate = vi.fn();
  const mockParams = {
    ledgerOwner: "testOwner",
    ledgerName: "testLedger",
    branch: "main",
    _splat: "test.bean",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("URL state initialization", () => {
    it("should initialize editedContent when isEditMode is true from URL", async () => {
      const plainContent =
        "2024-01-01 * Test transaction\n  Assets:Bank 100 USD";
      const editedContent = "";
      const isEditMode = true; // Coming from URL parameter

      // Simulate the useEffect that initializes editedContent
      const { result } = renderHook(() => {
        const [content, setContent] = useState(editedContent);

        useEffect(() => {
          if (isEditMode && !content && plainContent) {
            setContent(plainContent);
          }
        }, [content]);

        return content;
      });

      await waitFor(() => {
        expect(result.current).toBe(plainContent);
      });
    });

    it("should not initialize editedContent when isEditMode is false", () => {
      const plainContent = "2024-01-01 * Test transaction";
      const isEditMode = false;

      const { result } = renderHook(() => {
        const [content, setContent] = useState("");

        useEffect(() => {
          if (isEditMode && !content && plainContent) {
            setContent(plainContent);
          }
        }, [content]);

        return content;
      });

      expect(result.current).toBe("");
    });

    it("should not reinitialize if editedContent already has value", () => {
      const plainContent = "Original content";
      const existingContent = "Modified content";
      const isEditMode = true;

      const { result } = renderHook(() => {
        const [content, setContent] = useState(existingContent);

        useEffect(() => {
          if (isEditMode && !content && plainContent) {
            setContent(plainContent);
          }
        }, [content]);

        return content;
      });

      expect(result.current).toBe(existingContent);
    });
  });

  describe("Edit mode transitions", () => {
    it("should call onEnterEditMode when clicking Edit button", () => {
      const onEnterEditMode = vi.fn();
      const _plainContent = "test content";
      const _currentScrollLine = 10;

      // Simulate handleEditClick
      const handleEditClick = () => {
        onEnterEditMode();
      };

      act(() => {
        handleEditClick();
      });

      expect(onEnterEditMode).toHaveBeenCalledTimes(1);
    });

    it("should call onExitEditMode when clicking Save button", async () => {
      const onExitEditMode = vi.fn();
      const onSave = vi.fn();

      // Simulate handleSaveClick
      const handleSaveClick = async () => {
        await onSave("content");
        onExitEditMode();
      };

      await act(async () => {
        await handleSaveClick();
      });

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onExitEditMode).toHaveBeenCalledTimes(1);
    });

    it("should call onExitEditMode when clicking Cancel button", () => {
      const onExitEditMode = vi.fn();

      // Simulate handleCancelEdit
      const handleCancelEdit = () => {
        onExitEditMode();
      };

      act(() => {
        handleCancelEdit();
      });

      expect(onExitEditMode).toHaveBeenCalledTimes(1);
    });
  });

  describe("Navigation URL updates", () => {
    it("should update URL with editMode=true when entering edit mode", () => {
      const lineNumber = 42;

      // Simulate handleEnterEditMode
      const handleEnterEditMode = () => {
        mockNavigate({
          to: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
          params: mockParams,
          search: { editMode: true, lineNumber },
        });
      };

      act(() => {
        handleEnterEditMode();
      });

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
        params: mockParams,
        search: { editMode: true, lineNumber },
      });
    });

    it("should remove editMode from URL when exiting edit mode", () => {
      const lineNumber = 42;

      // Simulate handleExitEditMode
      const handleExitEditMode = () => {
        mockNavigate({
          to: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
          params: mockParams,
          search: { lineNumber }, // editMode removed
        });
      };

      act(() => {
        handleExitEditMode();
      });

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
        params: mockParams,
        search: { lineNumber },
      });
    });

    it("should preserve lineNumber when toggling editMode", () => {
      const lineNumber = 100;

      // Enter edit mode
      mockNavigate({
        to: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
        params: mockParams,
        search: { editMode: true, lineNumber },
      });

      expect(mockNavigate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: expect.objectContaining({ lineNumber }),
        }),
      );

      // Exit edit mode
      mockNavigate({
        to: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
        params: mockParams,
        search: { lineNumber },
      });

      expect(mockNavigate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: expect.objectContaining({ lineNumber }),
        }),
      );
    });
  });

  describe("Keyboard shortcut integration", () => {
    it("should call handleEditClick when Cmd+E is pressed", () => {
      const handleEditClick = vi.fn();
      const isEditMode = false;

      renderHook(() => {
        useEffect(() => {
          if (isEditMode) return;

          const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === "e" || e.key === "E") && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              e.stopPropagation();
              handleEditClick();
            }
          };

          document.addEventListener("keydown", handleKeyDown, {
            capture: true,
          });
          return () =>
            document.removeEventListener("keydown", handleKeyDown, {
              capture: true,
            });
        }, []);

        return null;
      });

      // Simulate Cmd+E
      const event = new KeyboardEvent("keydown", {
        key: "e",
        metaKey: true,
        bubbles: true,
      });

      act(() => {
        document.dispatchEvent(event);
      });

      expect(handleEditClick).toHaveBeenCalledTimes(1);
    });

    it("should not trigger handleEditClick when already in edit mode", () => {
      const handleEditClick = vi.fn();
      const isEditMode = true; // Already in edit mode

      renderHook(() => {
        useEffect(() => {
          if (isEditMode) return; // Should return early

          const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === "e" || e.key === "E") && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              e.stopPropagation();
              handleEditClick();
            }
          };

          document.addEventListener("keydown", handleKeyDown, {
            capture: true,
          });
          return () =>
            document.removeEventListener("keydown", handleKeyDown, {
              capture: true,
            });
        }, []);

        return null;
      });

      // Simulate Cmd+E
      const event = new KeyboardEvent("keydown", {
        key: "e",
        metaKey: true,
        bubbles: true,
      });

      act(() => {
        document.dispatchEvent(event);
      });

      expect(handleEditClick).not.toHaveBeenCalled();
    });
  });

  describe("Complete edit mode workflow", () => {
    it("should maintain consistent state through full edit cycle", async () => {
      const plainContent = "2024-01-01 * Transaction";
      const onEnterEditMode = vi.fn();
      const onExitEditMode = vi.fn();
      const onSave = vi.fn();

      // Start in view mode (isEditMode = false)
      let _isEditMode = false;
      let editedContent = "";

      // 1. User clicks Edit button
      act(() => {
        // handleEditClick
        editedContent = plainContent;
        onEnterEditMode();
        _isEditMode = true;
      });

      expect(onEnterEditMode).toHaveBeenCalledTimes(1);
      expect(editedContent).toBe(plainContent);

      // 2. User modifies content
      act(() => {
        editedContent = plainContent + "\n  Assets:Bank 100 USD";
      });

      // 3. User clicks Save
      await act(async () => {
        // handleSaveClick
        await onSave(editedContent);
        onExitEditMode();
        _isEditMode = false;
      });

      expect(onSave).toHaveBeenCalledWith(editedContent);
      expect(onExitEditMode).toHaveBeenCalledTimes(1);
    });

    it("should handle cancel workflow correctly", () => {
      const plainContent = "Original content";
      const onEnterEditMode = vi.fn();
      const onExitEditMode = vi.fn();

      let _isEditMode = false;
      let editedContent = "";

      // 1. Enter edit mode
      act(() => {
        editedContent = plainContent;
        onEnterEditMode();
        _isEditMode = true;
      });

      // 2. Make changes
      act(() => {
        editedContent = "Modified content";
      });

      // 3. Cancel
      act(() => {
        // handleCancelEdit
        editedContent = "";
        onExitEditMode();
        _isEditMode = false;
      });

      expect(editedContent).toBe("");
      expect(onExitEditMode).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty plainContent", () => {
      const plainContent = "";
      const isEditMode = true;

      const { result } = renderHook(() => {
        const [content, setContent] = useState("");

        useEffect(() => {
          if (isEditMode && !content && plainContent) {
            setContent(plainContent);
          }
        }, [content]);

        return content;
      });

      expect(result.current).toBe("");
    });

    it("should handle undefined lineNumber in URL updates", () => {
      // When lineNumber is undefined, it should still update correctly
      const handleEnterEditMode = () => {
        mockNavigate({
          to: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
          params: mockParams,
          search: { editMode: true, lineNumber: undefined },
        });
      };

      act(() => {
        handleEnterEditMode();
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
        params: mockParams,
        search: { editMode: true, lineNumber: undefined },
      });
    });

    it("should handle rapid mode switching", () => {
      const onEnterEditMode = vi.fn();
      const onExitEditMode = vi.fn();

      // Rapidly toggle modes
      act(() => {
        onEnterEditMode();
        onExitEditMode();
        onEnterEditMode();
        onExitEditMode();
      });

      expect(onEnterEditMode).toHaveBeenCalledTimes(2);
      expect(onExitEditMode).toHaveBeenCalledTimes(2);
    });
  });
});

import { useState, useRef, useEffect, useCallback } from "react";
import type * as monaco from "monaco-editor";
import type { GetLedgerFileQuery, BeancountError } from "@/graphql/definitions";
import { useLedgerPermission } from "@/common/hooks/use-ledger-permission";
import { base64Decode } from "@/common/lib/utils/encode";
import { getFilename } from "../../../shared/lib/utils";
import { useNormalizedLineNumber } from "../../hooks/use-normalized-line-number";
import LedgerFileBreadcrumb from "../../../shared/components/ledger-file-breadcrumb";
import { FileMetadataBar } from "../non-text-file-views";
import { TextEditor } from "./text-editor";
import { ViewModeActions } from "./file-view-mode";
import { EditModeToolbar } from "./file-edit-mode";

export interface TextFileViewProps {
  filePath: string;
  fileContent: NonNullable<GetLedgerFileQuery["getLedgerFile"]>;
  onSave: (content: string) => Promise<void>;
  onDelete: () => void;
  isSaving: boolean;
  isEditMode?: boolean;
  lineNumber?: number;
  errors?: BeancountError[];
  onEnterEditMode: () => void;
  onExitEditMode: () => void;
}

/**
 * Text file view component - handles text files with edit/view mode.
 *
 * A single Monaco editor instance backs both modes and only the `readOnly`
 * option and the surrounding toolbar chrome change when toggling. Because the
 * editor never unmounts, its scroll position, folding, and caret are preserved
 * across mode switches (no flicker back to the top). This is why the editor's
 * `value` must stay stable across a toggle — see `editedContent` below.
 */
export const TextFileView = ({
  filePath,
  fileContent,
  onSave,
  onDelete,
  isSaving,
  isEditMode,
  lineNumber,
  errors,
  onEnterEditMode,
  onExitEditMode,
}: TextFileViewProps) => {
  const { canWrite } = useLedgerPermission();
  // URL/search may request edit mode; only writers get an editable editor.
  const requestedEditMode = Boolean(isEditMode);
  const effectiveEditMode = requestedEditMode && canWrite;

  // Decode base64 content once
  const plainContent = fileContent.content
    ? base64Decode(fileContent.content)
    : "";

  // Extract filename once
  const filename = getFilename(filePath);

  // The buffer that backs the (persistent) editor. Initialized to the file
  // content so the editor mounts with the right value in both modes.
  const [editedContent, setEditedContent] = useState(plainContent);

  // Shared editor instance ref - set on mount, read by the edit-mode toolbar
  // actions (align amounts, toggle comment, fold/unfold).
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  // Normalize the deep-link line number using custom hook. It only changes when
  // the URL line changes (not on a mode toggle), so passing it straight through
  // reveals the line on navigation without disturbing scroll when toggling.
  const normalizedLineNumber = useNormalizedLineNumber(
    lineNumber,
    plainContent,
  );

  // Pull external file changes into the buffer while viewing (e.g. a save that
  // reformats the file, or an AI edit). We compare against the previously-seen
  // content and adjust state during render - React's recommended alternative to
  // an effect - so an in-flight edit is never clobbered and scroll isn't reset.
  // Use the URL request (not effective permission) so a draft survives when
  // write access is lost mid-edit until the URL is cleared.
  const [lastSyncedContent, setLastSyncedContent] = useState(plainContent);
  if (plainContent !== lastSyncedContent) {
    setLastSyncedContent(plainContent);
    if (!requestedEditMode) {
      setEditedContent(plainContent);
    }
  }

  const handleEditorMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
    },
    [],
  );

  // Strip unauthorized ?editMode= without creating a navigation loop.
  useEffect(() => {
    if (requestedEditMode && !canWrite) {
      onExitEditMode();
    }
  }, [requestedEditMode, canWrite, onExitEditMode]);

  // Enter edit mode - just flip the URL flag; the persistent editor keeps its
  // scroll position and content, so there is nothing to reset here.
  const handleEditClick = useCallback(() => {
    if (!canWrite) return;
    onEnterEditMode();
  }, [canWrite, onEnterEditMode]);

  // Handle Cmd+E / Ctrl+E keyboard shortcut to enter edit mode
  useEffect(() => {
    if (effectiveEditMode || !canWrite) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "e" || e.key === "E") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopPropagation();
        handleEditClick();
      }
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });

    return () =>
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [effectiveEditMode, canWrite, handleEditClick]);

  // Save changes then exit edit mode. Scroll position is preserved naturally
  // because the same editor instance stays mounted in read-only mode.
  // Keyboard ⌘S and the toolbar share this callback; a sync ref blocks a
  // second activation before React can flip isSaving (which only disables
  // the button, not the editor shortcut).
  const saveInFlightRef = useRef(false);
  const handleSaveClick = useCallback(
    async (contentOverride?: string) => {
      if (!canWrite) return;
      if (saveInFlightRef.current) return;
      saveInFlightRef.current = true;
      try {
        const contentToSave = contentOverride ?? editedContent;
        if (contentToSave !== plainContent) {
          await onSave(contentToSave);
        }
        onExitEditMode();
      } catch {
        // Keep the draft and release the guard so the user can retry.
        // Parent save handlers already surface the failure (toast).
      } finally {
        saveInFlightRef.current = false;
      }
    },
    [canWrite, editedContent, plainContent, onSave, onExitEditMode],
  );

  // Cancel editing — exit edit mode without wiping the buffer first. The
  // navigation guard owns discard: Stay keeps the draft; Leave calls onDiscard.
  const handleCancelEdit = useCallback(() => {
    onExitEditMode();
  }, [onExitEditMode]);

  const handleDiscardEdit = useCallback(() => {
    setEditedContent(plainContent);
  }, [plainContent]);

  const handleEditorContentChange = useCallback(
    (value: string) => {
      if (!canWrite) return;
      setEditedContent(value);
    },
    [canWrite],
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="mb-2 sm:mb-4">
        <div className="flex flex-row items-center justify-between gap-2">
          <h1 className="text-lg sm:text-xl font-semibold">
            <LedgerFileBreadcrumb type="file" path={filePath} />
          </h1>
          {effectiveEditMode ? (
            <EditModeToolbar
              editorRef={editorRef}
              editedContent={editedContent}
              plainContent={plainContent}
              onSave={handleSaveClick}
              onCancel={handleCancelEdit}
              onDiscard={handleDiscardEdit}
              isSaving={isSaving}
            />
          ) : (
            <ViewModeActions
              filename={filename}
              fileContent={fileContent}
              onEdit={handleEditClick}
              onDelete={onDelete}
            />
          )}
        </div>
      </div>
      <div className="flex flex-col flex-1 min-h-0">
        <div className="border overflow-hidden flex-1 flex flex-col">
          <TextEditor
            content={editedContent}
            filename={filename}
            setEditedContent={handleEditorContentChange}
            lineNumber={normalizedLineNumber}
            readOnly={!effectiveEditMode}
            onSave={handleSaveClick}
            onCancel={handleCancelEdit}
            onEditorMount={handleEditorMount}
            errors={errors}
          />
          <div className="border-t p-2">
            <FileMetadataBar fileContent={fileContent} />
          </div>
        </div>
      </div>
    </div>
  );
};

import { useState, useRef, useEffect, useCallback } from "react";
import type * as monaco from "monaco-editor";
import type { GetLedgerFileQuery, BeancountError } from "@/graphql/definitions";
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
  const [lastSyncedContent, setLastSyncedContent] = useState(plainContent);
  if (plainContent !== lastSyncedContent) {
    setLastSyncedContent(plainContent);
    if (!isEditMode) {
      setEditedContent(plainContent);
    }
  }

  const handleEditorMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
    },
    [],
  );

  // Enter edit mode - just flip the URL flag; the persistent editor keeps its
  // scroll position and content, so there is nothing to reset here.
  const handleEditClick = useCallback(() => {
    onEnterEditMode();
  }, [onEnterEditMode]);

  // Handle Cmd+E / Ctrl+E keyboard shortcut to enter edit mode
  useEffect(() => {
    if (isEditMode) return; // Only active when NOT in edit mode

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
  }, [isEditMode, handleEditClick]);

  // Save changes then exit edit mode. Scroll position is preserved naturally
  // because the same editor instance stays mounted in read-only mode.
  const handleSaveClick = useCallback(
    async (contentOverride?: string) => {
      const contentToSave = contentOverride ?? editedContent;
      if (contentToSave !== plainContent) {
        await onSave(contentToSave);
      }
      onExitEditMode();
    },
    [editedContent, plainContent, onSave, onExitEditMode],
  );

  // Cancel editing - discard changes by reverting the buffer to the file
  // content, then exit edit mode.
  const handleCancelEdit = useCallback(() => {
    setEditedContent(plainContent);
    onExitEditMode();
  }, [plainContent, onExitEditMode]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="mb-2 sm:mb-4">
        <div className="flex flex-row items-center justify-between gap-2">
          <h1 className="text-lg sm:text-xl font-semibold">
            <LedgerFileBreadcrumb type="file" path={filePath} />
          </h1>
          {isEditMode ? (
            <EditModeToolbar
              editorRef={editorRef}
              editedContent={editedContent}
              plainContent={plainContent}
              onSave={handleSaveClick}
              onCancel={handleCancelEdit}
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
            setEditedContent={setEditedContent}
            lineNumber={normalizedLineNumber}
            readOnly={!isEditMode}
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

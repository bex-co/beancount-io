import type { FileError } from "./text-editor-utils";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type * as monaco from "monaco-editor";
import type { GetLedgerFileQuery } from "@/graphql/definitions";
import { useLedgerPermission } from "@/common/hooks/use-ledger-permission";
import { base64Decode } from "@/common/lib/utils/encode";
import { cn } from "@/common/lib/utils/utils";
import { getFilename } from "../../../shared/lib/utils";
import { useNormalizedLineNumber } from "../../hooks/use-normalized-line-number";
import LedgerFileBreadcrumb from "../../../shared/components/ledger-file-breadcrumb";
import { FileMetadataBar } from "../non-text-file-views";
import { TextEditor } from "./text-editor";
import { ViewModeActions } from "./file-view-mode";
import { EditModeToolbar } from "./file-edit-mode";

type FileRevision = NonNullable<GetLedgerFileQuery["getLedgerFile"]>;

export interface TextFileViewProps {
  filePath: string;
  fileContent: FileRevision;
  /** Saves `content` against `base`, the revision it was edited from. */
  onSave: (content: string, base: FileRevision) => Promise<void>;
  /** Absent when the file cannot be deleted (the ledger's root main.bean). */
  onDelete?: () => void | Promise<void>;
  isSaving: boolean;
  isEditMode?: boolean;
  readOnly?: boolean;
  lineNumber?: number;
  errors?: FileError[];
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
  readOnly = false,
  lineNumber,
  errors,
  onEnterEditMode,
  onExitEditMode,
}: TextFileViewProps) => {
  const { canWrite } = useLedgerPermission();
  const canEdit = canWrite && !readOnly;
  // A URL request cannot enable editing for a content-sniffed preview.
  const requestedEditMode = Boolean(isEditMode);
  const effectiveEditMode = requestedEditMode && canEdit;

  // Decode base64 content once per revision, not on every keystroke.
  const plainContent = useMemo(
    () => (fileContent.content ? base64Decode(fileContent.content) : ""),
    [fileContent.content],
  );

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

  // The revision the buffer was edited against. Pull external file changes
  // into the buffer (a save that reformats the file, an AI edit, Out of date →
  // Refresh) unless it holds an unsaved draft: then the draft keeps its base,
  // so Save sends that revision's SHA and the server refuses a stale write
  // rather than overwriting the newer file (w4/m46). Adjusting state during
  // render - React's recommended alternative to an effect - never clobbers an
  // in-flight edit or resets scroll. The URL request (not effective
  // permission) decides, so a draft survives when write access is lost
  // mid-edit until the URL is cleared.
  const [base, setBase] = useState(fileContent);
  const basePlain = useMemo(
    () => (base.content ? base64Decode(base.content) : ""),
    [base.content],
  );
  if (base.sha !== fileContent.sha || base.content !== fileContent.content) {
    const hasDraft = editedContent !== basePlain;
    if (readOnly || !requestedEditMode || !hasDraft) {
      setBase(fileContent);
      setEditedContent(plainContent);
    }
  }

  const handleEditorMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
    },
    [],
  );

  // Strip unauthorized or preview-only ?editMode= without a navigation loop.
  useEffect(() => {
    if (requestedEditMode && !canEdit) {
      onExitEditMode();
    }
  }, [requestedEditMode, canEdit, onExitEditMode]);

  // Enter edit mode - just flip the URL flag; the persistent editor keeps its
  // scroll position and content, so there is nothing to reset here.
  const handleEditClick = useCallback(() => {
    if (!canEdit) return;
    savedExitRef.current = false;
    onEnterEditMode();
  }, [canEdit, onEnterEditMode]);

  // Handle Cmd+E / Ctrl+E keyboard shortcut to enter edit mode
  useEffect(() => {
    if (effectiveEditMode || !canEdit) return;

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
  }, [effectiveEditMode, canEdit, handleEditClick]);

  // Save changes then exit edit mode. Scroll position is preserved naturally
  // because the same editor instance stays mounted in read-only mode.
  // Keyboard ⌘S and the toolbar share this callback; a sync ref blocks a
  // second activation before React can flip isSaving (which only disables
  // the button, not the editor shortcut).
  //
  // While the write is pending the editor is read-only: an edit accepted then
  // would be lost when the saved file reloads (w4/241). Once the write lands,
  // the buffer is exactly what was saved, so its own exit is let past the
  // unsaved-changes guard, which still compares against the pre-save file.
  const saveInFlightRef = useRef(false);
  const [savePending, setSavePending] = useState(false);
  const editorReadOnly = !effectiveEditMode || savePending;
  const savedExitRef = useRef(false);
  const handleSaveClick = useCallback(
    async (contentOverride?: string) => {
      if (!canEdit) return;
      if (saveInFlightRef.current) return;
      saveInFlightRef.current = true;
      savedExitRef.current = false;
      setSavePending(true);
      try {
        const contentToSave = contentOverride ?? editedContent;
        if (contentToSave !== basePlain) {
          await onSave(contentToSave, base);
        }
        savedExitRef.current = true;
        onExitEditMode();
      } catch {
        // Keep the draft and release the guard so the user can retry.
        // Parent save handlers already surface the failure (toast).
      } finally {
        saveInFlightRef.current = false;
        setSavePending(false);
      }
    },
    [canEdit, editedContent, basePlain, base, onSave, onExitEditMode],
  );

  // Cancel editing — exit edit mode without wiping the buffer first. The
  // navigation guard owns discard: Stay keeps the draft; Leave calls onDiscard.
  const handleCancelEdit = useCallback(() => {
    onExitEditMode();
  }, [onExitEditMode]);

  // Discarding is the explicit decision to take the current file instead.
  const handleDiscardEdit = useCallback(() => {
    setBase(fileContent);
    setEditedContent(plainContent);
  }, [fileContent, plainContent]);

  const handleEditorContentChange = useCallback(
    (value: string) => {
      if (!canEdit || saveInFlightRef.current) return;
      setEditedContent(value);
    },
    [canEdit],
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
              plainContent={basePlain}
              onSave={handleSaveClick}
              onCancel={handleCancelEdit}
              onDiscard={handleDiscardEdit}
              isSaving={isSaving || savePending}
              savedExitRef={savedExitRef}
            />
          ) : (
            <ViewModeActions
              filename={filename}
              fileContent={fileContent}
              onEdit={handleEditClick}
              onDelete={onDelete}
              canEdit={canEdit}
            />
          )}
        </div>
      </div>
      <div className="flex flex-col flex-1 min-h-0">
        <div
          className={cn(
            "border overflow-hidden flex-1 flex flex-col",
            // A read-only editor hides its cursor, and its own focus outline
            // sits on a 1px input (Monaco's edit-context div, or its textarea)
            // under the sticky headings, so keyboard focus showed nowhere.
            // Mark the frame instead, as the app's baseline ring does
            // (w4/1053).
            editorReadOnly &&
              "has-[.monaco-editor_:is(textarea,.native-edit-context):focus-visible]:outline-2 has-[.monaco-editor_:is(textarea,.native-edit-context):focus-visible]:outline-offset-2 has-[.monaco-editor_:is(textarea,.native-edit-context):focus-visible]:outline-ring",
          )}
        >
          {/* The editor gets whatever height the metadata bar does not need,
              and can shrink (min-h-0) when the viewport does. Without this the
              library's own 100%-height wrapper keeps the allocation it was
              first given, so shrinking the viewport pushes the footer out of
              this clipped box instead of resizing the editor. */}
          <div className="min-h-0 flex-1">
            <TextEditor
              content={readOnly ? plainContent : editedContent}
              filename={filename}
              setEditedContent={handleEditorContentChange}
              lineNumber={normalizedLineNumber}
              readOnly={editorReadOnly}
              onSave={handleSaveClick}
              onCancel={handleCancelEdit}
              onEditorMount={handleEditorMount}
              errors={errors}
            />
          </div>
          <div className="shrink-0 border-t p-2">
            <FileMetadataBar fileContent={fileContent} />
          </div>
        </div>
      </div>
    </div>
  );
};

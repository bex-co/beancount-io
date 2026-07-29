import type { GetLedgerFileQuery, BeancountError } from "@/graphql/definitions";
import {
  ImageFileView,
  PDFFileView,
  UnknownFileView,
} from "../non-text-file-views";
import { getFilename, getFileType } from "../../../shared/lib/utils";
import { TextFileView } from "./text-file-view";

export interface FileContentViewProps {
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
 * File content view component - coordinator component that determines file type
 * and delegates to appropriate view component
 * - Non-text files (images, PDFs, unknown) → view-only components
 * - Text files → TextFileView with edit capability
 */
export function FileContentView({
  filePath,
  fileContent,
  onSave,
  onDelete,
  isSaving,
  isEditMode: isEditModeInput,
  lineNumber,
  errors,
  onEnterEditMode,
  onExitEditMode,
}: FileContentViewProps) {
  const filename = getFilename(filePath);

  // Determine file type based on filename
  const fileType = getFileType(filename);

  // Delegate to appropriate view component based on file type
  if (fileType === "image") {
    return (
      <ImageFileView
        filePath={filePath}
        fileContent={fileContent}
        onDelete={onDelete}
      />
    );
  }

  if (fileType === "pdf") {
    return (
      <PDFFileView
        filePath={filePath}
        fileContent={fileContent}
        onDelete={onDelete}
      />
    );
  }

  if (fileType === "unknown") {
    return (
      <UnknownFileView
        filePath={filePath}
        fileContent={fileContent}
        onDelete={onDelete}
      />
    );
  }

  // Text files: delegate to TextFileView which handles edit/view mode
  return (
    <TextFileView
      filePath={filePath}
      fileContent={fileContent}
      onSave={onSave}
      onDelete={onDelete}
      isSaving={isSaving}
      isEditMode={isEditModeInput}
      lineNumber={lineNumber}
      errors={errors}
      onEnterEditMode={onEnterEditMode}
      onExitEditMode={onExitEditMode}
    />
  );
}

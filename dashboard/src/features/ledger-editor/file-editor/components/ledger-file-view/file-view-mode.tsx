import type { GetLedgerFileQuery } from "@/graphql/definitions";
import { FileActionButtons } from "../non-text-file-views";
import { downloadFile } from "../../../shared/lib/utils";

export interface ViewModeActionsProps {
  filename: string;
  fileContent: NonNullable<GetLedgerFileQuery["getLedgerFile"]>;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * View-mode toolbar - the Edit / Download / Delete actions shown next to the
 * breadcrumb when a text file is displayed in read-only mode. The editor itself
 * is rendered once by `TextFileView` and shared across modes.
 */
export function ViewModeActions({
  filename,
  fileContent,
  onEdit,
  onDelete,
}: ViewModeActionsProps) {
  const handleDownloadClick = () => {
    if (!fileContent.content) return;
    downloadFile(filename, fileContent.content);
  };

  return (
    <FileActionButtons
      filename={filename}
      fileContent={fileContent}
      onDownload={handleDownloadClick}
      onDelete={onDelete}
      canEdit={true}
      onEdit={onEdit}
    />
  );
}

import { useState } from "react";
import type { GetLedgerFileQuery } from "@/graphql/definitions";
import { Button } from "@/common/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import {
  FileText,
  Calendar,
  HardDrive,
  GitCommit,
  Edit,
  Download,
  Trash2,
  EllipsisVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/common/components/ui/dropdown-menu";
import { formatDateTime } from "@/common/lib/format";
import {
  formatFileSize,
  getFileExtension,
  downloadFile,
  getFilename,
} from "../../shared/lib/utils";
import LedgerFileBreadcrumb from "../../shared/components/ledger-file-breadcrumb";
import { useTranslations } from "@/common/hooks/use-translations";
import { LedgerWritePermission } from "@/common/components/ledger-permission/write";
import { useIsMac } from "../hooks/use-platform";

export interface NonTextFileViewProps {
  filePath: string;
  fileContent: NonNullable<GetLedgerFileQuery["getLedgerFile"]>;
  onDelete: () => void;
}

interface FileMetadataBarProps {
  fileContent: NonNullable<GetLedgerFileQuery["getLedgerFile"]>;
}

interface FileActionButtonsProps {
  filename: string;
  fileContent: NonNullable<GetLedgerFileQuery["getLedgerFile"]>;
  onDownload: () => void;
  onDelete: () => void;
  canEdit?: boolean;
  onEdit?: () => void;
}

/**
 * File metadata bar component - displays file size, commit date, and commit SHA
 */
export const FileMetadataBar = ({ fileContent }: FileMetadataBarProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <HardDrive className="h-3 w-3 shrink-0" />
        <span className="truncate">{formatFileSize(fileContent.size)}</span>
      </div>
      {formatDateTime(fileContent.lastCommitterDate) && (
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {formatDateTime(fileContent.lastCommitterDate)}
          </span>
        </div>
      )}
      <div className="hidden sm:flex items-center gap-1">
        <GitCommit className="h-3 w-3 shrink-0" />
        <span className="truncate">
          {fileContent.lastCommitSha
            ? fileContent.lastCommitSha.substring(0, 8)
            : ""}
        </span>
      </div>
    </div>
  );
};

/**
 * File action buttons component - displays Edit, Download, and Delete buttons
 */
export const FileActionButtons = ({
  filename,
  fileContent,
  onDownload,
  onDelete,
  canEdit = false,
  onEdit,
}: FileActionButtonsProps) => {
  const { t } = useTranslations();
  const isMac = useIsMac();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    onDelete();
    setIsDeleteDialogOpen(false);
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {canEdit && onEdit && (
            <LedgerWritePermission>
              <Button
                variant="default"
                size="sm"
                onClick={onEdit}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                <span className="hidden md:inline">{t("common.edit")}</span>
                <span className="ml-auto text-xs tracking-widest text-primary-foreground/70 hidden sm:inline">
                  {isMac ? "⌘E" : "Ctrl+E"}
                </span>
              </Button>
            </LedgerWritePermission>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="size-8 p-0">
                <EllipsisVertical className="h-4 w-4" />
                <span className="sr-only">{t("common.moreActions")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={onDownload}
                disabled={!fileContent.content}
              >
                <Download className="h-4 w-4" />
                {t("common.download")}
              </DropdownMenuItem>
              <LedgerWritePermission>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={handleDeleteClick}
                >
                  <Trash2 className="h-4 w-4" />
                  {t("common.delete")}
                </DropdownMenuItem>
              </LedgerWritePermission>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("ledgerEditor.deleteFileTitle")}</DialogTitle>
            <DialogDescription className="wrap-break-word">
              {t("ledgerEditor.deleteFileConfirmation", {
                filename,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleCancelDelete}
              className="w-full sm:w-auto"
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              className="w-full sm:w-auto"
            >
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

/**
 * Image file view component - displays image files
 */
export const ImageFileView = ({
  filePath,
  fileContent,
  onDelete,
}: NonTextFileViewProps) => {
  const { t } = useTranslations();
  const filename = getFilename(filePath);

  const handleDownloadClick = () => {
    if (!fileContent.content) return;
    downloadFile(filename, fileContent.content);
  };

  const renderImageContent = () => {
    if (!fileContent.content) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {t("ledgerEditor.fileContentEmpty")}
            </p>
          </div>
        </div>
      );
    }

    try {
      const imageData = `data:image/${getFileExtension(filename)};base64,${fileContent.content}`;
      return (
        <div className="flex justify-center p-2">
          <img
            src={imageData}
            alt={filename}
            className="max-w-full max-h-64 sm:max-h-96 object-contain rounded-lg border"
          />
        </div>
      );
    } catch {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {t("ledgerEditor.unableToDisplayImage")}
            </p>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
          <h2 className="text-lg sm:text-xl font-semibold">
            <LedgerFileBreadcrumb type="file" path={filePath} />
          </h2>
          <FileActionButtons
            filename={filename}
            fileContent={fileContent}
            onDownload={handleDownloadClick}
            onDelete={onDelete}
            canEdit={false}
          />
        </div>
        <FileMetadataBar fileContent={fileContent} />
      </div>
      <div className="flex flex-col flex-1">{renderImageContent()}</div>
    </div>
  );
};

/**
 * PDF file view component - displays PDF files
 */
export const PDFFileView = ({
  filePath,
  fileContent,
  onDelete,
}: NonTextFileViewProps) => {
  const { t } = useTranslations();
  const filename = getFilename(filePath);

  const handleDownloadClick = () => {
    if (!fileContent.content) return;
    downloadFile(filename, fileContent.content);
  };

  const renderPDFContent = () => {
    if (!fileContent.content) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {t("ledgerEditor.fileContentEmpty")}
            </p>
          </div>
        </div>
      );
    }

    const src = `data:application/pdf;base64,${fileContent.content}`;
    return <iframe src={src} width="100%" height="600px" title={filename} />;
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
          <h2 className="text-lg sm:text-xl font-semibold">
            <LedgerFileBreadcrumb type="file" path={filePath} />
          </h2>
          <FileActionButtons
            filename={filename}
            fileContent={fileContent}
            onDownload={handleDownloadClick}
            onDelete={onDelete}
            canEdit={false}
          />
        </div>
        <FileMetadataBar fileContent={fileContent} />
      </div>
      <div className="flex flex-col flex-1">{renderPDFContent()}</div>
    </div>
  );
};

/**
 * Unknown file view component - displays unsupported file types
 */
export const UnknownFileView = ({
  filePath,
  fileContent,
  onDelete,
}: NonTextFileViewProps) => {
  const filename = getFilename(filePath);
  const { t } = useTranslations();

  const handleDownloadClick = () => {
    if (!fileContent.content) return;
    downloadFile(filename, fileContent.content);
  };

  const renderUnknownContent = () => {
    const ext = getFileExtension(filename);
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">
            {t("ledgerEditor.unsupportedFileFormat")}
          </p>
          <p className="text-sm text-muted-foreground">
            {ext
              ? t("ledgerEditor.unsupportedPreviewWithType", { type: ext })
              : t("ledgerEditor.unsupportedPreview")}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
          <h2 className="text-lg sm:text-xl font-semibold">
            <LedgerFileBreadcrumb type="file" path={filePath} />
          </h2>
          <FileActionButtons
            filename={filename}
            fileContent={fileContent}
            onDownload={handleDownloadClick}
            onDelete={onDelete}
            canEdit={false}
          />
        </div>
        <FileMetadataBar fileContent={fileContent} />
      </div>
      <div className="flex flex-col flex-1">{renderUnknownContent()}</div>
    </div>
  );
};

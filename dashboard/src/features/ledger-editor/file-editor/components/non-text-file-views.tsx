import { useRef, useState } from "react";
import { toast } from "sonner";
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
  Lock,
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
  downloadableContent,
  getFilename,
} from "../../shared/lib/utils";
import LedgerFileBreadcrumb from "../../shared/components/ledger-file-breadcrumb";
import { useTranslations } from "@/common/hooks/use-translations";
import { LedgerWritePermission } from "@/common/components/ledger-permission/write";
import { useIsMac } from "../hooks/use-platform";
import { imageMimeType } from "@/common/lib/image-mime-type";
import { restoreFocusOnDialogClose } from "@/common/lib/focus/restore-focus-on-dialog-close";

export interface NonTextFileViewProps {
  filePath: string;
  fileContent: NonNullable<GetLedgerFileQuery["getLedgerFile"]>;
  /** Absent when the file cannot be deleted (the ledger's root main.bean). */
  onDelete?: () => void | Promise<void>;
}

interface FileMetadataBarProps {
  fileContent: NonNullable<GetLedgerFileQuery["getLedgerFile"]>;
}

interface FileActionButtonsProps {
  filename: string;
  fileContent: NonNullable<GetLedgerFileQuery["getLedgerFile"]>;
  onDownload: () => void;
  /** Absent when the file cannot be deleted (the ledger's root main.bean). */
  onDelete?: () => void | Promise<void>;
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
  const moreActionsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const deleteConfirmedRef = useRef(false);

  const handleDeleteClick = () => {
    deleteConfirmedRef.current = false;
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    deleteConfirmedRef.current = true;
    setIsDeleteDialogOpen(false);
    try {
      await onDelete?.();
    } catch {
      // The delete reported its own failure and this file is still here:
      // give a reader whose focus was lost the actions back, not the top of
      // the page (w4/306). A deliberate move while waiting is kept.
      const active = document.activeElement;
      if (!active || active === document.body) {
        moreActionsTriggerRef.current?.focus();
      }
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
  };

  // Building the local file can fail in the browser. Say so; the file and
  // its enabled Download stay for another try (w4/987).
  const handleDownload = () => {
    try {
      onDownload();
    } catch {
      toast.error(t("ledgerEditor.fileDownloadFailed", { filename }));
    }
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
                // The visible label and shortcut hide at narrow widths; the
                // name must not depend on CSS breakpoints (w4/240).
                aria-label={t("common.edit")}
                aria-keyshortcuts={isMac ? "Meta+E" : "Control+E"}
              >
                <Edit aria-hidden="true" className="h-4 w-4" />
                <span className="hidden md:inline">{t("common.edit")}</span>
                <span className="ml-auto text-xs tracking-widest text-primary-foreground/70 hidden sm:inline">
                  {isMac ? "⌘E" : "Ctrl+E"}
                </span>
              </Button>
            </LedgerWritePermission>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                ref={moreActionsTriggerRef}
                variant="outline"
                size="sm"
                className="size-8 p-0"
              >
                <EllipsisVertical className="h-4 w-4" />
                <span className="sr-only">{t("common.moreActions")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleDownload}
                disabled={downloadableContent(fileContent) === null}
              >
                <Download className="h-4 w-4" />
                {t("common.download")}
              </DropdownMenuItem>
              <LedgerWritePermission>
                <DropdownMenuSeparator />
                {onDelete ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={handleDeleteClick}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("common.delete")}
                  </DropdownMenuItem>
                ) : (
                  // The server always refuses; say why instead of offering it.
                  <DropdownMenuItem disabled className="items-start">
                    <Lock className="mt-0.5 h-4 w-4" />
                    <span className="flex flex-col">
                      <span>{t("common.delete")}</span>
                      <span className="text-xs text-muted-foreground">
                        {t("ledgerEditor.rootFileCannotBeDeleted", {
                          filename,
                        })}
                      </span>
                    </span>
                  </DropdownMenuItem>
                )}
              </LedgerWritePermission>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent
          className="sm:max-w-md"
          onCloseAutoFocus={(event) => {
            if (deleteConfirmedRef.current) {
              deleteConfirmedRef.current = false;
              // A confirmed delete owns navigation: once it has left this
              // page, the new route keeps its focus. While it is still
              // pending the actions stay usable (w4/306).
              event.preventDefault();
              moreActionsTriggerRef.current?.focus();
              return;
            }
            restoreFocusOnDialogClose(event, moreActionsTriggerRef.current);
          }}
        >
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
    const content = downloadableContent(fileContent);
    if (content === null) return;
    downloadFile(filename, content);
  };

  const [failedImage, setFailedImage] = useState<string | null>(null);

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

    // The MIME type, not the bare extension: `image/svg` is not a type, so
    // an SVG never decoded (w4/258). A failed decode shows the fallback
    // rather than a broken image; a different file gets a fresh attempt.
    const imageData = `data:${imageMimeType(filename) ?? "application/octet-stream"};base64,${fileContent.content}`;
    if (failedImage === imageData) {
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
    return (
      <div className="flex justify-center p-2">
        <img
          src={imageData}
          alt={filename}
          onError={() => setFailedImage(imageData)}
          className="max-w-full max-h-64 sm:max-h-96 object-contain rounded-lg border"
        />
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
    const content = downloadableContent(fileContent);
    if (content === null) return;
    downloadFile(filename, content);
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
  reason,
}: NonTextFileViewProps & {
  /** A known text type whose bytes are not UTF-8 (w4/276). */
  reason?: "notUtf8";
}) => {
  const filename = getFilename(filePath);
  const { t } = useTranslations();

  const handleDownloadClick = () => {
    const content = downloadableContent(fileContent);
    if (content === null) return;
    downloadFile(filename, content);
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
            {reason === "notUtf8"
              ? t("ledgerEditor.notUtf8Text")
              : ext
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

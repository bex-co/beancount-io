import { PageHeader } from "@/common/components/page-header";
import { RelatedLinks } from "@/common/components/related-links";
import { getLedgerFilesRootPath } from "@/common/hooks/use-file-navigate";
import { useState, useRef, useId, useMemo, useEffect } from "react";
import type { DragEvent } from "react";
import { useHydrated, useParams, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@apollo/client/react";
import { useRefreshDirectory } from "@/features/ledger-editor/shared/hooks/use-refresh-directory";
import { Card, CardContent } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { CreateLedgerFileDocument } from "@/graphql/definitions";

import { Upload, X, FileText, AlertCircle } from "lucide-react";
import type {
  CreateLedgerFileMutation,
  CreateLedgerFileMutationVariables,
} from "@/graphql/definitions";
import { cn } from "@/common/lib/utils/utils";
import { createLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { toast } from "sonner";
import { useLedger } from "@/common/hooks/use-ledger";
import { useLedgerPermission } from "@/common/hooks/use-ledger-permission";
import { WriteAccessRequired } from "@/features/ledger-editor/shared/components/write-access-required";
import { FolderNamesStatus } from "@/features/ledger-editor/shared/components/folder-names-status";
import { useFolderNames } from "@/features/ledger-editor/shared/hooks/use-folder-names";
import { formatFileSize } from "../shared/lib/utils";

// Maximum file size allowed (1MB)
const MAX_FILE_SIZE = 1024 * 1024; // 1MB in bytes

/** Stage `chosen`, a re-picked name replacing its earlier entry in place. */
function stageFiles(staged: File[], chosen: File[]): File[] {
  const incoming = new Map(chosen.map((file) => [file.name, file]));
  const replaced = staged.map((file) => incoming.get(file.name) ?? file);
  const stagedNames = new Set(staged.map((file) => file.name));
  return [
    ...replaced,
    ...[...incoming.values()].filter((file) => !stagedNames.has(file.name)),
  ];
}

/**
 * Upload Files Page Component - GitHub-style file upload interface
 */
const UploadFilesPage = () => {
  const params = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/files/upload/$branch/$",
  });
  const { ledgerOwner, ledgerName } = params;
  // The wildcard parameter captures the directory path after /upload/{branch}/
  // TanStack Router uses "_splat" as the key for splat parameters
  const dirPath = params._splat || "";

  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const navigate = useNavigate();
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const { ledgerName: ledgerDisplayName } = useLedger();
  // False for anonymous readers and while permissions are unresolved.
  const { canWrite } = useLedgerPermission();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [commitMessage, setCommitMessage] = useState("");
  const [isUploading, setIsUploadingState] = useState(false);
  // Synchronous twin of isUploading: a drop can land before React renders
  // the busy state. While a batch is in flight no new file is staged — the
  // success path leaves with exactly that batch (w4/259).
  const uploadingRef = useRef(false);
  // Leaving this page or its folder ends the upload journey, so an older
  // batch's late completion cannot take the reader away from where they went
  // (w4/305). Its writes still land.
  const journeyRef = useRef(0);
  useEffect(
    () => () => {
      journeyRef.current += 1;
    },
    [ledgerId, dirPath],
  );
  const setIsUploading = (busy: boolean) => {
    uploadingRef.current = busy;
    setIsUploadingState(busy);
  };
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // A server-rendered chooser does nothing until hydration attaches its
  // handler, and an early click is not replayed, so it waits (w4/1096).
  const hydrated = useHydrated();
  const uploadSizeLimitId = useId();
  const uploadClashId = useId();
  const folderCheckId = useId();
  /** Where the last upload stopped, and what it had already written. */
  const [uploadFailure, setUploadFailure] = useState<{
    fileName: string;
    reason: string;
    uploaded: string[];
  } | null>(null);

  // The folder's names: Gitea refuses to create a path that already exists.
  const folder = useFolderNames(ledgerId, dirPath);
  const existingNames = useMemo(() => new Set(folder.names), [folder.names]);

  const refreshDirectory = useRefreshDirectory(ledgerId, dirPath);
  const [createFileMutation] = useMutation<
    CreateLedgerFileMutation,
    CreateLedgerFileMutationVariables
  >(CreateLedgerFileDocument);

  const hasOversizedFiles = selectedFiles.some(
    (file) => file.size > MAX_FILE_SIZE,
  );
  const hasExistingFiles = selectedFiles.some((file) =>
    existingNames.has(file.name),
  );
  // Until the folder's names arrive, any chosen file might clash.
  const awaitsFolderCheck = selectedFiles.length > 0 && folder.names === null;
  const folderCheckShown = Boolean(folder.failure) || awaitsFolderCheck;

  // This also guards the handler before any file is read or sent.
  const isUploadDisabled =
    !canWrite ||
    selectedFiles.length === 0 ||
    isUploading ||
    hasOversizedFiles ||
    hasExistingFiles ||
    awaitsFolderCheck;

  /**
   * Handle cancel button click - navigate back to files view
   */
  const handleCancel = () => {
    void navigate({
      to: "/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$",
      params: {
        ledgerOwner,
        ledgerName,
        branch: "main",
        _splat: dirPath || "",
      },
    });
  };

  /**
   * Convert File to base64 string
   */
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove data:*/*;base64, prefix if present
        const base64Content = base64.slice(base64.indexOf(",") + 1);
        resolve(base64Content);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  /**
   * Handle file upload - create files one by one
   */
  const handleUpload = async () => {
    // Fail closed: a permission change while files are staged must stop the
    // write here too, without discarding the selection.
    if (!canWrite || isUploadDisabled) return;

    setIsUploading(true);
    setUploadFailure(null);
    const journey = journeyRef.current;
    const batch = selectedFiles;
    const message = commitMessage.trim() || `Upload ${batch.length} file(s)`;
    const uploaded: string[] = [];

    // One commit per file, in order. Each created file leaves the staged list
    // at once, so a failure leaves exactly what a retry still has to send.
    for (const file of batch) {
      const fullPath = dirPath ? `${dirPath}/${file.name}` : file.name;
      try {
        const content = await fileToBase64(file);
        await createFileMutation({
          variables: {
            ledgerId: ledgerId,
            path: fullPath,
            content: content,
            message: `${message} - ${file.name}`,
          },
        });
      } catch (error) {
        const failure = {
          fileName: file.name,
          reason: formatError(error),
          uploaded,
        };
        setUploadFailure(failure);
        // Files already written must count for the existing-name check.
        if (uploaded.length > 0) void refreshDirectory();
        toast.error(
          t("ledgerEditor.uploadStoppedAt", {
            fileName: failure.fileName,
            reason: failure.reason,
          }),
        );
        setIsUploading(false);
        return;
      }
      uploaded.push(file.name);
      setSelectedFiles((prev) => prev.filter((staged) => staged !== file));
    }

    // Only after every write: a failed folder read is not a failed upload.
    await refreshDirectory();
    setIsUploading(false);
    if (journey !== journeyRef.current) return;
    void navigate({
      to: "/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$",
      params: {
        ledgerOwner,
        ledgerName,
        branch: "main",
        _splat: dirPath || "",
      },
    });
  };

  /**
   * Handle file selection from input
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Snapshot before the reset below. `event.target.files` is a live
    // FileList, and clearing the input empties that same object, so reading it
    // inside the state updater let React run the read after the reset and the
    // selection disappeared.
    const chosen = event.target.files ? Array.from(event.target.files) : [];
    // Allow selecting the same path again after remove/cancel.
    event.target.value = "";
    if (chosen.length > 0 && !uploadingRef.current) {
      setSelectedFiles((prev) => stageFiles(prev, chosen));
    }
  };

  /**
   * Handle drag over event
   */
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (uploadingRef.current) {
      if (e.dataTransfer) e.dataTransfer.dropEffect = "none";
      return;
    }
    setIsDragging(true);
  };

  /**
   * Handle drag leave event
   */
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  /**
   * Handle file drop
   */
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (uploadingRef.current) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setSelectedFiles((prev) => stageFiles(prev, Array.from(files)));
    }
  };

  /**
   * Trigger file input click
   */
  const handleChooseFiles = () => {
    fileInputRef.current?.click();
  };

  /**
   * Remove a selected file
   */
  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // A reader who cannot write never gets the picker. Someone who loses access
  // with files staged keeps the selection — the guards above stop the write.
  if (!canWrite && selectedFiles.length === 0) {
    return (
      <div className="h-full flex flex-col space-y-4">
        <PageHeader
          title={t("ledgerEditor.uploadFiles")}
          description={t("common.pageDescription.uploadFiles", {
            ledgerName: ledgerDisplayName ?? ledgerName,
          })}
        />
        <WriteAccessRequired
          ledgerOwner={ledgerOwner}
          ledgerName={ledgerName}
          dirPath={dirPath}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      <PageHeader
        title={t("ledgerEditor.uploadFiles")}
        description={t("common.pageDescription.uploadFiles", {
          ledgerName: ledgerDisplayName ?? ledgerName,
        })}
      />
      {/* Header Section */}
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
          <span className="font-medium">{ledgerName}</span>
          {dirPath && (
            <>
              <span>/</span>
              <span className="truncate">{dirPath}</span>
            </>
          )}
          <span>/</span>
        </div>
      </div>

      {/* Upload Area */}
      <Card className="flex-1">
        <CardContent className="flex flex-col gap-6 h-full">
          {/* Drag and drop area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative border-2 border-dashed rounded-lg p-12 transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50",
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              disabled={!hydrated}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div className="space-y-2">
                <p className="text-base text-muted-foreground">
                  {t("ledgerEditor.dragFilesHere")}
                </p>

                <p className="text-sm text-muted-foreground">
                  {t("ledgerEditor.or")}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleChooseFiles}
                  disabled={isUploading || !hydrated}
                >
                  {t("ledgerEditor.chooseYourFiles")}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {t("ledgerEditor.maximumFileSize")}
                </p>
              </div>
            </div>
          </div>

          {/* Selected files list */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t("ledgerEditor.selectedFiles", {
                  count: selectedFiles.length,
                })}
              </Label>
              <div className="border rounded-lg divide-y">
                {selectedFiles.map((file, index) => {
                  const isOversized = file.size > MAX_FILE_SIZE;
                  const exists = existingNames.has(file.name);
                  return (
                    <div
                      key={file.name}
                      className={cn(
                        "flex items-center justify-between p-3 hover:bg-muted/50",
                        (isOversized || exists) && "bg-destructive/5",
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          ({formatFileSize(file.size, 1)})
                        </span>
                        {isOversized && (
                          <div className="flex items-center gap-1 text-destructive shrink-0">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">
                              {t("ledgerEditor.exceedsFileSizeLimit")}
                            </span>
                          </div>
                        )}
                        {exists && (
                          <div className="flex items-center gap-1 text-destructive shrink-0">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">
                              {t("ledgerEditor.fileAlreadyExists")}
                            </span>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(index)}
                        disabled={isUploading}
                        className="shrink-0"
                        aria-label={t("ledgerEditor.removeSelectedFile", {
                          fileName: file.name,
                        })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Commit message input */}
          <div className="space-y-2">
            <Label htmlFor="commit-message">
              {t("ledgerEditor.commitMessage")}
            </Label>
            <Input
              id="commit-message"
              type="text"
              placeholder={t("ledgerEditor.addFilesViaUpload")}
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              disabled={isUploading}
            />
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-4 border-t">
            {uploadFailure && (
              <Alert variant="destructive">
                <AlertDescription>
                  <p>
                    {t("ledgerEditor.uploadStoppedAt", {
                      fileName: uploadFailure.fileName,
                      reason: uploadFailure.reason,
                    })}
                  </p>
                  {uploadFailure.uploaded.length > 0 && (
                    <p>
                      {t("ledgerEditor.uploadedBeforeFailure", {
                        files: uploadFailure.uploaded.join(", "),
                      })}
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}
            {hasOversizedFiles && (
              <p id={uploadSizeLimitId} className="text-sm text-destructive">
                {t("ledgerEditor.removeOversizedFiles")}
              </p>
            )}
            {hasExistingFiles && (
              <p id={uploadClashId} className="text-sm text-destructive">
                {t("ledgerEditor.removeExistingFiles")}
              </p>
            )}
            <FolderNamesStatus
              id={folderCheckId}
              checking={awaitsFolderCheck}
              failure={folder.failure}
              retrying={folder.retrying}
              onRetry={folder.retry}
            />
            <div className="flex items-center gap-3">
              <Button
                variant="default"
                onClick={handleUpload}
                disabled={isUploadDisabled}
                aria-describedby={
                  [
                    hasOversizedFiles && uploadSizeLimitId,
                    hasExistingFiles && uploadClashId,
                    folderCheckShown && folderCheckId,
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                <span>
                  {isUploading
                    ? t("ledgerEditor.uploading")
                    : t("ledgerEditor.uploadFiles")}
                </span>
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isUploading}
              >
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <RelatedLinks
        links={[
          {
            label: t("common.relatedLinks.files"),
            to: getLedgerFilesRootPath(ledgerOwner, ledgerName),
          },
          {
            label: t("common.relatedLinks.createFile"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/files/create`,
          },
          {
            label: t("common.relatedLinks.journal"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/journal`,
          },
        ]}
      />
    </div>
  );
};

export default UploadFilesPage;

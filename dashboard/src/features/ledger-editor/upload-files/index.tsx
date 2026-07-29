import { PageHeader } from "@/common/components/page-header";
import { RelatedLinks } from "@/common/components/related-links";
import { useState, useRef } from "react";
import type { DragEvent } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@apollo/client/react";
import { Card, CardContent } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import {
  CreateLedgerFileDocument,
  GetLedgerDirContentDocument,
} from "@/graphql/definitions";

import { Upload, X, FileText, AlertCircle } from "lucide-react";
import type {
  CreateLedgerFileMutation,
  CreateLedgerFileMutationVariables,
} from "@/graphql/definitions";
import { cn } from "@/common/lib/utils/utils";
import { createLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { toast } from "sonner";
import { useLedger } from "@/common/hooks/use-ledger";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";

// Maximum file size allowed (1MB)
const MAX_FILE_SIZE = 1024 * 1024; // 1MB in bytes

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
  const { ledgerName: ledgerDisplayName } = useLedger();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [commitMessage, setCommitMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [createFileMutation] = useMutation<
    CreateLedgerFileMutation,
    CreateLedgerFileMutationVariables
  >(CreateLedgerFileDocument);

  // Upload button should be disabled if no files selected or currently uploading
  const isUploadDisabled = selectedFiles.length === 0 || isUploading;

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
        const base64Content = base64.split(",")[1] || base64;
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
    if (isUploadDisabled) return;

    setIsUploading(true);
    const message =
      commitMessage.trim() || `Upload ${selectedFiles.length} file(s)`;

    try {
      // Upload files sequentially
      for (const file of selectedFiles) {
        const fullPath = dirPath ? `${dirPath}/${file.name}` : file.name;
        const content = await fileToBase64(file);

        await createFileMutation({
          variables: {
            ledgerId: ledgerId,
            path: fullPath,
            content: content,
            message: `${message} - ${file.name}`,
          },
          refetchQueries: [
            {
              query: GetLedgerDirContentDocument,
              variables: {
                ledgerId,
                dirPath: dirPath || null,
              },
            },
          ],
          awaitRefetchQueries: true,
        });
      }

      // Refetch directory content after all uploads
      // Navigate back to files view after successful upload
      void navigate({
        to: "/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$",
        params: {
          ledgerOwner,
          ledgerName,
          branch: "main",
          _splat: dirPath || "",
        },
      });
    } catch {
      const errorMessage = t("ledgerEditor.failedToUploadFiles");
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Handle file selection from input
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...Array.from(files)]);
    }
  };

  /**
   * Handle drag over event
   */
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
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

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...Array.from(files)]);
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
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <LedgerPageSEO seoKey="ledgerFilesUpload" />
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
                  disabled={isUploading}
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
                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center justify-between p-3 hover:bg-muted/50",
                        isOversized && "bg-destructive/5",
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          ({(file.size / 1024).toFixed(2)} KB)
                        </span>
                        {isOversized && (
                          <div className="flex items-center gap-1 text-destructive shrink-0">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">
                              {t("ledgerEditor.exceedsFileSizeLimit")}
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
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              variant="default"
              onClick={handleUpload}
              disabled={isUploadDisabled}
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
        </CardContent>
      </Card>

      <RelatedLinks
        links={[
          {
            label: t("common.relatedLinks.files"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/files`,
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

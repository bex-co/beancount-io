import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  GetLedgerFileDocument,
  UpdateLedgerFileDocument,
  DeleteLedgerFileDocument,
  GetLedgerErrorsDocument,
} from "@/graphql/definitions";
import type {
  DeleteLedgerFileMutation,
  DeleteLedgerFileMutationVariables,
  UpdateLedgerFileMutation,
  UpdateLedgerFileMutationVariables,
} from "@/graphql/definitions";
import { base64Encode } from "@/common/lib/utils/encode";
import { track } from "@/common/analytics";
import { useApolloCacheClear } from "@/common/hooks/use-apollo-cache";
import { toast } from "sonner";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { useFileNavigate } from "@/common/hooks/use-file-navigate";
import { getParentPath, getFilename } from "../../../shared/lib/utils";
import { FileLoadingView, FileErrorView } from "./file-loading-error-views";
import { FileContentView } from "./file-content-view";

interface LedgerFileViewProps {
  ledgerId: string;
  filePath: string;
  isEditMode?: boolean;
  lineNumber?: number;
}

/**
 * Ledger file view container component
 * Handles data fetching and business logic (update/delete file operations)
 */
export default function LedgerFileView({
  ledgerId,
  filePath,
  isEditMode,
  lineNumber,
}: LedgerFileViewProps) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const cleanCache = useApolloCacheClear();
  const fileNavigate = useFileNavigate();
  const navigate = useNavigate();
  const params = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
  });
  const {
    data,
    loading: isLoading,
    error,
  } = useQuery(GetLedgerFileDocument, {
    variables: {
      ledgerId: ledgerId,
      path: filePath,
    },
    fetchPolicy: "cache-and-network",
  });

  // Fetch errors for the ledger with caching to improve performance
  const { data: errorsData } = useQuery(GetLedgerErrorsDocument, {
    variables: {
      ledgerId: ledgerId,
    },
    skip: !ledgerId,
    fetchPolicy: "cache-first", // Use cached errors if available
  });

  const [updateFileMutation] = useMutation<
    UpdateLedgerFileMutation,
    UpdateLedgerFileMutationVariables
  >(UpdateLedgerFileDocument);

  const [deleteFileMutation] = useMutation<
    DeleteLedgerFileMutation,
    DeleteLedgerFileMutationVariables
  >(DeleteLedgerFileDocument);

  const [isSaving, setIsSaving] = useState(false);

  const fileContent = data?.getLedgerFile;

  // Filter errors for the current file
  // Use useMemo to prevent unnecessary re-renders and ensure stable reference
  const fileErrors = useMemo(() => {
    const allErrors = errorsData?.getLedgerErrors || [];
    return allErrors.filter((error) => error.filename === filePath);
  }, [errorsData?.getLedgerErrors, filePath]);

  // Handle entering edit mode - update URL with editMode=true
  const handleEnterEditMode = useCallback(() => {
    void navigate({
      to: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
      params,
      search: { editMode: true, lineNumber },
    });
  }, [navigate, params, lineNumber]);

  // Handle exiting edit mode - remove editMode from URL
  const handleExitEditMode = useCallback(() => {
    void navigate({
      to: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
      params,
      search: { lineNumber },
    });
  }, [navigate, params, lineNumber]);

  const handleSaveFile = async (content: string) => {
    if (!fileContent) return;

    setIsSaving(true);
    try {
      await updateFileMutation({
        variables: {
          ledgerId: ledgerId,
          path: filePath,
          content: base64Encode(content),
          sha: fileContent.sha,
          message: t("ledgerEditor.updateFileCommit", { path: filePath }),
        },
        onError: (error) => {
          toast.error(formatError(error));
        },
        onCompleted: () => {
          track("file_edited", {});
          toast.success(t("ledgerEditor.fileSavedSuccess"));
          cleanCache();
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!fileContent) return;

    await deleteFileMutation({
      variables: {
        ledgerId: ledgerId,
        path: filePath,
        sha: fileContent.sha,
        message: t("ledgerEditor.deleteFileCommit", { path: filePath }),
      },
      onError: (error) => {
        toast.error(formatError(error));
      },
      onCompleted: () => {
        toast.success(t("ledgerEditor.fileDeletedSuccess"));
        cleanCache();
        // After deletion, navigate back to parent directory
        const parentPath = getParentPath(filePath);
        fileNavigate(ledgerId, "dir", parentPath);
      },
    });
  };

  if (isLoading) {
    return <FileLoadingView filename={getFilename(filePath)} />;
  }

  if (error || !fileContent) {
    return <FileErrorView filename={getFilename(filePath)} />;
  }

  return (
    <FileContentView
      filePath={filePath}
      fileContent={fileContent}
      onSave={handleSaveFile}
      onDelete={handleDeleteFile}
      isSaving={isSaving}
      isEditMode={isEditMode}
      lineNumber={lineNumber}
      errors={fileErrors}
      onEnterEditMode={handleEnterEditMode}
      onExitEditMode={handleExitEditMode}
    />
  );
}

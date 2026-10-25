import { useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  GetLedgerFileDocument,
  UpdateLedgerFileDocument,
  DeleteLedgerFileDocument,
  GetLedgerErrorsDocument,
} from "@/graphql/definitions";
import type {
  GetLedgerFileQuery,
  DeleteLedgerFileMutation,
  DeleteLedgerFileMutationVariables,
  UpdateLedgerFileMutation,
  UpdateLedgerFileMutationVariables,
} from "@/graphql/definitions";
import { base64Encode, hasUtf8Bom } from "@/common/lib/utils/encode";
import { track } from "@/common/analytics";
import { useApolloCacheClear } from "@/common/hooks/use-apollo-cache";
import { useRefreshFailedToast } from "@/common/hooks/use-refresh-failed-toast";
import { toast } from "sonner";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { useFileNavigate } from "@/common/hooks/use-file-navigate";
import { useWriteOutcome } from "@/common/hooks/use-write-outcome";
import { getParentPath, getFilename } from "../../../shared/lib/utils";
import {
  FileLoadingView,
  FileErrorView,
  FileNotFoundView,
} from "./file-loading-error-views";
import { FileContentView } from "./file-content-view";

type FileRevision = NonNullable<GetLedgerFileQuery["getLedgerFile"]>;

interface LedgerFileViewProps {
  ledgerId: string;
  filePath: string;
  isEditMode?: boolean;
  lineNumber?: number;
}

/** The ledger's root file, which the server refuses to delete. Only the root
 * path: a nested `accounts/main.bean` is an ordinary file. */
function isRootLedgerFile(path: string): boolean {
  return path.replace(/^\/+/, "") === "main.bean";
}

/** The server's refusal of an unsafe path (`assertSafeRepoPath`). */
function isRefusedPath(error: unknown): boolean {
  return (
    CombinedGraphQLErrors.is(error) &&
    error.errors.some((item) => item.extensions?.code === "BAD_USER_INPUT")
  );
}

/** backend-v2's refusal for deleting it (`ledger-workflow.ts`). */
const ROOT_FILE_REFUSAL = /main\.bean file cannot be deleted/;

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
  const writeOutcome = useWriteOutcome(ledgerId);
  const params = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
  });
  const { data, error, refetch } = useQuery(GetLedgerFileDocument, {
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

  // A failed refetch (Out of date → Refresh, or after a write) keeps the file
  // this view already shows, with any unsaved draft, instead of an error page;
  // Apollo keeps that same file's last result in `data` (w4/m46). A refused
  // path is still not found.
  const failedRefresh =
    fileContent && error && !isRefusedPath(error) ? error : undefined;
  useRefreshFailedToast(failedRefresh, () => void refetch());

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

  // `base` is the revision the draft was edited against, which a refresh may
  // have moved past: saving against it lets the server refuse a stale write
  // instead of overwriting the newer file (w4/m46).
  const handleSaveFile = async (content: string, base: FileRevision) => {
    setIsSaving(true);
    const before = writeOutcome.snapshot();
    try {
      await updateFileMutation({
        variables: {
          ledgerId: ledgerId,
          path: filePath,
          // Keep the file's UTF-8 byte-order mark: the editor buffer never
          // sees it, and an ordinary edit is not an encoding change (w4/268).
          content: base64Encode(
            hasUtf8Bom(base.content) && !content.startsWith("\uFEFF")
              ? `\uFEFF${content}`
              : content,
          ),
          sha: base.sha,
          message: t("ledgerEditor.updateFileCommit", { path: filePath }),
        },
        onError: (error) => {
          toast.error(formatError(error));
        },
        onCompleted: async () => {
          track("file_edited", {});
          if (!(await writeOutcome.report(before))) {
            toast.success(t("ledgerEditor.fileSavedSuccess"));
          }
          cleanCache();
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  // One in-flight delete per file view: a second confirmation cannot
  // prepare an identical DeleteLedgerFile request (w4/1090).
  const deleteInFlightRef = useRef(false);

  const handleDeleteFile = async () => {
    if (!fileContent || deleteInFlightRef.current) return;
    deleteInFlightRef.current = true;
    try {
      await runDeleteFile();
    } finally {
      deleteInFlightRef.current = false;
    }
  };

  const runDeleteFile = async () => {
    if (!fileContent) return;

    await deleteFileMutation({
      variables: {
        ledgerId: ledgerId,
        path: filePath,
        sha: fileContent.sha,
        message: t("ledgerEditor.deleteFileCommit", { path: filePath }),
      },
      onError: (error) => {
        const refusedRoot = ROOT_FILE_REFUSAL.test(error.message);
        toast.error(
          refusedRoot
            ? t("ledgerEditor.rootFileCannotBeDeleted", {
                filename: "main.bean",
              })
            : formatError(error),
        );
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

  // A path the server refuses is not a file that failed to load: Try Again
  // could never succeed, so show it as not found.
  if (error && !fileContent && !isRefusedPath(error)) {
    return <FileErrorView filename={getFilename(filePath)} />;
  }

  // cache-and-network can keep loading true after the first result; only treat
  // absence as confirmed when the query has a settled payload.
  if (data === undefined && !error) {
    return <FileLoadingView filename={getFilename(filePath)} />;
  }

  if ((error && !failedRefresh) || !fileContent) {
    return (
      <FileNotFoundView
        filePath={filePath}
        onBrowseParent={() => {
          fileNavigate(ledgerId, "dir", getParentPath(filePath));
        }}
      />
    );
  }

  return (
    <FileContentView
      filePath={filePath}
      fileContent={fileContent}
      onSave={handleSaveFile}
      onDelete={isRootLedgerFile(filePath) ? undefined : handleDeleteFile}
      isSaving={isSaving}
      isEditMode={isEditMode}
      lineNumber={lineNumber}
      errors={fileErrors}
      onEnterEditMode={handleEnterEditMode}
      onExitEditMode={handleExitEditMode}
    />
  );
}

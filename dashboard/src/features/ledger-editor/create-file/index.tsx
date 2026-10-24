import { PageHeader } from "@/common/components/page-header";
import { RelatedLinks } from "@/common/components/related-links";
import { getLedgerFilesRootPath } from "@/common/hooks/use-file-navigate";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useBlocker } from "@tanstack/react-router";
import { useMutation, useQuery } from "@apollo/client/react";
import { useRefreshDirectory } from "@/features/ledger-editor/shared/hooks/use-refresh-directory";
import { Card, CardContent } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { useIsDarkTheme } from "@/common/hooks/use-theme";
import { MonacoEditor as Editor } from "@/common/components/monaco-editor";
import { X, Save } from "lucide-react";
import {
  CreateLedgerFileDocument,
  GetLedgerDirContentDocument,
} from "@/graphql/definitions";
import { registerBeancountLanguage } from "@/common/lib/editor/monaco-beancount-language";
import { createLedgerId, base64Encode } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { restoreFocusOnDialogClose } from "@/common/lib/focus/restore-focus-on-dialog-close";
import { toast } from "sonner";
import { getFileLanguage } from "@/features/ledger-editor/shared/lib/utils";
import { useLedger } from "@/common/hooks/use-ledger";
import { useLedgerPermission } from "@/common/hooks/use-ledger-permission";
import { WriteAccessRequired } from "@/features/ledger-editor/shared/components/write-access-required";
import { createFileNameIssue } from "./validate-create-file-name";

/**
 * Create File Page Component - GitHub-style file creation interface
 */
const CreateFilePage = () => {
  const params = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/files/new/$branch/$",
  });
  const { ledgerOwner, ledgerName } = params;
  // The wildcard parameter captures the directory path after /new/{branch}/
  // TanStack Router uses "_splat" as the key for splat parameters
  const dirPath = params._splat || "";

  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const navigate = useNavigate();
  const isDarkTheme = useIsDarkTheme();
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const { ledgerName: ledgerDisplayName } = useLedger();
  // False for anonymous readers and while permissions are unresolved.
  const { canWrite } = useLedgerPermission();

  const [filename, setFilename] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  // Allow the post-create navigate without prompting; cleared after each leave.
  const allowNavigationRef = useRef(false);
  const savingRef = useRef(false);
  // Stay, Escape and an outside dismissal keep the draft, so they hand focus
  // back to whatever asked to leave, or to the filename when nothing here did
  // (browser Back). A confirmed departure leaves focus to its destination
  // (w4/1035).
  const filenameRef = useRef<HTMLInputElement>(null);
  const departureOpenerRef = useRef<HTMLElement | null>(null);
  const leavingRef = useRef(false);
  // Leaving this page or its folder ends the creation journey, so an older
  // save's late success cannot take the reader away from where they went
  // (w4/304). The write itself still lands.
  const journeyRef = useRef(0);
  useEffect(
    () => () => {
      journeyRef.current += 1;
    },
    [ledgerId, dirPath],
  );

  const refreshDirectory = useRefreshDirectory(ledgerId, dirPath);
  const [createFileMutation] = useMutation(CreateLedgerFileDocument);
  const { data: dirData } = useQuery(GetLedgerDirContentDocument, {
    variables: {
      ledgerId,
      dirPath: dirPath || null,
    },
    skip: !ledgerId,
  });

  const existingNames = useMemo(
    () =>
      (dirData?.getLedgerDirContent ?? [])
        .map((entry) => entry.name)
        .filter((name): name is string => Boolean(name)),
    [dirData?.getLedgerDirContent],
  );

  // Construct full file path
  const normalizedFilename = filename.trim();
  const fullPath = dirPath
    ? `${dirPath}/${normalizedFilename}`
    : normalizedFilename;

  const nameIssue = createFileNameIssue(
    normalizedFilename,
    existingNames,
    dirPath,
  );
  const filenameError =
    nameIssue === "unsafe"
      ? t("ledgerEditor.invalidFilePath")
      : nameIssue === "emptySegment"
        ? t("ledgerEditor.emptyFilePathSegment")
        : nameIssue === "git"
          ? t("ledgerEditor.gitFilePathNotAllowed")
          : nameIssue === "exists"
            ? t("ledgerEditor.fileAlreadyExists")
            : null;

  // Save button should be disabled if filename is empty/invalid or saving,
  // or if this reader cannot write to the ledger at all.
  const isSaveDisabled = !canWrite || nameIssue !== null || isSaving;

  const hasDraft = normalizedFilename !== "" || content.trim() !== "";

  const blocker = useBlocker({
    shouldBlockFn: () => {
      if (allowNavigationRef.current) {
        allowNavigationRef.current = false;
        return false;
      }
      return hasDraft;
    },
    enableBeforeUnload: () => hasDraft,
    withResolver: true,
  });

  const navigateToTree = () => {
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
   * Handle cancel button click - navigate back to files view
   */
  const handleCancel = () => {
    navigateToTree();
  };

  /**
   * Handle save button click - create new file
   */
  const handleSave = async () => {
    // Fail closed: the button is already disabled, but a permission change
    // mid-draft must stop the write here too, without discarding the draft.
    if (!canWrite || isSaveDisabled) return;

    // From here until the write and directory refetch settle, the draft is
    // read-only: the success path leaves with exactly this snapshot, so it
    // must not accept a newer name or text it would discard (w4/247).
    savingRef.current = true;
    setIsSaving(true);
    const journey = journeyRef.current;
    try {
      await createFileMutation({
        variables: {
          ledgerId: ledgerId,
          path: fullPath,
          content: base64Encode(content), // Encode content to base64 with UTF-8 support
          message: t("ledgerEditor.createFileCommit", { path: fullPath }),
        },
      });

      // The file is written; refreshing its folder is a separate read that
      // cannot turn this into a failed create (w4/248).
      await refreshDirectory();
      if (journey !== journeyRef.current) return;
      // Navigate back to files view after successful creation
      allowNavigationRef.current = true;
      navigateToTree();
    } catch (error) {
      console.error("Failed to create file:", error);
      toast.error(formatError(error));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  // A reader who cannot write never gets the form. Someone who loses access
  // while drafting keeps what they typed — the guards above stop the write.
  if (!canWrite && !hasDraft) {
    return (
      <div className="h-full flex flex-col space-y-4">
        <PageHeader
          title={t("ledgerEditor.createFile")}
          description={t("common.pageDescription.createFile", {
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
        title={t("ledgerEditor.createFile")}
        description={t("common.pageDescription.createFile", {
          ledgerName: ledgerDisplayName ?? ledgerName,
        })}
      />
      {/* Header Section */}
      <div className="border-b pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left side: Directory path + filename input */}
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
                <span>{ledgerName}</span>
                {dirPath && (
                  <>
                    <span>/</span>
                    <span className="truncate">{dirPath}</span>
                  </>
                )}
                <span>/</span>
              </div>
              <Input
                ref={filenameRef}
                type="text"
                placeholder={t("ledgerEditor.nameYourFile")}
                value={filename}
                onChange={(e) => {
                  if (!savingRef.current) setFilename(e.target.value);
                }}
                readOnly={isSaving}
                className="flex-1 min-w-0"
                autoFocus
                aria-invalid={Boolean(filenameError)}
                aria-describedby={
                  filenameError ? "create-file-name-error" : undefined
                }
              />
            </div>
            {filenameError ? (
              <p
                id="create-file-name-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {filenameError}
              </p>
            ) : null}
          </div>

          {/* Right side: Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              <span>{t("common.cancel")}</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={isSaveDisabled}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? t("common.saving") : t("common.save")}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Section */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="p-0 h-full">
          <div className="h-full">
            <Editor
              height="100%"
              language={getFileLanguage(normalizedFilename)}
              value={content}
              onChange={(value) => {
                if (!savingRef.current) setContent(value || "");
              }}
              theme={isDarkTheme ? "vs-dark" : "light"}
              beforeMount={(monaco) => {
                // Register Beancount language before mounting
                registerBeancountLanguage(monaco);
              }}
              options={{
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                lineNumbers: "on",
                wordWrap: "on",
                automaticLayout: true,
                fontSize: 14,
                tabSize: 2,
                insertSpaces: true,
                readOnly: isSaving,
                domReadOnly: isSaving,
              }}
            />
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
            label: t("common.relatedLinks.uploadFiles"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/files/upload`,
          },
          {
            label: t("common.relatedLinks.journal"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/journal`,
          },
        ]}
      />

      <Dialog
        open={blocker.status === "blocked"}
        onOpenChange={(open) => !open && blocker.reset?.()}
      >
        <DialogContent
          className="sm:max-w-md"
          onOpenAutoFocus={() => {
            leavingRef.current = false;
            const opener = document.activeElement;
            departureOpenerRef.current =
              opener instanceof HTMLElement && opener !== document.body
                ? opener
                : null;
          }}
          onCloseAutoFocus={(event) => {
            if (leavingRef.current) return;
            restoreFocusOnDialogClose(
              event,
              departureOpenerRef.current,
              filenameRef.current,
            );
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("ledgerEditor.unsavedChanges")}</DialogTitle>
            <DialogDescription>
              {t("ledgerEditor.unsavedChangesMessage")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => blocker.reset?.()}
              className="w-full sm:w-auto"
            >
              {t("ledgerEditor.stay")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                leavingRef.current = true;
                blocker.proceed?.();
              }}
              className="w-full sm:w-auto"
            >
              {t("ledgerEditor.leaveWithoutSaving")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateFilePage;

import { useState, useEffect, useId, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/common/components/ui/alert-dialog";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/common/components/ui/table";
import { Loader2, Trash2, Save, ChevronDown } from "lucide-react";
import { MonacoEditor as Editor } from "@/common/components/monaco-editor";
import {
  GetLedgerEntryContextDocument,
  DeleteLedgerEntrySourceSliceDocument,
  UpdateLedgerEntrySourceSliceDocument,
  type DeleteLedgerEntrySourceSliceMutation,
  type DeleteLedgerEntrySourceSliceMutationVariables,
  type UpdateLedgerEntrySourceSliceMutation,
  type UpdateLedgerEntrySourceSliceMutationVariables,
  type GetLedgerEntryContextQuery,
} from "@/graphql/definitions";
import type { JournalDirectiveType } from "@/common/types/journal";
import { useIsDarkTheme } from "@/common/hooks/use-theme";
import { useApolloCacheClear } from "@/common/hooks/use-apollo-cache";
import { registerBeancountLanguage } from "@/common/lib/editor/monaco-beancount-language-vscode";
import { cn } from "@/common/lib/utils/utils";
import { toast } from "sonner";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  getErrorMessageKey,
  useErrorMessage,
} from "@/common/lib/errors/error-message";
import { useIsMobile } from "@/common/hooks/use-mobile";
import { useFileNavigate } from "@/common/hooks/use-file-navigate";
import { useLedgerPermission } from "@/common/hooks/use-ledger-permission";
import { restoreFocusOnDialogClose } from "@/common/lib/focus/restore-focus-on-dialog-close";
import {
  managedPriceSourceUrl,
  readEntrySourceLocation,
} from "@/features/journal/lib/entry-source-location";

export interface EntryContextPanelProps {
  entryHash: string;
  ledgerId: string;
  /** Optional journal row — used only for delete confirmation labels. */
  entry?: JournalDirectiveType | null;
  /** Skip the context query (e.g. dialog closed). */
  skip?: boolean;
  onSuccess?: () => void;
  /** After a successful delete, before `onSuccess` (page navigates away). */
  onDeleted?: () => void;
  /**
   * Fired immediately before navigating to the entry source file so the
   * owning dialog can skip opener focus restoration.
   */
  onSourceNavigate?: () => void;
}

function EntryContextLoading() {
  const { t } = useTranslations();
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span className="ml-2">{t("journal.loadingEntryContext")}</span>
    </div>
  );
}

function EntryContextError({ error }: { error: Error }) {
  const { t } = useTranslations();
  return (
    <Alert variant="destructive">
      <AlertDescription>{t(getErrorMessageKey(error))}</AlertDescription>
    </Alert>
  );
}

function EntryContextMain({
  data,
  onSave,
  onDelete,
  entryHash,
  entry,
  onGoToFile,
  canWrite,
}: {
  data: GetLedgerEntryContextQuery["getLedgerEntryContext"];
  entryHash: string;
  entry: JournalDirectiveType | null | undefined;
  onSave: (
    entryHash: string,
    newSource: string,
    sha256sum: string,
  ) => Promise<void>;
  onDelete: (entryHash: string, sha256sum: string) => Promise<void>;
  onGoToFile?: (filename: string, lineNumber: number) => void;
  canWrite: boolean;
}) {
  const { t } = useTranslations();
  const balancesRegionId = useId();
  const [sourceText, setSourceText] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSource, setOriginalSource] = useState("");
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const isDark = useIsDarkTheme();
  const isMobile = useIsMobile();
  const location = readEntrySourceLocation(data?.entry);
  const locationLabel = location
    ? `${location.filename}:${location.lineno}`
    : null;
  // A price from a managed feed is not in the ledger's files: the ledger
  // refuses to edit or delete it, so the panel offers neither.
  const managedSource = location
    ? managedPriceSourceUrl(location.filename)
    : null;
  const editable = canWrite && managedSource === null;

  useEffect(() => {
    if (data?.slice) {
      const newSource = data.slice;
      setSourceText(newSource);
      setOriginalSource(newSource);
      setHasChanges(false);
    }
  }, [data?.slice]);

  useEffect(() => {
    setHasChanges(sourceText !== originalSource);
  }, [sourceText, originalSource]);

  const handleSave = async () => {
    if (!editable || !entryHash || !hasChanges || isSaving) return;
    setIsSaving(true);
    try {
      await onSave(entryHash, sourceText, data.sha256sum);
      setHasChanges(false);
      setOriginalSource(sourceText);
    } catch {
      // Error handling is done in the parent handler
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!editable || !entryHash || !data?.sha256sum || isDeleting) {
      return;
    }
    setIsDeleting(true);
    try {
      await onDelete(entryHash, data.sha256sum);
      setConfirmDeleteOpen(false);
    } catch {
      // Error handling is done in the parent handler; the confirmation stays
      // open so the user can retry or cancel.
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteTargetLabel = location
    ? `${location.filename}:${location.lineno}`
    : (entry?.date ?? entryHash);

  const formatBalances = (balances: Record<string, unknown>) => {
    if (!balances || typeof balances !== "object") return [];

    return Object.entries(balances).map(([account, amount]) => ({
      account,
      amount:
        typeof amount === "object" &&
        amount !== null &&
        "number" in amount &&
        "currency" in amount
          ? `${(amount as { number: string; currency: string }).number} ${(amount as { number: string; currency: string }).currency}`
          : String(amount),
    }));
  };

  return (
    <div className="space-y-4">
      {managedSource && (
        <Alert>
          <AlertDescription>
            {t("journal.managedPriceEntryExplanation", {
              source: managedSource,
            })}
          </AlertDescription>
        </Alert>
      )}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium ">
          {t("journal.entryLocation")}
        </span>
        {managedSource && locationLabel ? (
          <code className="font-mono text-sm">{locationLabel}</code>
        ) : location && locationLabel ? (
          <button
            type="button"
            className="font-mono text-sm rounded underline cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("journal.openEntrySource", {
              location: locationLabel,
            })}
            onClick={() => onGoToFile?.(location.filename, location.lineno)}
          >
            <code className="pointer-events-none">{locationLabel}</code>
          </button>
        ) : (
          <span className="text-sm text-muted-foreground">
            {t("journal.entryLocationUnavailable")}
          </span>
        )}
      </div>
      {data?.balances_before && data?.balances_after ? (
        <div className="w-full rounded-md overflow-hidden">
          <button
            type="button"
            className="flex w-full items-center justify-between p-2 bg-muted text-foreground cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            aria-expanded={isContextOpen}
            aria-controls={balancesRegionId}
            onClick={() => setIsContextOpen(!isContextOpen)}
          >
            <span className="flex items-center gap-2">
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  isContextOpen ? "rotate-180" : "",
                )}
                aria-hidden="true"
              />
              <span className="font-semibold">{t("journal.entryContext")}</span>
            </span>
          </button>

          {isContextOpen ? (
            <div
              id={balancesRegionId}
              className="border border-t-0 border-border rounded-b-md overflow-hidden"
            >
              {data?.balances_before && (
                <div>
                  <div className="p-3 bg-muted/50 text-foreground font-medium text-sm">
                    {t("journal.balancesBeforeEntry")}
                  </div>
                  <div className="bg-background">
                    <Table>
                      <TableBody>
                        {formatBalances(data.balances_before).map((balance) => (
                          <TableRow
                            key={balance.account}
                            className="border-border"
                          >
                            <TableCell className="font-mono text-sm py-2">
                              {balance.account}
                            </TableCell>
                            <TableCell className="font-mono text-sm text-right text-foreground py-2">
                              {balance.amount}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {data?.balances_after && (
                <div>
                  <div className="p-3 bg-muted/50 text-foreground font-medium text-sm">
                    {t("journal.balancesAfterEntry")}
                  </div>
                  <div className="bg-background">
                    <Table>
                      <TableBody>
                        {formatBalances(data.balances_after).map((balance) => (
                          <TableRow
                            key={balance.account}
                            className="border-border"
                          >
                            <TableCell className="font-mono text-sm py-2">
                              {balance.account}
                            </TableCell>
                            <TableCell className="font-mono text-sm text-right text-foreground py-2">
                              {balance.amount}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <div className={cn(isMobile ? "h-[200px]" : "h-[100px]")}>
            <Editor
              height={isMobile ? "200px" : "100px"}
              language="beancount"
              value={sourceText}
              onChange={(value) => {
                if (!editable) return;
                setSourceText(value || "");
              }}
              theme={isDark ? "vs-dark" : "light"}
              beforeMount={(monaco) => {
                registerBeancountLanguage(monaco);
              }}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                lineNumbers: "on",
                readOnly: !editable,
              }}
            />
          </div>
          {editable && hasChanges && (
            <div className="p-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20">
              {t("journal.sourceModified")}
            </div>
          )}
        </CardContent>
      </Card>

      {editable ? (
        <div className="flex gap-2 justify-end">
          <Button
            ref={deleteButtonRef}
            variant="destructive"
            onClick={() => setConfirmDeleteOpen(true)}
            disabled={isDeleting || isSaving}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t("common.delete")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving || isDeleting}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {t("common.save")}
          </Button>
        </div>
      ) : null}

      <AlertDialog
        open={confirmDeleteOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && isDeleting) return;
          setConfirmDeleteOpen(nextOpen);
        }}
      >
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            restoreFocusOnDialogClose(event, deleteButtonRef.current);
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{t("journal.entryDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("journal.entryDeleteDescription", {
                location: deleteTargetLabel,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("journal.entryDeleteCancel")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t("journal.entryDeleteConfirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Authorized entry source context for a single hash. Callers should remount
 * (via `key`) when ledgerId or entryHash changes so a prior entry never
 * remains visible while the next request is in flight.
 */
export function EntryContextPanel({
  entryHash,
  ledgerId,
  entry,
  skip = false,
  onSuccess,
  onDeleted,
  onSourceNavigate,
}: EntryContextPanelProps) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const fileNavigate = useFileNavigate();
  const clearCache = useApolloCacheClear();
  const { canWrite } = useLedgerPermission();
  const { data, loading, error } = useQuery(GetLedgerEntryContextDocument, {
    variables: {
      entryHash,
      ledgerId,
    },
    skip: skip || !entryHash || !ledgerId,
  });

  const [deleteEntrySourceSlice] = useMutation<
    DeleteLedgerEntrySourceSliceMutation,
    DeleteLedgerEntrySourceSliceMutationVariables
  >(DeleteLedgerEntrySourceSliceDocument);

  const [updateEntrySourceSlice] = useMutation<
    UpdateLedgerEntrySourceSliceMutation,
    UpdateLedgerEntrySourceSliceMutationVariables
  >(UpdateLedgerEntrySourceSliceDocument);

  const handleSave = async (
    hash: string,
    newSource: string,
    sha256sum: string,
  ) => {
    if (!canWrite) return;
    try {
      await updateEntrySourceSlice({
        variables: {
          ledgerId,
          input: {
            entryHash: hash,
            sha256sum,
            newContent: newSource,
          },
        },
      });
      toast.success(t("journal.entrySavedSuccess"));
      clearCache();
      onSuccess?.();
    } catch (saveError) {
      console.error("Failed to update entry:", saveError);
      toast.error(formatError(saveError));
      throw saveError;
    }
  };

  const handleDelete = async (hash: string, sha256sum: string) => {
    if (!canWrite) return;
    try {
      await deleteEntrySourceSlice({
        variables: {
          ledgerId,
          input: {
            entryHash: hash,
            sha256sum,
          },
        },
      });
      toast.success(t("journal.entryDeletedSuccess"));
      clearCache();
      onDeleted?.();
      onSuccess?.();
    } catch (deleteError) {
      console.error("Failed to delete entry:", deleteError);
      toast.error(formatError(deleteError));
      throw deleteError;
    }
  };

  const handleGoToFile = (filename: string, lineNumber: number) => {
    onSourceNavigate?.();
    fileNavigate(ledgerId, "file", filename, {
      lineNumber,
      editMode: canWrite,
    });
  };

  if (loading) {
    return <EntryContextLoading />;
  }
  if (error) {
    return <EntryContextError error={error} />;
  }
  if (data?.getLedgerEntryContext) {
    return (
      <EntryContextMain
        data={data.getLedgerEntryContext}
        onSave={handleSave}
        onDelete={handleDelete}
        entryHash={entryHash}
        entry={entry}
        onGoToFile={handleGoToFile}
        canWrite={canWrite}
      />
    );
  }
  return (
    <div className="text-center py-8 text-muted-foreground">
      {t("journal.noEntryContext")}
    </div>
  );
}

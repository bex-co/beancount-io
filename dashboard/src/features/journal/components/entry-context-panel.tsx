import { useState, useEffect, useId, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
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
import { Amount } from "@/common/components/amount";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
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
import { useWriteOutcome } from "@/common/hooks/use-write-outcome";
import { useLedgerPermission } from "@/common/hooks/use-ledger-permission";
import { usePendingAction } from "@/common/hooks/use-pending-action";
import { useRefreshFailedToast } from "@/common/hooks/use-refresh-failed-toast";
import { restoreFocusOnDialogClose } from "@/common/lib/focus/restore-focus-on-dialog-close";
import { readEntrySourceLocation } from "@/features/journal/lib/entry-source-location";

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
   * After a successful save, with the entry's identity as saved — a changed
   * source gets a new hash. Awaited before the cache is cleared, so an owner
   * addressing the entry by hash can move to the new one first (w4/251).
   */
  onSaved?: (entryHash: string) => void | Promise<void>;
  /**
   * Fired immediately before navigating to the entry source file so the
   * owning dialog can skip opener focus restoration.
   */
  onSourceNavigate?: () => void;
  /** Told whenever the source editor gains or loses unsaved changes. */
  onDirtyChange?: (dirty: boolean) => void;
  /**
   * Told while a save or delete is in flight, so an owner can hold its
   * dismissal: the write's completion closes the draft it was sent from.
   */
  onPendingChange?: (pending: boolean) => void;
  /**
   * Asked before leaving for the source file; calls `proceed` when it may
   * go, so an owner can confirm discarding unsaved changes first.
   */
  confirmLeave?: (proceed: () => void) => void;
}

/** A save that missed because the entry changed or vanished since loading. */
function isStaleEntry(error: unknown): boolean {
  return (
    CombinedGraphQLErrors.is(error) &&
    error.errors.some((item) =>
      ["NOT_FOUND", "CONFLICT"].includes(String(item.extensions?.code)),
    )
  );
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
  onDirtyChange,
  onPendingChange,
}: {
  onDirtyChange?: (dirty: boolean) => void;
  onPendingChange?: (pending: boolean) => void;
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
  const balancesBeforeTitleId = useId();
  const balancesAfterTitleId = useId();
  const [sourceText, setSourceText] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSource, setOriginalSource] = useState("");
  // The version a draft was written against: a refresh does not move it, so
  // a save still refuses if the entry changed meanwhile (w4/979).
  const [baseSha, setBaseSha] = useState<string | null>(null);
  const dirty = useRef(false);
  // Before the source effect below, so it reads this commit's state.
  useEffect(() => {
    dirty.current = sourceText !== originalSource;
  }, [sourceText, originalSource]);
  const [isContextOpen, setIsContextOpen] = useState(false);
  // One save at a time. While it is in flight the source is read-only: the
  // request already holds its text, and an edit made now would be marked
  // saved without ever being sent (w4/m49).
  const { run: runSave, pending: isSaving } = usePendingAction();
  const { run: runDelete, pending: isDeleting } = usePendingAction();
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
  const managedSource = data?.managed_source ?? null;
  const editable = canWrite && managedSource === null;

  // Every write clears the cache, so this entry's source can arrive again
  // while it is open. A clean editor takes it; an edited draft is kept.
  useEffect(() => {
    if (!data?.slice || dirty.current) return;
    setSourceText(data.slice);
    setOriginalSource(data.slice);
    setBaseSha(data.sha256sum ?? null);
    setHasChanges(false);
  }, [data?.slice, data?.sha256sum]);

  useEffect(() => {
    setHasChanges(sourceText !== originalSource);
  }, [sourceText, originalSource]);

  useEffect(() => {
    onDirtyChange?.(editable && hasChanges);
  }, [editable, hasChanges, onDirtyChange]);

  const pending = isSaving || isDeleting;
  const readOnly = !editable || pending;
  // The cleanup also runs when a panel unmounts mid-write, so it never
  // leaves its owner locked.
  useEffect(() => {
    if (!pending) return;
    onPendingChange?.(true);
    return () => onPendingChange?.(false);
  }, [pending, onPendingChange]);

  const handleSave = () => {
    if (!editable || !entryHash || !hasChanges) return;
    void runSave(async () => {
      try {
        await onSave(entryHash, sourceText, baseSha ?? data.sha256sum);
      } catch {
        // Error handling is done in the parent handler
        return false;
      }
      setOriginalSource(sourceText);
      return true;
    });
  };

  const handleConfirmDelete = () => {
    if (!editable || !entryHash || !data?.sha256sum) return;
    const { sha256sum } = data;
    void runDelete(async () => {
      try {
        await onDelete(entryHash, sha256sum);
      } catch {
        // Error handling is done in the parent handler; the confirmation stays
        // open so the user can retry or cancel.
        return false;
      }
      setConfirmDeleteOpen(false);
      return true;
    });
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
        {managedSource ? (
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
                  <div
                    id={balancesBeforeTitleId}
                    className="p-3 bg-muted/50 text-foreground font-medium text-sm"
                  >
                    {t("journal.balancesBeforeEntry")}
                  </div>
                  <div className="bg-background">
                    <Table aria-labelledby={balancesBeforeTitleId}>
                      <TableHeader>
                        <TableRow>
                          <TableHead scope="col">
                            {t("common.accountColumn")}
                          </TableHead>
                          <TableHead scope="col" className="text-end">
                            {t("journal.balanceHeader")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formatBalances(data.balances_before).map((balance) => (
                          <TableRow
                            key={balance.account}
                            className="border-border"
                          >
                            <TableCell className="font-mono text-sm py-2">
                              {balance.account}
                            </TableCell>
                            <TableCell className="font-mono text-sm text-end text-foreground py-2">
                              <Amount>{balance.amount}</Amount>
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
                  <div
                    id={balancesAfterTitleId}
                    className="p-3 bg-muted/50 text-foreground font-medium text-sm"
                  >
                    {t("journal.balancesAfterEntry")}
                  </div>
                  <div className="bg-background">
                    <Table aria-labelledby={balancesAfterTitleId}>
                      <TableHeader>
                        <TableRow>
                          <TableHead scope="col">
                            {t("common.accountColumn")}
                          </TableHead>
                          <TableHead scope="col" className="text-end">
                            {t("journal.balanceHeader")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formatBalances(data.balances_after).map((balance) => (
                          <TableRow
                            key={balance.account}
                            className="border-border"
                          >
                            <TableCell className="font-mono text-sm py-2">
                              {balance.account}
                            </TableCell>
                            <TableCell className="font-mono text-sm text-end text-foreground py-2">
                              <Amount>{balance.amount}</Amount>
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
                if (readOnly) return;
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
                readOnly,
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
            disabled={pending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t("common.delete")}
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || pending}>
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
  onDirtyChange,
  onPendingChange,
  confirmLeave,
  onSaved,
}: EntryContextPanelProps) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const fileNavigate = useFileNavigate();
  const clearCache = useApolloCacheClear();
  const { canWrite } = useLedgerPermission();
  const writeOutcome = useWriteOutcome(ledgerId);
  /** The edit a save could not land because the entry changed elsewhere. */
  const [staleDraft, setStaleDraft] = useState<string | null>(null);
  const { data, loading, error, refetch } = useQuery(
    GetLedgerEntryContextDocument,
    {
      variables: {
        entryHash,
        ledgerId,
      },
      skip: skip || !entryHash || !ledgerId,
    },
  );
  useRefreshFailedToast(data ? error : undefined, () => void refetch());

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
    const before = writeOutcome.snapshot();
    try {
      const { data: saved } = await updateEntrySourceSlice({
        variables: {
          ledgerId,
          input: {
            entryHash: hash,
            sha256sum,
            newContent: newSource,
          },
        },
      });
      // An edit can break the ledger where creating would be refused
      // (an unbalanced transaction); say so instead of "saved".
      if (!(await writeOutcome.report(before))) {
        toast.success(t("journal.entrySavedSuccess"));
      }
      await onSaved?.(saved?.updateLedgerEntrySourceSlice?.entryHash || hash);
      clearCache();
      onSuccess?.();
    } catch (saveError) {
      console.error("Failed to update entry:", saveError);
      // The slice is addressed by the hash this panel loaded; an edit made
      // elsewhere gives the entry a new one, so this save can only miss.
      if (isStaleEntry(saveError)) setStaleDraft(newSource);
      else toast.error(formatError(saveError));
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
    const go = () => {
      onSourceNavigate?.();
      fileNavigate(ledgerId, "file", filename, {
        lineNumber,
        editMode: canWrite,
      });
    };
    if (confirmLeave) confirmLeave(go);
    else go();
  };

  // A refresh keeps the shown entry, and any draft in it, mounted; only a
  // first read swaps in the loading or error view (dashboard AGENTS.md).
  if (loading && !data) {
    return <EntryContextLoading />;
  }
  if (error && !data) {
    return <EntryContextError error={error} />;
  }
  if (data?.getLedgerEntryContext) {
    return (
      <>
        {staleDraft !== null && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription className="space-y-3">
              <p>{t("journal.entryChangedElsewhere")}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  // A refused copy must say so before the reader chooses
                  // Reload, which discards the draft (w4/307).
                  onClick={() =>
                    void navigator.clipboard.writeText(staleDraft).then(
                      () => toast.success(t("common.copied")),
                      () => toast.error(t("common.copyFailed")),
                    )
                  }
                >
                  {t("journal.copyMyEdit")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    clearCache();
                    onSuccess?.();
                  }}
                >
                  {t("journal.reloadEntries")}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        <EntryContextMain
          data={data.getLedgerEntryContext}
          onSave={handleSave}
          onDelete={handleDelete}
          entryHash={entryHash}
          entry={entry}
          onGoToFile={handleGoToFile}
          canWrite={canWrite}
          onDirtyChange={onDirtyChange}
          onPendingChange={onPendingChange}
        />
      </>
    );
  }
  return (
    <div className="text-center py-8 text-muted-foreground">
      {t("journal.noEntryContext")}
    </div>
  );
}

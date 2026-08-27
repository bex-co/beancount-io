import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/common/components/ui/dialog";
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
} from "@/graphql/definitions";
import type { JournalDirectiveType } from "@/common/types/journal";
import type { GetLedgerEntryContextQuery } from "@/graphql/definitions";
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

interface EntryContextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: JournalDirectiveType | null;
  ledgerId: string;
  onSuccess?: () => void;
}

interface EntryContextEntry {
  meta: {
    filename: string;
    lineno: number;
  };
}

/**
 * Loading state component for entry context dialog
 */
function EntryContextLoading() {
  const { t } = useTranslations();
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span className="ml-2">{t("journal.loadingEntryContext")}</span>
    </div>
  );
}

/**
 * Error state component for entry context dialog
 */
function EntryContextError({ error }: { error: Error }) {
  const { t } = useTranslations();
  return (
    <Alert variant="destructive">
      <AlertDescription>{t(getErrorMessageKey(error))}</AlertDescription>
    </Alert>
  );
}

/**
 * Main entry context component that displays the entry data
 */
function EntryContextMain({
  data,
  onSave,
  onDelete,
  entry,
  onGoToFile,
}: {
  data: GetLedgerEntryContextQuery["getLedgerEntryContext"];
  entry: JournalDirectiveType | null;
  onSave: (
    entryHash: string,
    newSource: string,
    sha256sum: string,
  ) => Promise<void>;
  onDelete: (entryHash: string, sha256sum: string) => Promise<void>;
  onGoToFile?: (filename: string, lineNumber: number) => void;
}) {
  const { t } = useTranslations();
  const [sourceText, setSourceText] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSource, setOriginalSource] = useState("");
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isDark = useIsDarkTheme();
  const isMobile = useIsMobile();

  // Update source text when data changes
  useEffect(() => {
    if (data?.slice) {
      const newSource = data.slice;
      setSourceText(newSource);
      setOriginalSource(newSource);
      setHasChanges(false);
    }
  }, [data?.slice]);

  // Track changes to source text
  useEffect(() => {
    setHasChanges(sourceText !== originalSource);
  }, [sourceText, originalSource]);

  const handleSave = async () => {
    if (entry?.entry_hash && hasChanges && !isSaving) {
      setIsSaving(true);
      try {
        await onSave(entry.entry_hash, sourceText, data.sha256sum);
        setHasChanges(false);
        setOriginalSource(sourceText);
      } catch {
        // Error handling is done in the parent handler
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleDelete = async () => {
    if (entry?.entry_hash && data?.sha256sum && !isDeleting) {
      setIsDeleting(true);
      try {
        await onDelete(entry.entry_hash, data.sha256sum);
      } catch {
        // Error handling is done in the parent handler
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Helper function to format balances for display
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

  const entryFilename =
    (data?.entry as unknown as EntryContextEntry)?.meta?.filename ?? "";
  const entryLineNumber =
    (data?.entry as unknown as EntryContextEntry)?.meta?.lineno ?? 0;

  return (
    <div className="space-y-4">
      {/* Location Display */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium ">
          {t("journal.entryLocation")}
        </span>
        <code
          className="text-sm rounded underline"
          onClick={() => onGoToFile?.(entryFilename, entryLineNumber)}
        >
          {entryFilename}:{entryLineNumber}
        </code>
      </div>
      {data?.balances_before && data?.balances_after ? (
        <div className="w-full rounded-md overflow-hidden">
          <div
            className="flex items-center justify-between p-2 bg-muted text-foreground cursor-pointer transition-colors"
            onClick={() => setIsContextOpen(!isContextOpen)}
          >
            <div className="flex items-center gap-2">
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  isContextOpen ? "rotate-180" : "",
                )}
              />
              <span className="font-semibold">{t("journal.entryContext")}</span>
            </div>
          </div>

          {isContextOpen && (
            <div className="border border-t-0 border-border rounded-b-md overflow-hidden">
              {/* Balances Before Section */}
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

              {/* Balances After Section */}
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
          )}
        </div>
      ) : null}

      {/* Entry Source - Monaco Editor */}
      <Card>
        <CardContent className="p-0">
          <div className={cn(isMobile ? "h-[200px]" : "h-[100px]")}>
            <Editor
              height={isMobile ? "200px" : "100px"}
              language="beancount"
              value={sourceText}
              onChange={(value) => setSourceText(value || "")}
              theme={isDark ? "vs-dark" : "light"}
              beforeMount={(monaco) => {
                registerBeancountLanguage(monaco);
              }}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                lineNumbers: "on",
                readOnly: false,
              }}
            />
          </div>
          {hasChanges && (
            <div className="p-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20">
              {t("journal.sourceModified")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={isDeleting || isSaving}
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4 mr-2" />
          )}
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
    </div>
  );
}

/**
 * Dialog component for viewing and editing entry context
 * Shows location, content, and allows editing of entry source
 */
export function EntryContextDialog({
  open,
  onOpenChange,
  entry,
  ledgerId,
  onSuccess,
}: EntryContextDialogProps) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const fileNavigate = useFileNavigate();
  const clearCache = useApolloCacheClear();
  const { data, loading, error } = useQuery(GetLedgerEntryContextDocument, {
    variables: {
      entryHash: entry?.entry_hash || "",
      ledgerId: ledgerId,
    },
    skip: !entry?.entry_hash || !open,
  });

  // Delete entry mutation
  const [deleteEntrySourceSlice] = useMutation<
    DeleteLedgerEntrySourceSliceMutation,
    DeleteLedgerEntrySourceSliceMutationVariables
  >(DeleteLedgerEntrySourceSliceDocument);

  // Update entry mutation
  const [updateEntrySourceSlice] = useMutation<
    UpdateLedgerEntrySourceSliceMutation,
    UpdateLedgerEntrySourceSliceMutationVariables
  >(UpdateLedgerEntrySourceSliceDocument);

  const handleSave = async (
    entryHash: string,
    newSource: string,
    sha256sum: string,
  ) => {
    try {
      await updateEntrySourceSlice({
        variables: {
          ledgerId: ledgerId,
          input: {
            entryHash,
            sha256sum,
            newContent: newSource,
          },
        },
      });
      toast.success(t("journal.entrySavedSuccess"));
      onOpenChange(false);
      clearCache();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to update entry:", error);
      toast.error(formatError(error));
      throw error;
    }
  };

  const handleDelete = async (entryHash: string, sha256sum: string) => {
    try {
      await deleteEntrySourceSlice({
        variables: {
          ledgerId: ledgerId,
          input: {
            entryHash,
            sha256sum,
          },
        },
      });
      toast.success(t("journal.entryDeletedSuccess"));
      onOpenChange(false);
      clearCache();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to delete entry:", error);
      toast.error(formatError(error));
      throw error;
    }
  };

  const handleGoToFile = (filename: string, lineNumber: number) => {
    fileNavigate(ledgerId, "file", filename, { lineNumber, editMode: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] md:min-w-[600px] md:max-w-2xl lg:min-w-[800px] lg:max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <VisuallyHidden>
          <DialogTitle>{t("journal.entryContext")}</DialogTitle>
        </VisuallyHidden>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <EntryContextLoading />
          ) : error ? (
            <EntryContextError error={error} />
          ) : data?.getLedgerEntryContext ? (
            <EntryContextMain
              data={data.getLedgerEntryContext}
              onSave={handleSave}
              onDelete={handleDelete}
              entry={entry}
              onGoToFile={handleGoToFile}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t("journal.noEntryContext")}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

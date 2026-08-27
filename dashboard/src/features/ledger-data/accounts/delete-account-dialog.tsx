import { useState } from "react";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { useQuery, useMutation } from "@apollo/client/react";
import { MonacoEditor as Editor } from "@/common/components/monaco-editor";
import {
  GetLedgerEntryContextDocument,
  DeleteMultipleLedgerEntrySourceSlicesDocument,
} from "@/graphql/definitions";
import { registerBeancountLanguage } from "@/common/lib/editor/monaco-beancount-language-vscode";
import { useIsDarkTheme } from "@/common/hooks/use-theme";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/common/components/ui/dialog";
import { Button } from "@/common/components/ui/button";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Card, CardContent } from "@/common/components/ui/card";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AccountDirective } from "./types";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountDirective | null;
  ledgerId: string;
  onSuccess: () => void;
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
  account,
  ledgerId,
  onSuccess,
}: DeleteAccountDialogProps) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const isDark = useIsDarkTheme();

  const isClosed = account?.closedAt !== null;

  const {
    data: openCtxData,
    loading: openCtxLoading,
    error: openCtxError,
  } = useQuery(GetLedgerEntryContextDocument, {
    variables: { ledgerId, entryHash: account?.entryHash ?? "" },
    skip: !open || !account?.entryHash,
    fetchPolicy: "network-only",
  });

  const {
    data: closeCtxData,
    loading: closeCtxLoading,
    error: closeCtxError,
  } = useQuery(GetLedgerEntryContextDocument, {
    variables: { ledgerId, entryHash: account?.closeEntryHash ?? "" },
    skip: !open || !account?.closeEntryHash,
    fetchPolicy: "network-only",
  });

  const [deleteEntries] = useMutation(
    DeleteMultipleLedgerEntrySourceSlicesDocument,
  );

  const contextLoading = openCtxLoading || closeCtxLoading;
  const contextError = openCtxError ?? closeCtxError;

  const openCtx = openCtxData?.getLedgerEntryContext;
  const closeCtx = closeCtxData?.getLedgerEntryContext;

  const canSubmit =
    !isDeleting &&
    !contextLoading &&
    !!openCtx?.sha256sum &&
    (!isClosed || !!closeCtx?.sha256sum);

  const handleOpenChange = (v: boolean) => {
    if (!v) setError(null);
    onOpenChange(v);
  };

  const handleDelete = async () => {
    if (!account || !openCtx?.sha256sum || isDeleting) return;
    setError(null);
    setIsDeleting(true);
    try {
      const entries: { entryHash: string; sha256sum: string }[] = [
        { entryHash: account.entryHash, sha256sum: openCtx.sha256sum },
      ];
      if (isClosed && closeCtx?.sha256sum && account.closeEntryHash) {
        entries.push({
          entryHash: account.closeEntryHash,
          sha256sum: closeCtx.sha256sum,
        });
      }
      await deleteEntries({
        variables: { ledgerId, input: { entries } },
      });
      toast.success(
        t("page.accounts.accountDeletedToast", { account: account.account }),
      );
      onSuccess();
      handleOpenChange(false);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const openEntryFilename =
    (openCtx?.entry as { meta?: { filename?: string } } | null)?.meta
      ?.filename ?? "";
  const openEntryLineNumber =
    (openCtx?.entry as { meta?: { lineno?: number } } | null)?.meta?.lineno ??
    0;
  const closeEntryFilename =
    (closeCtx?.entry as { meta?: { filename?: string } } | null)?.meta
      ?.filename ?? "";
  const closeEntryLineNumber =
    (closeCtx?.entry as { meta?: { lineno?: number } } | null)?.meta?.lineno ??
    0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" />
            {t("page.accounts.deleteAccount")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            {isClosed
              ? t("page.accounts.deleteAccountDescriptionWithClose", {
                  account: account?.account ?? "",
                })
              : t("page.accounts.deleteAccountDescriptionOpenOnly", {
                  account: account?.account ?? "",
                })}
          </p>

          {contextLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("page.accounts.loadingEntryContent")}
            </div>
          )}

          {contextError && (
            <Alert variant="destructive">
              <AlertDescription>{formatError(contextError)}</AlertDescription>
            </Alert>
          )}

          {openCtx && (
            <>
              {openEntryFilename && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">
                    {t("page.accounts.open")}
                  </span>
                  <code className="text-sm rounded underline">
                    {openEntryFilename}:{openEntryLineNumber}
                  </code>
                </div>
              )}
              <Card>
                <CardContent className="p-0">
                  <div className="h-[80px]">
                    <Editor
                      height="80px"
                      language="beancount"
                      value={openCtx.slice ?? ""}
                      theme={isDark ? "vs-dark" : "light"}
                      beforeMount={(monaco) => {
                        registerBeancountLanguage(monaco);
                      }}
                      options={{
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        wordWrap: "on",
                        lineNumbers: "on",
                        readOnly: true,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {closeCtx && (
            <>
              {closeEntryFilename && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">
                    {t("page.accounts.close")}
                  </span>
                  <code className="text-sm rounded underline">
                    {closeEntryFilename}:{closeEntryLineNumber}
                  </code>
                </div>
              )}
              <Card>
                <CardContent className="p-0">
                  <div className="h-[80px]">
                    <Editor
                      height="80px"
                      language="beancount"
                      value={closeCtx.slice ?? ""}
                      theme={isDark ? "vs-dark" : "light"}
                      beforeMount={(monaco) => {
                        registerBeancountLanguage(monaco);
                      }}
                      options={{
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        wordWrap: "on",
                        lineNumbers: "on",
                        readOnly: true,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canSubmit}
            loading={isDeleting}
          >
            {t("common.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

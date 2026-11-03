import { useEntryWrite } from "@/common/lib/entry-write/entry-write";
import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation } from "@apollo/client/react";
import { BulkEntriesDocument, LedgerEntryType } from "@/graphql/definitions";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { negateDecimalNumber } from "@/common/lib/beancount/decimal-number";
import { useLedgerPermission } from "@/common/hooks/use-ledger-permission";
import { useTranslations } from "@/common/hooks/use-translations";
import { useWriteOutcome } from "@/common/hooks/use-write-outcome";
import type {
  LedgerTransactionInput,
  LedgerPostingInput,
} from "@/graphql/definitions";
import type { ImportTransaction, ImportResult } from "../types";

export type UseImportSubmitReturn = {
  submitImport: (transactions: ImportTransaction[]) => Promise<void>;
  importResult: ImportResult | null;
  isSubmitting: boolean;
};

/**
 * Hook to handle import submission with GraphQL transformation
 */
export function useImportSubmit(ledgerId: string): UseImportSubmitReturn {
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulkEntries] = useMutation(BulkEntriesDocument);
  const entryWrite = useEntryWrite();
  const formatError = useErrorMessage();
  const { t } = useTranslations();
  const { canWrite } = useLedgerPermission();
  const writeOutcome = useWriteOutcome(ledgerId);
  const canWriteRef = useRef(canWrite);

  useEffect(() => {
    canWriteRef.current = canWrite;
    // A permission change can unmount the workflow before this hook renders
    // again. Any retained submit callback must fail closed after that too.
    return () => {
      canWriteRef.current = false;
    };
  }, [canWrite]);

  const submitImport = useCallback(
    async (transactions: ImportTransaction[]) => {
      if (!canWriteRef.current) {
        const message = t("common.errors.forbidden");
        setImportResult({
          success: false,
          message,
          successCount: 0,
          failureCount: transactions.length,
          errors: [{ index: -1, message }],
        });
        return;
      }

      setIsSubmitting(true);
      const startTime = Date.now();
      const before = writeOutcome.snapshot();

      try {
        // Transform to GraphQL input format
        const transactionInputs: LedgerTransactionInput[] = transactions.map(
          (txn) => {
            // `txn.amount` is the signed bank movement on the source account.
            const postings: LedgerPostingInput[] = [
              {
                account: txn.sourceAccount,
                units: {
                  number: txn.amount,
                  currency: txn.currency,
                },
              },
              {
                account: txn.targetAccount,
                units: {
                  number: negateDecimalNumber(txn.amount),
                  currency: txn.currency,
                },
              },
            ];

            return {
              // Already the canonical YYYY-MM-DD the CSV named: no Date
              // instant exists on this path, so no zone can shift the day.
              date: txn.date,
              flag: "*",
              payee: txn.payee,
              narration: txn.description,
              postings,
            };
          },
        );

        // Built once: a retry resends the same batch under the same id.
        const variables = entryWrite.withRequestId({
          ledgerId,
          entries: transactionInputs.map((transaction) => ({
            type: LedgerEntryType.Transaction,
            transaction,
          })),
        });
        const result = await entryWrite.send(() => bulkEntries({ variables }));

        // Ensure minimum 2-second delay for better UX
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 2000 - elapsedTime);
        if (remainingTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingTime));
        }

        // bulkEntries is atomic (all-or-nothing): derive per-row counts from
        // the input size since the server reports only overall success.
        const ok = result.data?.bulkEntries?.success ?? false;
        const importResultData: ImportResult = {
          success: ok,
          successCount: ok ? transactions.length : 0,
          failureCount: ok ? 0 : transactions.length,
          message: result.data?.bulkEntries?.message || null,
          errors: [],
        };

        setImportResult(importResultData);
        if (ok) void writeOutcome.report(before);
      } catch (error) {
        console.error("Import error:", error);
        // Handle network/API errors
        setImportResult({
          success: false,
          message: formatError(error),
          successCount: 0,
          failureCount: transactions.length,
          errors: [
            {
              index: -1,
              message: formatError(error),
            },
          ],
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [ledgerId, bulkEntries, entryWrite, writeOutcome, formatError, t],
  );

  return {
    submitImport,
    importResult,
    isSubmitting,
  };
}

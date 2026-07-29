import { useState, useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import { BulkEntriesDocument, LedgerEntryType } from "@/graphql/definitions";
import { useErrorMessage } from "@/common/lib/errors/error-message";
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
  const formatError = useErrorMessage();

  const submitImport = useCallback(
    async (transactions: ImportTransaction[]) => {
      setIsSubmitting(true);
      const startTime = Date.now();

      try {
        // Transform to GraphQL input format
        const transactionInputs: LedgerTransactionInput[] = transactions.map(
          (txn) => {
            const postings: LedgerPostingInput[] = [
              // Source account posting (negative for expenses)
              {
                account: txn.sourceAccount,
                units: {
                  number: (-txn.amount).toString(),
                  currency: txn.currency,
                },
              },
              // Target account posting (positive for expenses)
              {
                account: txn.targetAccount,
                units: {
                  number: txn.amount.toString(),
                  currency: txn.currency,
                },
              },
            ];

            return {
              date: txn.date.toISOString().slice(0, 10),
              flag: "*",
              payee: txn.payee,
              narration: txn.description,
              postings,
            };
          },
        );

        const result = await bulkEntries({
          variables: {
            ledgerId,
            entries: transactionInputs.map((transaction) => ({
              type: LedgerEntryType.Transaction,
              transaction,
            })),
          },
        });

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
    [ledgerId, bulkEntries, formatError],
  );

  return {
    submitImport,
    importResult,
    isSubmitting,
  };
}

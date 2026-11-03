import { useEntryWrite } from "@/common/lib/entry-write/entry-write";
import { useState, useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import {
  negateDecimalNumber,
  parseDecimalNumber,
} from "@/common/lib/beancount/decimal-number";
import { useTempAssetUpload } from "@/features/importer/hooks/use-temp-asset-upload";
import {
  ParseReceiptDocument,
  InsertReceiptTransactionDocument,
} from "@/graphql/definitions";

export interface ParsedReceipt {
  // null when the receipt had no clearly visible date; the review form defaults to today
  date: string | null;
  payee: string;
  description: string;
  amount: number;
  sourceAccount?: string;
  targetAccount?: string;
}

export interface ReviewFormData {
  /** `yyyy-MM-dd` civil day. */
  date: string;
  payee: string;
  description: string;
  amount: string;
  currency: string;
  expenseAccount: string;
  paymentAccount: string;
  documentAccount: string;
}

type WorkflowState =
  | { step: "idle" }
  | { step: "uploading" }
  | { step: "parsing"; objectKey: string }
  | {
      step: "review";
      objectKey: string;
      parsed: ParsedReceipt;
      /** Why the last Record failed; the review keeps what was sent. */
      error?: string;
    }
  | { step: "success"; formData: ReviewFormData }
  | { step: "error"; message: string };

/**
 * The expense and payment posting amounts for a reviewed receipt: the typed
 * decimal as entered and its exact negation. Nothing is rounded to two places;
 * the currency is user-selected and a commodity may carry more precision.
 */
export function receiptPostingAmounts(
  typed: string,
): [expense: string, payment: string] {
  const amount = parseDecimalNumber(typed) ?? typed.trim();
  return [amount, negateDecimalNumber(amount)];
}

/**
 * Codes for a request the server refused before writing anything. A lost
 * connection, a server fault or an unknown code may still have recorded the
 * receipt.
 */
const REFUSAL_CODES = new Set([
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "BAD_USER_INPUT",
  "VALIDATION_FAILED",
  "CONFLICT",
  "RATE_LIMITED",
  "RESOURCE_LIMIT_REACHED",
  "OPERATION_NOT_ALLOWED",
  "PREMIUM_REQUIRED",
  "UNBALANCED",
]);

function wasRefused(err: unknown): boolean {
  return (
    CombinedGraphQLErrors.is(err) &&
    err.errors.every(({ extensions }) =>
      REFUSAL_CODES.has(String(extensions?.code)),
    )
  );
}

export function useReceiptWorkflow(ledgerId: string) {
  const [state, setState] = useState<WorkflowState>({ step: "idle" });
  const { uploadFile } = useTempAssetUpload();
  const [parseReceiptMutation] = useMutation(ParseReceiptDocument);
  const [insertReceiptTransaction] = useMutation(
    InsertReceiptTransactionDocument,
  );
  const entryWrite = useEntryWrite();
  const { t } = useTranslations();
  const formatError = useErrorMessage();

  const startUpload = useCallback(
    async (file: File) => {
      setState({ step: "uploading" });
      try {
        const { objectKey } = await uploadFile(file);
        setState({ step: "parsing", objectKey });

        const result = await parseReceiptMutation({
          variables: { s3ObjectKey: objectKey, ledgerId },
        });

        const rawParsed = result.data?.parseReceipt;
        if (!rawParsed) {
          setState({
            step: "error",
            message: t("receipt.workflow.failedToParse"),
          });
          return;
        }

        const parsed: ParsedReceipt = {
          ...rawParsed,
          sourceAccount: rawParsed.sourceAccount ?? undefined,
          targetAccount: rawParsed.targetAccount ?? undefined,
        };

        setState({ step: "review", objectKey, parsed });
      } catch (err) {
        setState({ step: "error", message: formatError(err) });
      }
    },
    [uploadFile, parseReceiptMutation, ledgerId, t, formatError],
  );

  /** Records the reviewed receipt; `true` once the transaction is written. */
  const submit = useCallback(
    async (formData: ReviewFormData) => {
      if (state.step !== "review") return false;
      const { objectKey, parsed } = state;
      // A failed Record returns to the review it was sent from. The form
      // stays mounted with the reader's corrections, and the uploaded receipt
      // is kept, so they can retry without uploading or parsing again (w4/m48).
      const failed = (error: string) => {
        setState({ step: "review", objectKey, parsed, error });
        return false;
      };

      const [expenseAmount, paymentAmount] = receiptPostingAmounts(
        formData.amount,
      );
      try {
        const result = await entryWrite.send(() =>
          insertReceiptTransaction({
            variables: entryWrite.withRequestId({
              ledgerId,
              receiptObjectKey: objectKey,
              input: {
                date: formData.date,
                payee: formData.payee,
                description: formData.description,
                postings: [
                  {
                    account: formData.expenseAccount,
                    amountNumber: expenseAmount,
                    amountCurrency: formData.currency,
                  },
                  {
                    account: formData.paymentAccount,
                    amountNumber: paymentAmount,
                    amountCurrency: formData.currency,
                  },
                ],
                documentAccount: formData.documentAccount,
              },
            }),
          }),
        );

        const data = result.data?.insertReceiptTransaction;
        if (!data?.success) return failed(t("receipt.workflow.failedToRecord"));

        setState({ step: "success", formData });
        return true;
      } catch (err) {
        return failed(
          wasRefused(err)
            ? formatError(err)
            : `${formatError(err)} ${t("receipt.workflow.recordUnconfirmed")}`,
        );
      }
    },
    [state, ledgerId, insertReceiptTransaction, entryWrite, t, formatError],
  );

  const reset = useCallback(() => {
    setState({ step: "idle" });
  }, []);

  return { state, startUpload, submit, reset };
}

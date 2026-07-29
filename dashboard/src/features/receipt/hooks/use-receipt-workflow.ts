import { useState, useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import { format } from "date-fns";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
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
  date: Date;
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
  | { step: "review"; objectKey: string; parsed: ParsedReceipt }
  | { step: "submitting"; objectKey: string; parsed: ParsedReceipt }
  | { step: "success"; formData: ReviewFormData }
  | { step: "error"; message: string };

export function useReceiptWorkflow(ledgerId: string) {
  const [state, setState] = useState<WorkflowState>({ step: "idle" });
  const { uploadFile } = useTempAssetUpload();
  const [parseReceiptMutation] = useMutation(ParseReceiptDocument);
  const [insertReceiptTransaction] = useMutation(
    InsertReceiptTransactionDocument,
  );
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

  const submit = useCallback(
    async (formData: ReviewFormData) => {
      if (state.step !== "review") return;
      const { objectKey, parsed } = state;

      setState({ step: "submitting", objectKey, parsed });
      try {
        const result = await insertReceiptTransaction({
          variables: {
            ledgerId,
            receiptObjectKey: objectKey,
            input: {
              date: format(formData.date, "yyyy-MM-dd"),
              payee: formData.payee,
              description: formData.description,
              postings: [
                {
                  account: formData.expenseAccount,
                  amountNumber: parseFloat(formData.amount).toFixed(2),
                  amountCurrency: formData.currency,
                },
                {
                  account: formData.paymentAccount,
                  amountNumber: (-parseFloat(formData.amount)).toFixed(2),
                  amountCurrency: formData.currency,
                },
              ],
              documentAccount: formData.documentAccount,
            },
          },
        });

        const data = result.data?.insertReceiptTransaction;
        if (!data?.success) {
          setState({
            step: "error",
            message: t("receipt.workflow.failedToRecord"),
          });
          return;
        }

        setState({ step: "success", formData });
      } catch (err) {
        setState({ step: "error", message: formatError(err) });
      }
    },
    [state, ledgerId, insertReceiptTransaction, t, formatError],
  );

  const reset = useCallback(() => {
    setState({ step: "idle" });
  }, []);

  return { state, startUpload, submit, reset };
}

import { useState, useCallback } from "react";
import * as FileSystem from "expo-file-system/legacy";
import {
  useGenerateTempAssetUploadUrlMutation,
  useParseReceiptWithLlmMutation,
  useInsertReceiptTransactionMutation,
  type InsertReceiptTransactionInput,
} from "@/generated-graphql/graphql";

export type ReceiptPhase =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "parsing" }
  | {
      kind: "review";
      objectKey: string;
      date: string;
      payee: string;
      description: string;
      amount: number;
      sourceAccount: string;
      targetAccount: string;
    }
  | { kind: "confirming" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export type ReceiptWorkflow = {
  phase: ReceiptPhase;
  startCapture: (
    uri: string,
    mimeType: string,
    filename: string,
    ledgerId: string,
  ) => Promise<void>;
  confirmTransaction: (
    input: InsertReceiptTransactionInput,
    ledgerId: string,
    receiptObjectKey: string,
  ) => Promise<void>;
};

export const useReceiptWorkflow = (): ReceiptWorkflow => {
  const [phase, setPhase] = useState<ReceiptPhase>({ kind: "idle" });

  const [generateUploadUrl] = useGenerateTempAssetUploadUrlMutation();
  const [parseReceipt] = useParseReceiptWithLlmMutation();
  const [insertReceipt] = useInsertReceiptTransactionMutation();

  const startCapture = useCallback(
    async (
      uri: string,
      mimeType: string,
      filename: string,
      ledgerId: string,
    ) => {
      try {
        setPhase({ kind: "uploading" });

        // 1. Get presigned upload URL (30s timeout — Apollo has no built-in timeout)
        const urlResult = await Promise.race([
          generateUploadUrl({ variables: { mimeType, filename } }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("upload_url_timeout")), 30_000),
          ),
        ]);
        const uploadData = urlResult.data?.generateTempAssetUploadUrl;
        if (!uploadData) throw new Error("upload_url_failed");

        // 2. PUT image to S3 via presigned URL
        // expo-file-system handles Content-Length automatically — plain fetch with
        // a Blob body omits it, causing S3 to hang indefinitely.
        const uploadResult = await Promise.race([
          FileSystem.uploadAsync(uploadData.uploadUrl, uri, {
            httpMethod: "PUT",
            headers: { "Content-Type": mimeType },
            uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("upload_s3_timeout")), 60_000),
          ),
        ]);
        if (uploadResult.status < 200 || uploadResult.status >= 300) {
          throw new Error("upload_failed");
        }

        // 3. Parse receipt with LLM
        setPhase({ kind: "parsing" });
        const parseResult = await parseReceipt({
          variables: { s3ObjectKey: uploadData.objectKey, ledgerId },
        });

        if (parseResult.errors?.length) {
          const msg = parseResult.errors[0].message ?? "";
          if (msg.includes("quota") || msg.includes("limit")) {
            throw new Error("quota_exhausted");
          }
          throw new Error("parse_failed");
        }

        const parsed = parseResult.data?.parseReceiptWithLLM;
        if (!parsed) throw new Error("parse_failed");

        setPhase({
          kind: "review",
          objectKey: uploadData.objectKey,
          date: parsed.date,
          payee: parsed.payee,
          description: parsed.description,
          amount: parsed.amount,
          sourceAccount: parsed.sourceAccount ?? "",
          targetAccount: parsed.targetAccount ?? "",
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "upload_failed";
        setPhase({ kind: "error", message: msg });
      }
    },
    [generateUploadUrl, parseReceipt],
  );

  const confirmTransaction = useCallback(
    async (
      input: InsertReceiptTransactionInput,
      ledgerId: string,
      receiptObjectKey: string,
    ) => {
      try {
        setPhase({ kind: "confirming" });
        const result = await insertReceipt({
          variables: { ledgerId, receiptObjectKey, input },
        });
        if (result.data?.insertReceiptTransaction?.success) {
          setPhase({ kind: "success" });
        } else {
          throw new Error("save_failed");
        }
      } catch (err) {
        console.error("[receipt] confirmTransaction failed:", err);
        setPhase({ kind: "error", message: "save_failed" });
      }
    },
    [insertReceipt],
  );

  return { phase, startCapture, confirmTransaction };
};

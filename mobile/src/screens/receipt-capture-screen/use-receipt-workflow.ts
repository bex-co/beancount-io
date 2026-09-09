import { useState, useCallback } from "react";
import * as FileSystem from "expo-file-system/legacy";
import {
  useGenerateTempAssetUploadUrlMutation,
  useParseReceiptMutation,
} from "@/generated-graphql/graphql";
import { receiptDate, parseErrorCode } from "./receipt-utils";
import { captureError } from "@/common/sentry/capture";

type ParsedReceipt = {
  date: string;
  payee: string;
  description: string;
  amount: number;
  sourceAccount: string;
  targetAccount: string;
};

type ReceiptPhase =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "parsing" }
  | ({ kind: "parsed" } & ParsedReceipt)
  | { kind: "error"; message: string };

export type ReceiptWorkflow = {
  phase: ReceiptPhase;
  startCapture: (
    uri: string,
    mimeType: string,
    filename: string,
    ledgerId: string,
  ) => Promise<void>;
  reset: () => void;
};

export const useReceiptWorkflow = (): ReceiptWorkflow => {
  const [phase, setPhase] = useState<ReceiptPhase>({ kind: "idle" });

  const [generateUploadUrl] = useGenerateTempAssetUploadUrlMutation();
  const [parseReceipt] = useParseReceiptMutation();

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

        // 3. Parse receipt with LLM. Under Apollo's default errorPolicy a
        // GraphQL error rejects here rather than populating `result.errors`;
        // classify the leg from the thrown ApolloError so quota exhaustion and
        // parse failures show their own messages instead of "Upload failed".
        setPhase({ kind: "parsing" });
        let parseResult: Awaited<ReturnType<typeof parseReceipt>>;
        try {
          parseResult = await parseReceipt({
            variables: { s3ObjectKey: uploadData.objectKey, ledgerId },
          });
        } catch (parseErr) {
          captureError(parseErr, { phase: "parse", ledgerId });
          throw new Error(parseErrorCode(parseErr));
        }

        const parsed = parseResult.data?.parseReceipt;
        if (!parsed) throw new Error("parse_failed");

        // The uploaded asset is only an LLM input — it expires out of the temp
        // bucket on its own. Nothing downstream needs the objectKey because the
        // transaction is written through the generic addEntries mutation.
        setPhase({
          kind: "parsed",
          date: receiptDate(parsed.date),
          payee: parsed.payee,
          description: parsed.description,
          amount: parsed.amount,
          sourceAccount: parsed.sourceAccount ?? "",
          targetAccount: parsed.targetAccount ?? "",
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "upload_failed";
        // Parse-leg errors are already captured with their phase above; capture
        // anything else (upload-URL mint, S3 PUT, network) here so the real
        // cause is never swallowed — the screen only shows a generic message.
        if (msg !== "quota_exhausted" && msg !== "parse_failed") {
          captureError(err, { phase: "upload", code: msg });
        }
        setPhase({ kind: "error", message: msg });
      }
    },
    [generateUploadUrl, parseReceipt],
  );

  const reset = useCallback(() => setPhase({ kind: "idle" }), []);

  return { phase, startCapture, reset };
};

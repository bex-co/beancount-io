import { useState, useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import {
  useGenerateTempAssetUploadUrlMutation,
  useParseReceiptMutation,
} from "@/generated-graphql/graphql";
import {
  receiptDate,
  parseErrorCode,
  isPermanentReceiptRefusal,
} from "./receipt-utils";
import { captureError } from "@/common/sentry/capture";
import {
  abandonAttempt,
  createIdleGuard,
  uploadOutcome,
  uploadPercent,
  type ReceiptAttempt,
} from "./upload-guard";

/** An upload may stall this long between progress events before it fails. */
const UPLOAD_IDLE_MS = 30_000;

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
  | { kind: "uploading"; percent: number | null }
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
  /** Abandon the attempt in flight and return to the preview (w21/205). */
  cancel: () => void;
  reset: () => void;
};

/** One run of the workflow; `cancel` flips it and aborts what is in flight. */
type Attempt = ReceiptAttempt;

export const useReceiptWorkflow = (): ReceiptWorkflow => {
  const [phase, setPhase] = useState<ReceiptPhase>({ kind: "idle" });

  const attempt = useRef<Attempt | null>(null);
  // The photo that reached storage, by its file, for a parse retried from it.
  const uploaded = useRef<{ uri: string; objectKey: string } | null>(null);
  // Leaving the screen abandons the attempt in flight, as Cancel does: Android's
  // hardware Back pops the modal mid-upload (w21/638).
  useEffect(
    () => () => {
      abandonAttempt(attempt.current);
    },
    [],
  );

  const [generateUploadUrl] = useGenerateTempAssetUploadUrlMutation();
  const [parseReceipt] = useParseReceiptMutation();

  const startCapture = useCallback(
    async (
      uri: string,
      mimeType: string,
      filename: string,
      ledgerId: string,
    ) => {
      const run: Attempt = {
        cancelled: false,
        abort: new AbortController(),
        upload: null,
      };
      attempt.current = run;
      // A cancelled attempt finishes silently: its late results and errors
      // must not move a screen the user already left.
      const live = () => !run.cancelled;
      try {
        // A photo that already reached storage is parsed again from there:
        // Try Again after a failed parse re-sent the whole photo, ~80 s on a
        // slow link (w21/956).
        const uploadPhoto = async (): Promise<string | null> => {
          setPhase({ kind: "uploading", percent: null });

          // 1. Get presigned upload URL (30s timeout — Apollo has no built-in timeout)
          const urlResult = await Promise.race([
            generateUploadUrl({
              variables: { mimeType, filename },
              context: { fetchOptions: { signal: run.abort.signal } },
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("upload_url_timeout")), 30_000),
            ),
          ]);
          if (!live()) return null;
          const uploadData = urlResult.data?.generateTempAssetUploadUrl;
          if (!uploadData) throw new Error("upload_url_failed");

          // 2. PUT image to S3 via presigned URL
          // expo-file-system handles Content-Length automatically — plain fetch with
          // a Blob body omits it, causing S3 to hang indefinitely.
          // The limit is idle time, not the whole transfer: a slow link that
          // keeps moving bytes finishes, a stalled one fails (w21/205).
          let timedOut = false;
          const idle = createIdleGuard(UPLOAD_IDLE_MS, () => {
            timedOut = true;
            void run.upload?.cancelAsync();
          });
          let lastPercent: number | null = null;
          const task = FileSystem.createUploadTask(
            uploadData.uploadUrl,
            uri,
            {
              httpMethod: "PUT",
              headers: { "Content-Type": mimeType },
              uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
            },
            (progress) => {
              idle.touch();
              const percent = uploadPercent(progress);
              if (percent !== lastPercent && live()) {
                lastPercent = percent;
                setPhase({ kind: "uploading", percent });
              }
            },
          );
          run.upload = task;
          idle.touch();
          // The background session keeps uploading while JS is suspended, so the
          // silence there is not a stall: the clock stops with the app and starts
          // afresh on return (w21/636).
          const appState = AppState.addEventListener("change", (state) => {
            if (state === "active") idle.touch();
            else idle.stop();
          });
          let uploadResult: Awaited<ReturnType<typeof task.uploadAsync>>;
          try {
            uploadResult = await task.uploadAsync();
          } finally {
            idle.stop();
            appState.remove();
          }
          if (!live()) return null;
          const outcome = uploadOutcome(uploadResult, timedOut);
          if (outcome === "timeout") throw new Error("upload_s3_timeout");
          if (outcome === "failed") throw new Error("upload_failed");
          return uploadData.objectKey;
        };
        const stored =
          uploaded.current?.uri === uri ? uploaded.current.objectKey : null;
        const objectKey = stored ?? (await uploadPhoto());
        if (objectKey === null) return;
        uploaded.current = { uri, objectKey };

        // 3. Parse receipt with LLM. Under Apollo's default errorPolicy a
        // GraphQL error rejects here rather than populating `result.errors`;
        // classify the leg from the thrown ApolloError so quota exhaustion and
        // parse failures show their own messages instead of "Upload failed".
        setPhase({ kind: "parsing" });
        let parseResult: Awaited<ReturnType<typeof parseReceipt>>;
        try {
          parseResult = await parseReceipt({
            variables: { s3ObjectKey: objectKey, ledgerId },
            context: { fetchOptions: { signal: run.abort.signal } },
          });
        } catch (parseErr) {
          if (!live()) return;
          // A key that failed to parse again may be gone from storage: the next
          // try uploads afresh.
          if (stored !== null) uploaded.current = null;
          captureError(parseErr, { phase: "parse", ledgerId });
          throw new Error(parseErrorCode(parseErr));
        }

        if (!live()) return;
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
        if (!live()) return;
        // A server that refuses for good (not set up for receipts) says so, and
        // offers no retry (w21/869).
        const msg = isPermanentReceiptRefusal(err)
          ? "not_available"
          : err instanceof Error
            ? err.message
            : "upload_failed";
        // Parse-leg errors are already captured with their phase above; capture
        // anything else (upload-URL mint, S3 PUT, network) here so the real
        // cause is never swallowed — the screen only shows a generic message.
        if (
          msg !== "quota_exhausted" &&
          msg !== "parse_failed" &&
          msg !== "not_available"
        ) {
          captureError(err, { phase: "upload", code: msg });
        }
        setPhase({ kind: "error", message: msg });
      }
    },
    [generateUploadUrl, parseReceipt],
  );

  const cancel = useCallback(() => {
    abandonAttempt(attempt.current);
    uploaded.current = null;
    setPhase({ kind: "idle" });
  }, []);

  // Retaking drops the photo, so its stored copy goes with it.
  const reset = useCallback(() => {
    uploaded.current = null;
    setPhase({ kind: "idle" });
  }, []);

  return { phase, startCapture, cancel, reset };
};

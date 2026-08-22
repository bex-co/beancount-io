import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  ApiProvider,
  CallApiContextParams,
  ProviderOptions,
  ProviderResponse,
} from "promptfoo";
import { LLMClient } from "../../src/features/llm/utils/llm-client";
import { categorizeTransactions } from "../../src/features/llm/utils/categorize-transactions";
import { suggestAccountMapping } from "../../src/features/llm/utils/suggest-account-mapping";
import { recommendAccounts } from "../../src/features/llm/utils/recommend-accounts";
import { extractTransactionsFromFile } from "../../src/features/llm/utils/extract-transactions-from-file";
import { classifyFile } from "../../src/features/llm/utils/media-type-utils";
import { type ParsedTransaction } from "../../src/features/llm/types";

/** Reads a fixture file (path relative to evals/) and returns its bare base64
 * payload — no `data:` prefix, since the AI SDK's own download check accepts
 * inline DataContent but rejects any `new URL()`-parseable string on a
 * non-http(s) scheme. */
function readFixtureFileAsBase64(relativePath: string): string {
  const absolutePath = resolve(__dirname, "..", relativePath);
  return readFileSync(absolutePath).toString("base64");
}

type WorkflowName =
  | "categorize-transactions"
  | "suggest-account-mapping"
  | "recommend-accounts"
  | "extract-transactions-from-file";

const WORKFLOWS: Record<
  WorkflowName,
  (client: LLMClient, vars: Record<string, unknown>) => Promise<unknown>
> = {
  "categorize-transactions": (client, vars) =>
    categorizeTransactions(
      client,
      vars as Parameters<typeof categorizeTransactions>[1],
    ),
  "suggest-account-mapping": (client, vars) =>
    suggestAccountMapping(
      client,
      vars as Parameters<typeof suggestAccountMapping>[1],
    ),
  "recommend-accounts": (client, vars) => {
    const { transaction, accounts } = vars as {
      transaction: ParsedTransaction;
      accounts: string[];
    };
    return recommendAccounts(client, transaction, accounts);
  },
  "extract-transactions-from-file": (client, vars) => {
    const { format, mediaType, fileContent, imagePath } = vars as {
      format: string;
      mediaType?: string;
      fileContent?: string;
      imagePath?: string;
    };
    // Same category split prepare-llm-message.ts itself uses: "text" formats
    // (csv/ofx/txt/json/xml) resolve fileUrl via a real fetch() there, so a
    // data: URI works with zero network dependency. "image"/"file" categories
    // need a bare base64 string instead — a full data: URI fails the AI
    // SDK's own http/https-only download check, but a string that isn't a
    // valid URL at all skips that check and is used as inline data.
    const category = classifyFile(format, mediaType);
    const fileUrl =
      category === "text"
        ? `data:text/plain;charset=utf-8,${encodeURIComponent(fileContent ?? "")}`
        : readFixtureFileAsBase64(imagePath ?? "");
    return extractTransactionsFromFile({
      llmClient: client,
      fileUrl,
      format,
      mediaType,
    });
  },
};

function isWorkflowName(value: unknown): value is WorkflowName {
  return typeof value === "string" && value in WORKFLOWS;
}

/**
 * Calls the real production categorize/mapping functions (prompt building, Zod
 * output schema, and Anthropic->OpenAI fallback model, unchanged) so evals exercise
 * the exact code path used at request time instead of a parallel re-implementation.
 */
export default class LlmWorkflowProvider implements ApiProvider {
  private readonly workflowName: WorkflowName;

  constructor(options: ProviderOptions) {
    const workflowName = options.config?.workflow;
    if (!isWorkflowName(workflowName)) {
      throw new Error(
        `llm-workflow-provider: config.workflow must be one of ${Object.keys(WORKFLOWS).join(", ")}, got "${String(workflowName)}"`,
      );
    }
    this.workflowName = workflowName;
  }

  id(): string {
    return `llm-workflow:${this.workflowName}`;
  }

  async callApi(
    _prompt: string,
    context?: CallApiContextParams,
  ): Promise<ProviderResponse> {
    const accessKey = process.env.BLOCKEDEN_ACCESS_KEY;
    if (!accessKey) {
      return { error: "BLOCKEDEN_ACCESS_KEY is required to run LLM evals" };
    }
    try {
      const client = new LLMClient(accessKey);
      const result = await WORKFLOWS[this.workflowName](
        client,
        // Test-case fields live under a single object-typed `params` var —
        // promptfoo treats a top-level string-array var as a combinatorial
        // dimension (one run per element) rather than a literal list, so
        // nesting everything under one object key avoids that entirely.
        (context?.vars?.params as Record<string, unknown>) ?? {},
      );
      return { output: JSON.stringify(result) };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }
}

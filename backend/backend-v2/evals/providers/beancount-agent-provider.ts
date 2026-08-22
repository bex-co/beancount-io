import type {
  ApiProvider,
  CallApiContextParams,
  ProviderResponse,
} from "promptfoo";
import { createFallbackLanguageModel } from "../../src/features/llm/utils/fallback-language-model";
import { BeancountAgent } from "../../src/features/ai-agent/service/agent-handler/beancount-agent";
import type { ToolContext } from "../../src/features/ai-agent/tools/types";
import type { createFavaApi } from "../../src/foundation/fava";

type FavaApiClient = ReturnType<typeof createFavaApi>;

/**
 * A stub ToolContext: the model calls real tools with real schemas, but
 * execution never touches Fava/Gitea/S3 — each method returns canned data
 * in the shape unwrapFavaResponse/decodeFileContent expect. Used to test
 * which tool the model chooses and with what arguments, not real side effects.
 */
function buildStubToolContext(): ToolContext {
  const favaApi = {
    shell: {
      queryShellText: async () => ({
        data: {
          success: true,
          data: { text: "Assets:Checking  1234.56 USD" },
        },
      }),
    },
    ledgers: {
      getLedgerDirContent: async () => ({
        data: {
          success: true,
          data: [{ name: "main.bean", path: "main.bean", type: "file" }],
        },
      }),
      getLedgerFilesContent: async () => ({
        data: {
          success: true,
          data: [
            {
              path: "main.bean",
              content:
                "2024-01-01 open Assets:Checking USD\n2024-01-01 open Expenses:Food USD\n",
              encoding: undefined,
              sha: "stub-sha",
            },
          ],
        },
      }),
      changeLedgerFiles: async () => ({
        data: { success: true, data: { commitSha: "stub-commit-sha" } },
      }),
    },
  } as unknown as FavaApiClient;

  return {
    favaApi,
    ledgerId: "testuser/testledger",
    userId: "test-user-id",
    llmService: {
      parseFile: async () => {
        throw new Error("parseFile not stubbed");
      },
      parseReceipt: async () => ({
        date: "2024-05-01",
        payee: "Test Cafe",
        description: "Lunch",
        amount: -12,
        sourceAccount: "Assets:Checking",
        targetAccount: "Expenses:Food:Dining",
      }),
      suggestCategories: async () => [],
    },
    ledgerReceiptWorkflow: {
      insertReceiptTransaction: async () => ({ success: true }),
    },
  };
}

export default class BeancountAgentProvider implements ApiProvider {
  id(): string {
    return "beancount-agent";
  }

  async callApi(
    _prompt: string,
    context?: CallApiContextParams,
  ): Promise<ProviderResponse> {
    const accessKey = process.env.BLOCKEDEN_ACCESS_KEY;
    if (!accessKey) {
      return { error: "BLOCKEDEN_ACCESS_KEY is required to run LLM evals" };
    }
    const { userMessage } =
      (context?.vars?.params as { userMessage: string }) ?? {};
    try {
      const model = createFallbackLanguageModel(accessKey);
      const agent = new BeancountAgent(model, buildStubToolContext());
      const result = await agent.generate([
        { role: "user", content: userMessage },
      ]);
      // result.toolCalls only reflects the LAST step (e.g. empty once the
      // agent's final step just summarizes an earlier tool's result in
      // text) — flatten across result.steps for the full trajectory.
      const toolCalls = result.steps.flatMap((step) =>
        step.toolCalls.map((tc) => ({
          toolName: tc.toolName,
          input: tc.input,
        })),
      );
      return {
        output: JSON.stringify({ toolCalls, text: result.text }),
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }
}

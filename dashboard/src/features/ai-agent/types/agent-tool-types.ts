// GENERATED FILE — do not edit manually.
// Run: yarn generate-agent-tool-types (from backend/backend-v2)
// Source: src/features/ai-agent/tools/*-tool.ts
//
// Zero runtime dependencies — safe to copy to any consumer (e.g. dashboard/).

/** Maps tool name → its input argument type (what the AI model sends). */
export type AgentToolInputs = {
  runBqlQuery: {
    query: string;
  };
  readLedgerFiles: {
    files: Array<
      {
        path: string;
        start_line?: number;
        end_line?: number;
      }
    >;
  };
  listLedgerFiles: {
    dir_path?: string;
  };
  editLedgerFiles: {
    description: string;
    files: Array<
      | {
        operation: "create";
        path: string;
        content: string;
      }
      | {
        operation: "update";
        path: string;
        old_string: string;
        new_string: string;
      }
      | {
        operation: "replace";
        path: string;
        content: string;
      }
      | {
        operation: "delete";
        path: string;
      }
    >;
    dry_run: boolean;
  };
  parseReceipt: {
    objectKey: string;
  };
  insertReceiptTransaction: {
    receiptObjectKey: string;
    date: | string
    | null;
    payee: string;
    description: string;
    amount: string;
    currency: string;
    expenseAccount: string;
    paymentAccount: string;
    documentAccount: string;
  };
};

export type AgentToolName = keyof AgentToolInputs;

/** Maps tool name → its structured output type. */
export type AgentToolOutputs = {
  runBqlQuery: | {
    ok: true;
    result: string;
  }
  | {
    ok: false;
    error: string;
  };
  readLedgerFiles: | {
    ok: true;
    result: Array<
      {
        path: string;
        startLine: number;
        endLine: number;
        totalLines: number;
        content: string;
      }
    >;
  }
  | {
    ok: false;
    error: string;
  };
  listLedgerFiles: | {
    ok: true;
    result: Array<
      {
        path: string;
        type: "file" | "dir";
      }
    >;
  }
  | {
    ok: false;
    error: string;
  };
  editLedgerFiles: | {
    ok: true;
    result: {
      dry_run: boolean;
      count: number;
      operations: Array<
        {
          operation: string;
          path: string;
        }
      >;
    };
  }
  | {
    ok: false;
    error: string;
  };
  parseReceipt: | {
    ok: true;
    result: {
      date: | string
      | null;
      payee: string;
      description: string;
      amount: number;
      sourceAccount?: string;
      targetAccount?: string;
    };
  }
  | {
    ok: false;
    error: string;
  };
  insertReceiptTransaction: | {
    ok: true;
    result: {
      success: boolean;
    };
  }
  | {
    ok: false;
    error: string;
  };
};

/** UITools-compatible type for use with useChat<UIMessage<unknown, never, AgentUITools>>. */
export type AgentUITools = {
  [K in AgentToolName]: { input: AgentToolInputs[K]; output: AgentToolOutputs[K] };
};

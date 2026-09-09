import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerReceiptMutationResolver } from "../../../resolvers/ledger-receipt-resolver";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import { LedgerReceiptWorkflow } from "@/features/ledger/workflow/ledger-receipt-workflow";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
} from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};
const receiptObjectKey = "tmp/usr_alice/receipt.pdf";
const receiptBytes = Buffer.from("%PDF-1.4 fixture receipt");
// Three postings on purpose: the operation contract carries an arbitrary
// posting list, wider than the two-posting chat-tool shape.
const input = {
  date: "2026-09-01",
  payee: "Café Fixture",
  description: "Team breakfast",
  postings: [
    { account: "Expenses:Food", amountNumber: "18.20", amountCurrency: "USD" },
    { account: "Expenses:Tips", amountNumber: "2.00", amountCurrency: "USD" },
    {
      account: "Liabilities:CreditCard",
      amountNumber: "-20.20",
      amountCurrency: "USD",
    },
  ],
  documentAccount: "Expenses:Food",
};
const writtenPostings = input.postings.map((p) => ({
  account: p.account,
  units: { number: p.amountNumber, currency: p.amountCurrency },
}));

let resolver: LedgerReceiptMutationResolver;
let schema: Awaited<ReturnType<typeof buildSchema>>;
beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [LedgerReceiptMutationResolver, HealthResolver],
    container: {
      get: (target) =>
        target === LedgerReceiptMutationResolver
          ? resolver
          : new HealthResolver(),
    },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
});

async function fixture(caller = identity) {
  const state = { permission: "write", bcio: {} as Record<string, string> };
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  const write = jest.fn(async () => ({ success: true }));
  const copy = jest.fn(async () => ({ filename: "promoted-receipt.pdf" }));
  const deleteTemp = jest.fn(async () => undefined);
  const download = jest.fn(async () => ({
    downloadUrl: `data:application/pdf;base64,${receiptBytes.toString("base64")}`,
  }));
  const createFile = jest.fn(async () => envelope({}));
  const fava = {
    getAdminClient: () => ({
      ledgers: { getLedger: async () => envelope({ id: 42, private: true }) },
    }),
    getApiContext: async () => ({
      favaApiClient: {
        collaborators: {
          getLedgerCollaboratorPermission: async () =>
            envelope({ permission: state.permission }),
        },
      },
    }),
    getPublicApiClient: async () => ({
      reports: { getLedgerBcioOptions: async () => envelope(state.bcio) },
      ledgers: { createLedgerFile: createFile },
    }),
  };
  const models = {
    user: {
      getUserByUsername: async () => ({ id: "usr_owner" }),
      getById: async () => ({ id: caller.userId, ledger_username: "alice" }),
    },
  };
  const workflow = new LedgerReceiptWorkflow(
    fava as never,
    {
      generateDownloadUrl: download,
      copyTempToPermanent: copy,
      deleteTempAsset: deleteTemp,
    } as never,
    { writeBulkEntries: write } as never,
    { dashboard: { url: "https://dash.example" } } as never,
    new AuthorizationService(
      new SourceBackedRelationshipEvaluator(
        {} as never,
        models as never,
        {} as never,
        fava as never,
      ),
    ),
  );
  resolver = new LedgerReceiptMutationResolver(workflow);
  const rest = await startV1TestServer(
    { workflows: { ledgerReceipt: workflow } } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(caller);
  const server = assembleMcpRegistry(
    {
      identity: caller,
      ledgerReceiptWorkflow: workflow,
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "receipt-insert-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    client,
    state,
    write,
    copy,
    deleteTemp,
    createFile,
    rest: (body: unknown = { receiptObjectKey, input }) =>
      fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main/import/insert-receipt`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      ),
    gql: (vars: Record<string, unknown> = { receiptObjectKey, input }) =>
      graphql({
        schema,
        source:
          "mutation($ledgerId:String!,$receiptObjectKey:String!,$input:InsertReceiptTransactionInput!) { insertReceiptTransaction(ledgerId:$ledgerId,receiptObjectKey:$receiptObjectKey,input:$input) { success } }",
        variableValues: { ledgerId: "alice/main", ...vars },
        contextValue: { identity: caller, getCurrentIdentity: () => caller },
      }),
    mcp: (args: Record<string, unknown> = { receiptObjectKey, input }) =>
      client.callTool({
        name: "insertReceiptTransaction",
        arguments: {
          ...args,
          ...(caller.ledgerScope ? {} : { ledger: "alice/main" }),
        },
      }),
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

it.each([identity, { ...identity, ledgerScope: undefined }])(
  "promotes the receipt to S3 storage and writes the transaction with %j",
  async (caller) => {
    const f = await fixture(caller);
    try {
      const r = await f.rest();
      const g = await f.gql();
      const m = await f.mcp();
      expect(r.status).toBe(200);
      expect(await r.json()).toEqual({ success: true });
      expect(g.errors).toBeUndefined();
      expect(g.data!.insertReceiptTransaction).toEqual({ success: true });
      expect(m.isError).not.toBe(true);
      expect((m.structuredContent as { result: unknown }).result).toEqual({
        summary:
          "Inserted receipt transaction for Café Fixture on 2026-09-01. No new bean-check errors.",
        success: true,
        wrote: [],
        entryHashes: [],
        validation: { errorsBefore: 0, errorsAfter: 0, newErrors: [] },
      });
      expect(f.copy).toHaveBeenCalledTimes(3);
      expect(f.copy).toHaveBeenCalledWith({
        objectKey: receiptObjectKey,
        scope: "repo_42",
      });
      expect(f.write).toHaveBeenCalledTimes(3);
      expect(f.write).toHaveBeenCalledWith(
        "usr_alice",
        "alice",
        "main",
        [
          {
            type: "transaction",
            entry: {
              date: input.date,
              flag: "*",
              payee: input.payee,
              narration: input.description,
              postings: writtenPostings,
              meta: {
                receipt:
                  "https://dash.example/ledger_assets/42/static/promoted-receipt.pdf",
              },
            },
          },
        ],
        "web",
      );
      expect(f.deleteTemp).toHaveBeenCalledTimes(3);
      expect(f.deleteTemp).toHaveBeenCalledWith(receiptObjectKey);
      expect(f.createFile).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  },
);

it("stores the receipt in git with a linked document when configured", async () => {
  const f = await fixture();
  f.state.bcio = { receipt_storage: "git", receipt_base_folder: "receipts" };
  try {
    expect((await f.rest()).status).toBe(200);
    expect((await f.gql()).errors).toBeUndefined();
    expect((await f.mcp()).isError).not.toBe(true);
    expect(f.createFile).toHaveBeenCalledTimes(3);
    expect(f.write).toHaveBeenCalledTimes(3);
    for (let call = 0; call < 3; call += 1) {
      const [owner, name, file] = f.createFile.mock.calls[call] as unknown as [
        string,
        string,
        { path: string; content: string; message: string },
      ];
      expect(owner).toBe("alice");
      expect(name).toBe("main");
      expect(file.path).toMatch(
        /^receipts\/2026-09-01-caf-fixture-[^./]+\.pdf$/,
      );
      expect(file.content).toBe(receiptBytes.toString("base64"));
      expect(file.message).toBe(`docs: add receipt ${file.path}`);
      const [userId, wOwner, wName, entries, platform] = f.write.mock.calls[
        call
      ] as unknown as [
        string,
        string,
        string,
        {
          type: string;
          entry: { links?: string[]; filename?: string; account?: string };
        }[],
        string,
      ];
      expect([userId, wOwner, wName, platform]).toEqual([
        "usr_alice",
        "alice",
        "main",
        "web",
      ]);
      expect(entries).toHaveLength(2);
      const [document, transaction] = entries;
      expect(document.type).toBe("document");
      expect(document.entry).toEqual({
        date: input.date,
        account: input.documentAccount,
        filename: file.path,
        links: transaction.entry.links,
      });
      expect(transaction.type).toBe("transaction");
      expect(transaction.entry.links).toHaveLength(1);
      expect(transaction.entry.links![0]).toMatch(/^rcpt_/);
      expect(file.path).toContain(
        transaction.entry.links![0].replace("rcpt_", ""),
      );
    }
    expect(f.copy).not.toHaveBeenCalled();
    expect(f.deleteTemp).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

it.each(["tmp/usr_other/receipt.pdf", "assets/usr_alice/receipt.pdf"])(
  "conceals unowned key %s as not found before any effect",
  async (key) => {
    const f = await fixture();
    const args = { receiptObjectKey: key, input };
    try {
      expect((await f.rest(args)).status).toBe(404);
      expect((await f.gql(args)).errors).toHaveLength(1);
      expect((await f.mcp(args)).isError).toBe(true);
      expect(f.copy).not.toHaveBeenCalled();
      expect(f.createFile).not.toHaveBeenCalled();
      expect(f.write).not.toHaveBeenCalled();
      expect(f.deleteTemp).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  },
);

it("refuses missing write capability before any effect", async () => {
  const f = await fixture({ ...identity, scopes: new Set(["ledger.read"]) });
  try {
    expect((await f.rest()).status).toBe(403);
    expect((await f.gql()).errors).toHaveLength(1);
    expect((await f.mcp()).isError).toBe(true);
    expect(f.copy).not.toHaveBeenCalled();
    expect(f.write).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

it("refuses a caller whose write relationship was revoked", async () => {
  const f = await fixture();
  f.state.permission = "read";
  try {
    expect((await f.rest()).status).toBe(403);
    expect((await f.gql()).errors).toHaveLength(1);
    expect((await f.mcp()).isError).toBe(true);
    expect(f.copy).not.toHaveBeenCalled();
    expect(f.write).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

it("refuses a different credential pin before any effect", async () => {
  const f = await fixture({ ...identity, ledgerScope: "other/books" });
  try {
    expect((await f.rest()).status).toBe(403);
    expect((await f.gql()).errors).toHaveLength(1);
    expect(
      (
        await f.client.callTool({
          name: "insertReceiptTransaction",
          arguments: { receiptObjectKey, input, ledger: "alice/main" },
        })
      ).isError,
    ).toBe(true);
    expect(f.copy).not.toHaveBeenCalled();
    expect(f.write).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

it("surfaces a failed entry write and keeps the temporary asset", async () => {
  const f = await fixture();
  f.write.mockRejectedValue(new Error("fixture ledger write failed"));
  try {
    expect((await f.rest()).status).toBe(500);
    expect((await f.gql()).errors).toHaveLength(1);
    expect((await f.mcp()).isError).toBe(true);
    // The promotion has already happened — the existing partial-failure
    // boundary — but the temporary key must survive for a retry.
    expect(f.copy).toHaveBeenCalledTimes(3);
    expect(f.deleteTemp).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

it("rejects malformed input before any effect", async () => {
  const f = await fixture();
  try {
    expect(
      (await f.rest({ receiptObjectKey, input, extra: true })).status,
    ).toBe(400);
    expect(
      (
        await f.rest({
          receiptObjectKey,
          input: { ...input, postings: [{ account: "Expenses:Food" }] },
        })
      ).status,
    ).toBe(400);
    const missingDocument: Record<string, unknown> = { ...input };
    delete missingDocument.documentAccount;
    expect(
      (await f.rest({ receiptObjectKey, input: missingDocument })).status,
    ).toBe(400);
    const invalid = await f.mcp({
      receiptObjectKey,
      input: { ...input, postings: "not-a-list" },
    });
    expect(invalid.isError).toBe(true);
    expect(f.copy).not.toHaveBeenCalled();
    expect(f.write).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

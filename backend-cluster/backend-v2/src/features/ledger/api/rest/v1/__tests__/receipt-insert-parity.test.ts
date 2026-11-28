import "reflect-metadata";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerReceiptMutationResolver } from "../../../resolvers/ledger-receipt-resolver";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import { LedgerReceiptWorkflow } from "@/features/ledger/workflow/ledger-receipt-workflow";
import { createLedgerEntryWriter } from "@/features/ledger/service/ledger-entry-service";
import { FavaApiError } from "@/foundation/fava/api-client";
import { S3Client } from "@aws-sdk/client-s3";
import { AssetStorageService } from "@/features/s3/service/asset-storage-service";
import { formatError } from "@/server/graphql/format-error";
import { NotFoundError, UnbalancedTransactionError } from "@/shared/errors";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
  TEMP_ASSET_NOT_FOUND_HINT,
} from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";
import { fakeRedisIdempotencyState } from "@/foundation/redis/__tests__/fake-redis-idempotency";

jest.mock(
  "@/foundation/redis/redis-idempotency",
  () =>
    jest.requireActual("@/foundation/redis/__tests__/fake-redis-idempotency")
      .fakeRedisIdempotency,
);

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

async function fixture(
  caller = identity,
  promote: (params: {
    objectKey: string;
    scope?: string;
  }) => Promise<{ filename: string }> = async () => ({
    filename: "promoted-receipt.pdf",
  }),
) {
  const state = { permission: "write", bcio: {} as Record<string, string> };
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  const write = jest.fn(async () => ({ success: true }));
  const copy = jest.fn(promote);
  const deleteTemp = jest.fn(async () => undefined);
  const download = jest.fn(async () => ({
    downloadUrl: `data:application/pdf;base64,${receiptBytes.toString("base64")}`,
  }));
  const createFile = jest.fn(async () => envelope({ sha: "sha-receipt" }));
  const deleteFile = jest.fn(async () => envelope({}));
  const getBcioOptions = jest.fn(async () =>
    envelope({ default_file: "main.bean", ...state.bcio }),
  );
  const getErrors = jest.fn(async () => []);
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
      // The ledger always answers a default_file (main.bean unless set).
      reports: {
        getLedgerBcioOptions: getBcioOptions,
      },
      ledgers: { createLedgerFile: createFile, deleteLedgerFile: deleteFile },
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
      services: { ledgerData: { getErrors } },
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
    download,
    deleteTemp,
    createFile,
    deleteFile,
    getBcioOptions,
    getErrors,
    rest: (body: unknown = { receiptObjectKey, input }) =>
      fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main/import/insert-receipt`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      ),
    gql: (
      vars: Record<string, unknown> = { receiptObjectKey, input },
      selection = "success",
      keyArg = "receiptObjectKey:$receiptObjectKey",
      keyVar = "$receiptObjectKey:String!",
    ) =>
      graphql({
        schema,
        source: `mutation($ledgerId:String!,${keyVar},$input:InsertReceiptTransactionInput!) { insertReceiptTransaction(ledgerId:$ledgerId,${keyArg},input:$input) { ${selection} } }`,
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
      expect(await r.json()).toEqual({ success: true, entryHashes: [] });
      expect(g.errors).toBeUndefined();
      expect(g.data!.insertReceiptTransaction).toEqual({ success: true });
      expect(m.isError).not.toBe(true);
      expect((m.structuredContent as { result: unknown }).result).toEqual({
        summary:
          "Inserted receipt transaction for Café Fixture on 2026-09-01. No new bean-check errors.",
        success: true,
        wrote: [],
        entryHashes: [],
        validation: {
          errorsBefore: 0,
          errorsAfter: 0,
          newErrors: [],
          valid: true,
        },
      });
      expect(f.copy).toHaveBeenCalledTimes(3);
      expect(f.copy).toHaveBeenCalledWith({
        objectKey: receiptObjectKey,
        scope: "repo_42",
      });
      // Each surface checks the entry (a dry run) before promoting, then
      // writes it (w23/058).
      expect(f.write).toHaveBeenCalledTimes(6);
      const checks = f.write.mock.calls.filter(
        (call) => (call as unknown[])[6] === true,
      );
      expect(checks).toHaveLength(3);
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
    // A dry run of the transaction precedes each stored receipt (w23/058).
    expect(f.write).toHaveBeenCalledTimes(6);
    const writes = f.write.mock.calls.filter(
      (call) => (call as unknown[])[6] !== true,
    );
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
      const [userId, wOwner, wName, entries, platform] = writes[
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

// w31/019: the document directive is routed to document_file (else
// default_file), and Beancount resolves its path from that file's directory.
// A repo-root path written into a subdirectory file named a missing file, so
// every insert was refused. The stored path stays repo-root-relative.
it.each<[Record<string, string>, string]>([
  [{ document_file: "books/docs.bean" }, "../documents/"],
  [{ document_file: "books/{year}/docs.bean" }, "../../documents/"],
  [{ default_file: "ledger/main.bean" }, "../documents/"],
  [{ document_file: "docs.bean" }, "documents/"],
  [
    { document_file: "receipts/docs.bean", receipt_base_folder: "receipts" },
    "",
  ],
])(
  "writes the document path from the file it is routed to (%j)",
  async (routing, prefix) => {
    const f = await fixture();
    f.state.bcio = { receipt_storage: "git", ...routing };
    try {
      expect((await f.rest()).status).toBe(200);
      expect((await f.gql()).errors).toBeUndefined();
      expect((await f.mcp()).isError).not.toBe(true);
      const writes = f.write.mock.calls.filter(
        (call) => (call as unknown[])[6] !== true,
      );
      expect(writes).toHaveLength(3);
      for (let call = 0; call < 3; call += 1) {
        const [, , stored] = f.createFile.mock.calls[call] as unknown as [
          string,
          string,
          { path: string; message: string },
        ];
        const folder = routing.receipt_base_folder ?? "documents";
        expect(stored.path).toMatch(
          new RegExp(`^${folder}/2026-09-01-caf-fixture-[^./]+\\.pdf$`),
        );
        expect(stored.message).toBe(`docs: add receipt ${stored.path}`);
        const [document] = (writes[call] as unknown[])[3] as {
          type: string;
          entry: { filename: string };
        }[];
        expect(document.type).toBe("document");
        expect(document.entry.filename).toBe(
          prefix + stored.path.slice(folder.length + 1),
        );
      }
    } finally {
      await f.close();
    }
  },
);

// w31/153: `receipt_base_folder` is a folder from the ledger root, read the
// way a routing option is (w31/152). Used as written, `./receipts` and
// `receipts/` built `./receipts/…` and `receipts//…`, which the ledger
// refuses to store, so every insert failed as an outage after its check.
describe("receipt_base_folder written with ./ or a trailing /", () => {
  it.each<[Record<string, string>, string, string]>([
    [{ receipt_base_folder: "./receipts" }, "receipts/", "receipts/"],
    [{ receipt_base_folder: "receipts/" }, "receipts/", "receipts/"],
    [
      { receipt_base_folder: ".//receipts/2026/" },
      "receipts/2026/",
      "receipts/2026/",
    ],
    [
      { receipt_base_folder: "./receipts", document_file: "books/docs.bean" },
      "receipts/",
      "../receipts/",
    ],
    [{ receipt_base_folder: "./" }, "", ""],
  ])(
    "stores the receipt in the folder Beancount reads (%j)",
    async (routing, folder, documentPrefix) => {
      const f = await fixture();
      f.state.bcio = { receipt_storage: "git", ...routing };
      try {
        expect((await f.rest()).status).toBe(200);
        expect((await f.gql()).errors).toBeUndefined();
        expect((await f.mcp()).isError).not.toBe(true);
        const writes = f.write.mock.calls.filter(
          (call) => (call as unknown[])[6] !== true,
        );
        expect(f.createFile).toHaveBeenCalledTimes(3);
        expect(writes).toHaveLength(3);
        for (let call = 0; call < 3; call += 1) {
          const [, , stored] = f.createFile.mock.calls[call] as unknown as [
            string,
            string,
            { path: string; message: string },
          ];
          expect(stored.path).toMatch(
            new RegExp(`^${folder}2026-09-01-caf-fixture-[^./]+\\.pdf$`),
          );
          expect(stored.message).toBe(`docs: add receipt ${stored.path}`);
          const [document] = (writes[call] as unknown[])[3] as {
            type: string;
            entry: { filename: string };
          }[];
          expect(document.type).toBe("document");
          expect(document.entry.filename).toBe(
            documentPrefix + stored.path.slice(folder.length),
          );
        }
      } finally {
        await f.close();
      }
    },
  );

  it.each([
    ["../x", '"../x", which is outside the ledger'],
    ["./receipts/../../x", '("./receipts/../../x") stores receipts in "../x"'],
    ["/receipts", '"/receipts", which is outside the ledger'],
    ["receipts/.git", "is inside .git"],
    ["receipts:2026", "which Windows cannot store"],
  ])(
    "refuses %j on REST, GraphQL and MCP, naming the option, before any effect",
    async (folder, quoted) => {
      const f = await fixture();
      f.state.bcio = { receipt_storage: "git", receipt_base_folder: folder };
      try {
        const r = await f.rest();
        expect(r.status).toBe(400);
        const rest = (await r.json()) as {
          error: {
            code: string;
            message: string;
            metadata?: { field?: string; hint?: string };
          };
        };
        const g = await f.gql();
        expect(g.errors).toHaveLength(1);
        const gql = formatError(g.errors![0].toJSON(), g.errors![0]) as {
          message: string;
          extensions: { code: string; field?: string; hint?: string };
        };
        const m = await f.mcp();
        expect(m.isError).toBe(true);
        const mcp = (
          m.structuredContent as {
            error: {
              code: string;
              message: string;
              field?: string;
              hint?: string;
            };
          }
        ).error;
        for (const refused of [
          {
            code: rest.error.code,
            message: rest.error.message,
            field: rest.error.metadata?.field,
            hint: rest.error.metadata?.hint,
          },
          {
            code: gql.extensions.code,
            message: gql.message,
            field: gql.extensions.field,
            hint: gql.extensions.hint,
          },
          mcp,
        ]) {
          expect(refused.code).toBe("BAD_USER_INPUT");
          expect(refused.message).toContain(
            "The ledger's `receipt_base_folder` option",
          );
          expect(refused.message).toContain(quoted);
          expect(refused.field).toBeUndefined();
          expect(refused.hint).toContain(
            'custom "beancountio-option" "receipt_base_folder"',
          );
          expect(refused.hint).not.toContain("named argument");
        }
        expect(f.write).not.toHaveBeenCalled();
        expect(f.download).not.toHaveBeenCalled();
        expect(f.createFile).not.toHaveBeenCalled();
        expect(f.copy).not.toHaveBeenCalled();
        expect(f.deleteTemp).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
});

// w23/083: the result named neither the file nor the hash, so an agent had
// to list-and-guess its own entry. The bulk write already resolves both;
// the surfaces below must carry them.
describe("written file and entry hashes", () => {
  // Dry runs resolve nothing; commits resolve the bulk result's files and
  // hashes — so the assertions below pin the commit's values, not the
  // check's.
  const resolvingWrite = (files: string[], entryHashes: string[]) =>
    jest.fn(async (...call: unknown[]) =>
      call[6] === true
        ? { success: true }
        : { success: true, files, entryHashes },
    );

  it("reports the S3 commit's file and hash on every surface", async () => {
    const f = await fixture();
    f.write.mockImplementation(
      resolvingWrite(["2026.bean"], ["tx-hash"]) as never,
    );
    try {
      const r = await f.rest();
      expect(await r.json()).toEqual({
        success: true,
        entryHashes: ["tx-hash"],
      });
      const g = await f.gql(undefined, "success entryHashes");
      expect(g.errors).toBeUndefined();
      expect(g.data!.insertReceiptTransaction).toEqual({
        success: true,
        entryHashes: ["tx-hash"],
      });
      const m = await f.mcp();
      expect(m.isError).not.toBe(true);
      expect((m.structuredContent as { result: unknown }).result).toEqual({
        summary:
          "Inserted receipt transaction for Café Fixture on 2026-09-01. No new bean-check errors.",
        success: true,
        wrote: [{ path: "2026.bean" }],
        entryHashes: ["tx-hash"],
        validation: {
          errorsBefore: 0,
          errorsAfter: 0,
          newErrors: [],
          valid: true,
        },
      });
    } finally {
      await f.close();
    }
  });

  // w23/m42: the sha the entries' commit made, to undo the insert.
  it("reports the commit the entries landed in on every surface", async () => {
    const f = await fixture();
    f.write.mockImplementation(
      jest.fn(async () => ({
        success: true,
        files: ["2026.bean"],
        entryHashes: ["tx-hash"],
        commit: "abc123def",
      })) as never,
    );
    try {
      expect(await (await f.rest()).json()).toMatchObject({
        commit: "abc123def",
      });
      const g = await f.gql(undefined, "success commit");
      expect(g.errors).toBeUndefined();
      expect(g.data!.insertReceiptTransaction).toEqual({
        success: true,
        commit: "abc123def",
      });
      const m = await f.mcp();
      expect(m.isError).not.toBe(true);
      expect((m.structuredContent as { result: unknown }).result).toMatchObject(
        { commit: "abc123def" },
      );
    } finally {
      await f.close();
    }
  });

  it("reports the git commit's document and transaction hashes in request order", async () => {
    const f = await fixture();
    f.state.bcio = { receipt_storage: "git" };
    f.write.mockImplementation(
      resolvingWrite(["main.bean"], ["doc-hash", "tx-hash"]) as never,
    );
    try {
      const r = await f.rest();
      expect(await r.json()).toEqual({
        success: true,
        entryHashes: ["doc-hash", "tx-hash"],
      });
      const m = await f.mcp();
      expect((m.structuredContent as { result: unknown }).result).toEqual(
        expect.objectContaining({
          wrote: [{ path: "main.bean" }],
          entryHashes: ["doc-hash", "tx-hash"],
        }),
      );
    } finally {
      await f.close();
    }
  });

  it("answers empty files and hashes when the commit resolves neither", async () => {
    const f = await fixture();
    try {
      const r = await f.rest();
      expect(await r.json()).toEqual({ success: true, entryHashes: [] });
      const g = await f.gql(undefined, "success entryHashes");
      expect(g.data!.insertReceiptTransaction).toEqual({
        success: true,
        entryHashes: [],
      });
      const m = await f.mcp();
      expect((m.structuredContent as { result: unknown }).result).toEqual(
        expect.objectContaining({ wrote: [], entryHashes: [] }),
      );
    } finally {
      await f.close();
    }
  });
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

// w5/054: an empty key is a malformed request, not an ownership question.
it("refuses a blank receipt key as bad input on every surface, before any effect", async () => {
  const f = await fixture();
  const blank = { receiptObjectKey: "", input };
  try {
    const r = await f.rest(blank);
    expect(r.status).toBe(400);
    expect(await r.json()).toMatchObject({ error: { code: "BAD_USER_INPUT" } });
    const g = await f.gql(blank);
    expect(g.errors?.[0].originalError).toMatchObject({
      category: "BAD_USER_INPUT",
    });
    const m = await f.mcp(blank);
    expect(m.isError).toBe(true);
    expect(m.structuredContent).toMatchObject({
      error: { code: "BAD_USER_INPUT" },
    });
    expect(f.copy).not.toHaveBeenCalled();
    expect(f.write).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

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

// w23/058: a refused entry used to be found only after the receipt had been
// promoted or committed, leaving it behind on every retry.
it("refuses an entry before promoting the receipt, keeping the temporary asset", async () => {
  const f = await fixture();
  f.write.mockRejectedValue(new Error("fixture ledger write failed"));
  try {
    expect((await f.rest()).status).toBe(500);
    expect((await f.gql()).errors).toHaveLength(1);
    expect((await f.mcp()).isError).toBe(true);
    expect(f.copy).not.toHaveBeenCalled();
    expect(f.deleteTemp).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

it("stores nothing in git when the entry is refused", async () => {
  const f = await fixture();
  f.state.bcio = { receipt_storage: "git" };
  f.write.mockRejectedValue(new Error("fixture ledger write failed"));
  try {
    expect((await f.rest()).status).toBe(500);
    expect(f.createFile).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

it("takes a stored receipt back out when the final write is refused", async () => {
  const f = await fixture();
  f.state.bcio = { receipt_storage: "git" };
  f.write.mockImplementation(async (...args: unknown[]) => {
    if (args[6] === true) return { success: true };
    throw new Error("fixture ledger write failed");
  });
  try {
    expect((await f.rest()).status).toBe(500);
    const [, , stored] = f.createFile.mock.calls[0] as unknown as [
      string,
      string,
      { path: string },
    ];
    expect(f.deleteFile).toHaveBeenCalledWith("alice", "main", {
      path: stored.path,
      sha: "sha-receipt",
      message: `docs: remove receipt ${stored.path}; its entry was refused`,
    });
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

// w23/m11/t003: every key spelling works at every insert input.
it.each(["objectKey", "s3ObjectKey"])(
  "accepts the %s insert twin on every surface",
  async (twin) => {
    const f = await fixture();
    const args = { [twin]: receiptObjectKey, input };
    try {
      const r = await f.rest(args);
      expect(r.status).toBe(200);
      expect(await r.json()).toEqual({ success: true, entryHashes: [] });
      const g = await f.gql(
        { key: receiptObjectKey, input },
        "success",
        `${twin}:$key`,
        "$key:String!",
      );
      expect(g.errors).toBeUndefined();
      expect(g.data!.insertReceiptTransaction).toEqual({ success: true });
      const m = await f.mcp(args);
      expect(m.isError).not.toBe(true);
      expect(f.copy).toHaveBeenCalledTimes(3);
      expect(f.copy).toHaveBeenCalledWith({
        objectKey: receiptObjectKey,
        scope: "repo_42",
      });
      expect(f.write).toHaveBeenCalledTimes(6);
      expect(f.deleteTemp).toHaveBeenCalledTimes(3);
    } finally {
      await f.close();
    }
  },
);

it("refuses two different insert keys as bad input on every surface", async () => {
  const f = await fixture();
  const other = "tmp/usr_alice/other.pdf";
  try {
    const r = await f.rest({
      receiptObjectKey,
      objectKey: other,
      input,
    });
    expect(r.status).toBe(400);
    expect(await r.json()).toMatchObject({
      error: { code: "BAD_USER_INPUT" },
    });
    const g = await f.gql(
      { receiptObjectKey, other, input },
      "success",
      "receiptObjectKey:$receiptObjectKey,s3ObjectKey:$other",
      "$receiptObjectKey:String!,$other:String!",
    );
    expect(g.errors?.[0].originalError).toMatchObject({
      category: "BAD_USER_INPUT",
    });
    const m = await f.mcp({
      receiptObjectKey,
      objectKey: other,
      input,
    });
    expect(m.isError).toBe(true);
    expect(m.structuredContent).toMatchObject({
      error: { code: "BAD_USER_INPUT" },
    });
    expect(f.copy).not.toHaveBeenCalled();
    expect(f.write).not.toHaveBeenCalled();
    expect(f.deleteTemp).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

it("refuses a missing insert key as bad input on every surface", async () => {
  const f = await fixture();
  try {
    const r = await f.rest({ input });
    expect(r.status).toBe(400);
    expect(await r.json()).toMatchObject({
      error: { code: "BAD_USER_INPUT" },
    });
    const g = await f.gql(
      { input },
      "success",
      "receiptObjectKey:$missing",
      "$missing:String",
    );
    expect(g.errors?.[0].originalError).toMatchObject({
      category: "BAD_USER_INPUT",
    });
    const m = await f.mcp({ input });
    expect(m.isError).toBe(true);
    expect(m.structuredContent).toMatchObject({
      error: { code: "BAD_USER_INPUT" },
    });
    expect(f.copy).not.toHaveBeenCalled();
    expect(f.write).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

describe("requestId on receipt insertion", () => {
  beforeEach(() => fakeRedisIdempotencyState.reset());

  it.each(["rest", "gql", "mcp"] as const)(
    "promotes and posts once when a retry repeats the id via %s",
    async (surface) => {
      // The temporary receipt belongs to this caller, so it is the one writing.
      const f = await fixture();
      const send = () =>
        surface === "rest"
          ? f
              .rest({ receiptObjectKey, input, requestId: "rcpt-1" })
              .then(async (response) => ({
                ok: response.status === 200,
                body: await response.json(),
              }))
          : surface === "gql"
            ? f
                .gql(
                  { receiptObjectKey, input, requestId: "rcpt-1" },
                  "success",
                  "receiptObjectKey:$receiptObjectKey,requestId:$requestId",
                  "$receiptObjectKey:String!,$requestId:String",
                )
                .then((result) => ({
                  ok: !result.errors,
                  body: result.data?.insertReceiptTransaction,
                }))
            : f
                .mcp({ receiptObjectKey, input, requestId: "rcpt-1" })
                .then((result) => ({
                  ok: !result.isError,
                  body: (result.structuredContent as { result?: unknown })
                    ?.result,
                }));
      try {
        const first = await send();
        const retry = await send();

        expect(first.ok).toBe(true);
        expect(retry.ok).toBe(true);
        expect(f.copy).toHaveBeenCalledTimes(1);
        expect(
          (f.write.mock.calls as unknown[][]).filter(
            (call) => call[6] !== true,
          ),
        ).toHaveLength(1);
      } finally {
        await f.close();
      }
    },
  );

  it.each(["rest", "gql", "mcp"] as const)(
    "refuses a whitespace-only requestId via %s without touching Redis or promoting the receipt (w31/044)",
    async (surface) => {
      const f = await fixture();
      try {
        for (const requestId of ["   ", "\t\n"]) {
          if (surface === "rest") {
            const response = await f.rest({
              receiptObjectKey,
              input,
              requestId,
            });
            expect(response.status).toBe(400);
            expect(await response.json()).toMatchObject({
              error: {
                code: "VALIDATION_FAILED",
                metadata: { field: "requestId" },
              },
            });
          } else if (surface === "gql") {
            const result = await f.gql(
              { receiptObjectKey, input, requestId },
              "success",
              "receiptObjectKey:$receiptObjectKey,requestId:$requestId",
              "$receiptObjectKey:String!,$requestId:String",
            );
            const gqlError = result.errors![0];
            expect(
              formatError(gqlError.toJSON(), gqlError).extensions,
            ).toMatchObject({
              code: "VALIDATION_FAILED",
              field: "requestId",
            });
          } else {
            const result = await f.mcp({ receiptObjectKey, input, requestId });
            expect(result.isError).toBe(true);
            expect(result.structuredContent).toMatchObject({
              ok: false,
              error: {
                code: "VALIDATION_FAILED",
                message: expect.stringContaining("requestId"),
              },
            });
          }
        }
        expect(fakeRedisIdempotencyState.records.size).toBe(0);
        expect(f.copy).not.toHaveBeenCalled();
        expect(f.write).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
});

/**
 * w1/190. After a receipt is inserted the S3 store promotes and deletes the
 * temp object, so a second insert with the same key and no requestId copied
 * from nothing: S3's NoSuchKey reached the caller as a 500 with "Retry once".
 */
it("answers a consumed receipt key as NOT_FOUND on REST, GraphQL and MCP without writing", async () => {
  const send = jest.spyOn(S3Client.prototype, "send").mockRejectedValue(
    Object.assign(new Error("NoSuchKey"), {
      name: "NoSuchKey",
      $metadata: { httpStatusCode: 404 },
    }) as never,
  );
  const storage = new AssetStorageService(
    {
      region: "us-east-1",
      bucket: "fixture",
      accessKeyId: "fixture",
      secretAccessKey: "fixture",
      endpoint: "",
      uploadUrlExpiration: 300,
      downloadUrlExpiration: 600,
    },
    {} as never,
  );
  const f = await fixture(identity, (params) =>
    storage.copyTempToPermanent(params),
  );
  try {
    const r = await f.rest();
    expect(r.status).toBe(404);
    expect(await r.json()).toMatchObject({
      error: { code: "NOT_FOUND", message: "Temporary asset not found" },
    });
    const g = await f.gql();
    const gqlError = g.errors![0];
    expect(formatError(gqlError.toJSON(), gqlError)).toMatchObject({
      message: "Temporary asset not found",
      extensions: { code: "NOT_FOUND" },
    });
    const m = await f.mcp();
    expect(m.isError).toBe(true);
    expect(m.structuredContent).toMatchObject({
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "Temporary asset not found",
        hint: TEMP_ASSET_NOT_FOUND_HINT,
      },
    });
    // Each surface ran the entry pre-check only; nothing was committed.
    expect(f.write).toHaveBeenCalledTimes(3);
    for (const call of f.write.mock.calls as unknown[][])
      expect(call[6]).toBe(true);
    expect(f.deleteTemp).not.toHaveBeenCalled();
  } finally {
    await f.close();
    send.mockRestore();
  }
});

/**
 * w1/202. The receipt insert takes no allowInvalid, but its UNBALANCED refusal
 * said "add a posting or pass allowInvalid: true", and following it was
 * refused as an unknown key.
 */
it("refuses an unbalanced receipt without offering allowInvalid on every surface", async () => {
  const f = await fixture();
  f.write.mockRejectedValue(
    new UnbalancedTransactionError(
      "entry 0: Transaction does not balance: residual 4.50 USD",
      "4.50 USD",
      0,
    ) as never,
  );
  try {
    const r = await f.rest();
    expect(r.status).toBe(400);
    const restBody = await r.json();
    expect(restBody).toMatchObject({ error: { code: "UNBALANCED" } });
    expect(JSON.stringify(restBody)).not.toContain("allowInvalid");
    const g = await f.gql();
    const gqlError = formatError(g.errors![0].toJSON(), g.errors![0]);
    expect(gqlError.extensions?.code).toBe("UNBALANCED");
    expect(JSON.stringify(gqlError)).not.toContain("allowInvalid");
    const m = await f.mcp();
    expect(m.isError).toBe(true);
    expect(m.structuredContent).toMatchObject({
      ok: false,
      error: {
        code: "UNBALANCED",
        hint: "residual 4.50 USD; add the missing posting or elide one amount",
      },
    });
    expect(f.copy).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

/**
 * w31/053. Blank or malformed documentAccount and empty postings: [] used to
 * pass validation across MCP, REST, and GraphQL, reaching ledger options reads,
 * S3 promotion, or Git receipt commits before failing or silently succeeding.
 */
describe("upfront documentAccount and postings validation (w31/053)", () => {
  beforeEach(() => fakeRedisIdempotencyState.reset());

  it.each([
    "",
    "   ",
    "not-an-account",
    "expenses:food",
    "Expenses:Food:Bad Account",
    "Expenses:Food\n",
    "Assets:Bank:épargne",
    "Assets:Bank:€",
    "Assets:Bank:😀",
    "Assets:Bank:Foo\u200bBar",
  ])(
    "refuses invalid documentAccount %j as BAD_USER_INPUT on REST, GraphQL, and MCP before any effect",
    async (documentAccount) => {
      const f = await fixture();
      f.state.bcio = { receipt_storage: "git" };
      const badInput = { ...input, documentAccount };
      const payload = {
        receiptObjectKey,
        input: badInput,
        requestId: "rcpt-invalid-doc-account",
      };
      try {
        const r = await f.rest(payload);
        expect(r.status).toBe(400);
        expect(await r.json()).toMatchObject({
          ok: false,
          error: {
            code: "BAD_USER_INPUT",
            message: expect.stringContaining("documentAccount"),
            metadata: {
              field: "documentAccount",
              hint: expect.any(String),
            },
          },
        });

        const g = await f.gql(
          payload,
          "success",
          "receiptObjectKey:$receiptObjectKey,requestId:$requestId",
          "$receiptObjectKey:String!,$requestId:String",
        );
        expect(g.errors).toHaveLength(1);
        const gqlError = formatError(g.errors![0].toJSON(), g.errors![0]);
        expect(gqlError).toMatchObject({
          message: expect.stringContaining("documentAccount"),
          extensions: {
            code: "BAD_USER_INPUT",
            field: "documentAccount",
            hint: expect.any(String),
          },
        });

        const m = await f.mcp(payload);
        expect(m.isError).toBe(true);
        expect(m.structuredContent).toMatchObject({
          ok: false,
          error: {
            code: "BAD_USER_INPUT",
            message: expect.stringContaining("documentAccount"),
            hint: expect.any(String),
          },
        });

        expect(f.getBcioOptions).not.toHaveBeenCalled();
        expect(f.getErrors).not.toHaveBeenCalled();
        expect(f.write).not.toHaveBeenCalled();
        expect(f.copy).not.toHaveBeenCalled();
        expect(f.download).not.toHaveBeenCalled();
        expect(f.deleteTemp).not.toHaveBeenCalled();
        expect(f.createFile).not.toHaveBeenCalled();
        expect(f.deleteFile).not.toHaveBeenCalled();
        expect(fakeRedisIdempotencyState.records.size).toBe(0);
      } finally {
        await f.close();
      }
    },
  );

  it("refuses empty postings: [] as BAD_USER_INPUT on REST, GraphQL, and MCP before any effect", async () => {
    const f = await fixture();
    const emptyPostingsInput = { ...input, postings: [] };
    const payload = {
      receiptObjectKey,
      input: emptyPostingsInput,
      requestId: "rcpt-empty-postings",
    };
    try {
      const r = await f.rest(payload);
      expect(r.status).toBe(400);
      expect(await r.json()).toMatchObject({
        ok: false,
        error: {
          code: "BAD_USER_INPUT",
          message: expect.stringContaining("postings"),
          metadata: {
            field: "postings",
            hint: expect.any(String),
          },
        },
      });

      const g = await f.gql(
        payload,
        "success",
        "receiptObjectKey:$receiptObjectKey,requestId:$requestId",
        "$receiptObjectKey:String!,$requestId:String",
      );
      expect(g.errors).toHaveLength(1);
      const gqlError = formatError(g.errors![0].toJSON(), g.errors![0]);
      expect(gqlError).toMatchObject({
        message: expect.stringContaining("postings"),
        extensions: {
          code: "BAD_USER_INPUT",
          field: "postings",
          hint: expect.any(String),
        },
      });

      const m = await f.mcp(payload);
      expect(m.isError).toBe(true);
      expect(m.structuredContent).toMatchObject({
        ok: false,
        error: {
          code: "BAD_USER_INPUT",
          message: expect.stringContaining("postings"),
          hint: expect.any(String),
        },
      });

      expect(f.getBcioOptions).not.toHaveBeenCalled();
      expect(f.getErrors).not.toHaveBeenCalled();
      expect(f.write).not.toHaveBeenCalled();
      expect(f.copy).not.toHaveBeenCalled();
      expect(f.download).not.toHaveBeenCalled();
      expect(f.deleteTemp).not.toHaveBeenCalled();
      expect(f.createFile).not.toHaveBeenCalled();
      expect(f.deleteFile).not.toHaveBeenCalled();
      expect(fakeRedisIdempotencyState.records.size).toBe(0);
    } finally {
      await f.close();
    }
  });

  it.each(["s3", "git"] as const)(
    "accepts a valid non-Latin documentAccount on REST, GraphQL, and MCP under %s storage",
    async (storage) => {
      const f = await fixture();
      f.state.bcio = { receipt_storage: storage };
      const nonLatinInput = { ...input, documentAccount: "Expenses:日本" };
      const payload = { receiptObjectKey, input: nonLatinInput };
      try {
        const r = await f.rest(payload);
        expect(r.status).toBe(200);
        const g = await f.gql(payload);
        expect(g.errors).toBeUndefined();
        expect(g.data!.insertReceiptTransaction).toEqual({ success: true });
        const m = await f.mcp(payload);
        expect(m.isError).not.toBe(true);

        if (storage === "git") {
          const writes = f.write.mock.calls.filter(
            (call) => (call as unknown[])[6] !== true,
          );
          expect(writes).toHaveLength(3);
          for (const call of writes) {
            const [document] = (call as unknown[])[3] as {
              type: string;
              entry: { account: string };
            }[];
            expect(document.type).toBe("document");
            expect(document.entry.account).toBe("Expenses:日本");
          }
        } else {
          expect(f.copy).toHaveBeenCalledTimes(3);
        }
      } finally {
        await f.close();
      }
    },
  );

  it("still refuses a read-only token with FORBIDDEN for valid inputs on all surfaces", async () => {
    const f = await fixture({ ...identity, scopes: new Set(["ledger.read"]) });
    try {
      const r = await f.rest();
      expect(r.status).toBe(403);
      expect(await r.json()).toMatchObject({ error: { code: "FORBIDDEN" } });

      const g = await f.gql();
      expect(g.errors).toHaveLength(1);
      expect(
        formatError(g.errors![0].toJSON(), g.errors![0]).extensions,
      ).toMatchObject({ code: "FORBIDDEN" });

      const m = await f.mcp();
      expect(m.isError).toBe(true);
      expect(m.structuredContent).toMatchObject({
        ok: false,
        error: { code: "FORBIDDEN" },
      });

      expect(f.getBcioOptions).not.toHaveBeenCalled();
      expect(f.write).not.toHaveBeenCalled();
      expect(f.copy).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});

/**
 * w23/058 + w31/092. Wiring the real `FavaLedgerEntryWriter` verifies the
 * outgoing `addBulkEntries` payload carries `dryRun: true, allowInvalid: false`
 * (not `allowInvalid: true` from w23/219), so refused receipt entries fail up
 * front with UNBALANCED / VALIDATION_FAILED before touching S3 or Git.
 */
describe("pre-write guard through FavaLedgerEntryWriter (w23/058, w31/092)", () => {
  async function wiredFixture(opts: {
    storage: "s3" | "git";
    failure: "unbalanced" | "wouldBreak";
    promoteError?: Error;
  }) {
    const envelope = (data: unknown) => ({ data: { success: true, data } });
    const addBulkEntries = jest.fn(
      async (
        _owner: string,
        _name: string,
        body: { allowInvalid?: boolean; dryRun?: boolean; entries: unknown[] },
      ) => {
        if (opts.failure === "unbalanced" && body.allowInvalid !== true) {
          throw new FavaApiError(
            "entry 0: Transaction does not balance: residual 5.00 USD",
            400,
            {
              error: "entry 0: Transaction does not balance: residual 5.00 USD",
              code: "UNBALANCED",
              details: { residual: "5.00 USD", entry: 0 },
            },
          );
        }
        if (opts.failure === "wouldBreak" && body.allowInvalid !== true) {
          const detail =
            "Account Expenses:NotOpened was never opened (main.bean:2)";
          throw new FavaApiError(
            `adding these entries would introduce 1 new bean-check error: ${detail}`,
            400,
            {
              error: `adding these entries would introduce 1 new bean-check error: ${detail}`,
              code: "NEW_LEDGER_ERRORS",
              details: { count: 1, detail },
            },
          );
        }
        return envelope({
          entry_hashes: [],
          included_files: [],
          preview: [],
          errors_before: 0,
          errors_after: 1,
          new_errors: [{ message: "simulated non-refusing preview error" }],
        });
      },
    );
    const copy = jest.fn(async () => {
      if (opts.promoteError) throw opts.promoteError;
      return { filename: "promoted-receipt.pdf" };
    });
    const deleteTemp = jest.fn(async () => undefined);
    const download = jest.fn(async () => ({
      downloadUrl: `data:application/pdf;base64,${receiptBytes.toString("base64")}`,
    }));
    const createFile = jest.fn(async () => envelope({ sha: "sha-receipt" }));
    const deleteFile = jest.fn(async () => envelope({}));
    const fava = {
      getAdminClient: () => ({
        ledgers: {
          getLedger: async () => envelope({ id: 42, private: true }),
        },
      }),
      getApiContext: async () => ({
        favaApiClient: {
          collaborators: {
            getLedgerCollaboratorPermission: async () =>
              envelope({ permission: "write" }),
          },
        },
      }),
      getPublicApiClient: async () => ({
        entries: { addBulkEntries },
        reports: {
          getLedgerBcioOptions: async () =>
            envelope({
              default_file: "main.bean",
              ...(opts.storage === "git" ? { receipt_storage: "git" } : {}),
            }),
        },
        ledgers: {
          getLedgerFile: async () => envelope({ path: "main.bean" }),
          createLedgerFile: createFile,
          deleteLedgerFile: deleteFile,
        },
      }),
    };
    const models = {
      user: {
        getUserByUsername: async () => ({ id: "usr_owner" }),
        getById: async () => ({
          id: identity.userId,
          ledger_username: "alice",
        }),
      },
    };
    const workflow = new LedgerReceiptWorkflow(
      fava as never,
      {
        generateDownloadUrl: download,
        copyTempToPermanent: copy,
        deleteTempAsset: deleteTemp,
      } as never,
      createLedgerEntryWriter(fava as never),
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
    rest.setIdentity(identity);
    const server = assembleMcpRegistry(
      {
        identity,
        ledgerReceiptWorkflow: workflow,
        services: { ledgerData: { getErrors: jest.fn(async () => []) } },
      } as unknown as McpRequestContext,
      config,
    );
    const client = new Client({
      name: "receipt-precheck-wired",
      version: "1",
    });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([client.connect(a), server.connect(b)]);
    return {
      addBulkEntries,
      copy,
      deleteTemp,
      download,
      createFile,
      deleteFile,
      rest: () =>
        fetch(
          `${rest.url}/api-gateway/v1/ledgers/alice/main/import/insert-receipt`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ receiptObjectKey, input }),
          },
        ),
      gql: () =>
        graphql({
          schema,
          source:
            "mutation($ledgerId:String!,$receiptObjectKey:String!,$input:InsertReceiptTransactionInput!) { insertReceiptTransaction(ledgerId:$ledgerId,receiptObjectKey:$receiptObjectKey,input:$input) { success } }",
          variableValues: { ledgerId: "alice/main", receiptObjectKey, input },
          contextValue: { identity, getCurrentIdentity: () => identity },
        }),
      mcp: () =>
        client.callTool({
          name: "insertReceiptTransaction",
          arguments: { receiptObjectKey, input },
        }),
      close: async () => {
        await client.close();
        await server.close();
        await rest.close();
      },
    };
  }

  it.each<["s3" | "git", "unbalanced" | "wouldBreak", string]>([
    ["s3", "unbalanced", "UNBALANCED"],
    ["s3", "wouldBreak", "VALIDATION_FAILED"],
    ["git", "unbalanced", "UNBALANCED"],
    ["git", "wouldBreak", "VALIDATION_FAILED"],
  ])(
    "refuses %s receipt %s up front with %s on REST, GraphQL, and MCP before touching storage",
    async (storage, failure, expectedCode) => {
      // Under S3, even a missing temp asset (NotFoundError from copyTempToPermanent)
      // must be refused with UNBALANCED / VALIDATION_FAILED before touching S3.
      const f = await wiredFixture({
        storage,
        failure,
        promoteError: new NotFoundError(
          "Temporary asset",
          undefined,
          TEMP_ASSET_NOT_FOUND_HINT,
        ),
      });
      try {
        const r = await f.rest();
        expect(r.status).toBe(400);
        expect(await r.json()).toMatchObject({
          ok: false,
          error: { code: expectedCode },
        });

        const g = await f.gql();
        expect(g.errors).toHaveLength(1);
        expect(
          formatError(g.errors![0].toJSON(), g.errors![0]).extensions,
        ).toMatchObject({ code: expectedCode });

        const m = await f.mcp();
        expect(m.isError).toBe(true);
        expect(m.structuredContent).toMatchObject({
          ok: false,
          error: { code: expectedCode },
        });

        expect(f.addBulkEntries).toHaveBeenCalledTimes(3);
        for (const call of f.addBulkEntries.mock.calls) {
          expect(call[2]).toMatchObject({
            dryRun: true,
            allowInvalid: false,
          });
        }
        expect(f.copy).not.toHaveBeenCalled();
        expect(f.deleteTemp).not.toHaveBeenCalled();
        expect(f.download).not.toHaveBeenCalled();
        expect(f.createFile).not.toHaveBeenCalled();
        expect(f.deleteFile).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
});

import { gql } from "@apollo/client";
import {
  GetLedgerDirContentDocument,
  GetLedgerFileDocument,
  GetLedgerErrorsDocument,
  GetLedgerEntryContextDocument,
  AccountReportDocument,
  AccountJournalDocument,
  UpdateLedgerFileDocument,
  DeleteLedgerFileDocument,
  CreateLedgerFileDocument,
  DeleteLedgerEntrySourceSliceDocument,
} from "../../../generated-graphql/graphql";
import { createGuestClient } from "../guest-client";

const query = gql`
  query GetLedger($ledgerId: String!) {
    getLedger(ledgerId: $ledgerId) {
      id
      private
    }
  }
`;
const variables = { ledgerId: "open_ledger/example" };
const originalFetch = globalThis.fetch;
let requests: { url: string; options: RequestInit }[];
let response: unknown;
let client: ReturnType<typeof createGuestClient>;
let failures: string[];

beforeEach(() => {
  requests = [];
  failures = [];
  response = {
    data: { getLedger: { id: variables.ledgerId, private: false } },
  };
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options: options ?? {} });
    return new Response(JSON.stringify(response), {
      headers: { "content-type": "application/json" },
    });
  };
  client = createGuestClient(
    "https://books.example/prefix/",
    "open_ledger/example",
    (failure) => failures.push(failure),
  );
});
afterEach(() => {
  client.stop();
  globalThis.fetch = originalFetch;
});

async function rejects(operation: () => Promise<unknown>) {
  let failed = false;
  try {
    await operation();
  } catch {
    failed = true;
  }
  expect(failed).toBe(true);
}

describe("guest read isolation", () => {
  for (const [name, document, extra, data] of [
    [
      "directory",
      GetLedgerDirContentDocument,
      { dirPath: "" },
      { getLedgerDirContent: [] },
    ],
    [
      "file",
      GetLedgerFileDocument,
      { path: "main.bean" },
      {
        getLedgerFile: {
          content: "",
          encoding: "utf-8",
          name: "main.bean",
          path: "main.bean",
          sha: "sha",
          size: 0,
          type: "file",
        },
      },
    ],
    ["errors", GetLedgerErrorsDocument, {}, { getLedgerErrors: [] }],
    [
      "entry",
      GetLedgerEntryContextDocument,
      { entryHash: "entry" },
      {
        getLedgerEntryContext: {
          slice: "",
          sha256sum: "sha",
          entry: {},
          balances_before: {},
          balances_after: {},
        },
      },
    ],
    [
      "account report",
      AccountReportDocument,
      { accountName: "Assets:Cash", conversion: "units" },
      { getLedgerAccountReport: { linechartData: [] } },
    ],
    [
      "account journal",
      AccountJournalDocument,
      { query: { account: "Assets:Cash" } },
      {
        getLedgerAccountJournal: {
          account: "Assets:Cash",
          total: 0,
          with_children: true,
          items: [],
        },
      },
    ],
  ] as const) {
    it(`loads the shared ${name} screen's actual operation anonymously`, async () => {
      response = { data };
      const result = await client.query({
        query: document,
        variables: { ...variables, ...extra },
      });
      expect(result.data).toEqual(data);
      expect(requests.length).toBe(1);
      expect(requests[0].options.credentials).toBe("omit");
      expect(failures).toEqual([]);
    });
  }

  it("blocks the shared file and transaction screens' actual mutations", async () => {
    for (const mutation of [
      UpdateLedgerFileDocument,
      DeleteLedgerFileDocument,
      CreateLedgerFileDocument,
      DeleteLedgerEntrySourceSliceDocument,
    ]) {
      await rejects(() => client.mutate({ mutation, variables }));
    }
    expect(requests.length).toBe(0);
  });

  it("uses only the selected deployment with no credentials or shared cache", async () => {
    await client.query({ query, variables });
    expect(requests[0].url).toBe("https://books.example/prefix/api-gateway/");
    expect(requests[0].options.credentials).toBe("omit");
    expect(new Headers(requests[0].options.headers).has("authorization")).toBe(
      false,
    );
    const other = createGuestClient(
      "https://different.example/",
      "open_ledger/example",
    );
    expect(other.readQuery({ query, variables })).toBe(null);
    other.stop();
  });

  it("blocks account queries, writes, arbitrary ledgers and other example contexts before fetching", async () => {
    await rejects(() =>
      client.query({
        query: gql`
          query ListLedgers {
            listLedgers {
              id
            }
          }
        `,
      }),
    );
    await rejects(() =>
      client.mutate({
        mutation: gql`
          mutation GetLedger($ledgerId: String!) {
            deleteLedger(ledgerId: $ledgerId)
          }
        `,
        variables,
      }),
    );
    await rejects(() =>
      client.query({ query, variables: { ledgerId: "someone/private" } }),
    );
    await rejects(() =>
      client.query({ query, variables: { ledgerId: "open_ledger/nvidia" } }),
    );
    expect(requests.length).toBe(0);
  });

  for (const code of ["FORBIDDEN", "UNAUTHENTICATED", "NOT_FOUND"]) {
    it(`reports ${code} refreshes even when a previous public result was cached`, async () => {
      await client.query({ query, variables });
      response = {
        errors: [{ message: "Example unavailable", extensions: { code } }],
      };
      await rejects(() =>
        client.query({ query, variables, fetchPolicy: "network-only" }),
      );
      expect(failures).toEqual(["unavailable"]);
    });
  }

  it("distinguishes connection failures and never falls back to the managed server", async () => {
    globalThis.fetch = async (url) => {
      requests.push({ url: String(url), options: {} });
      throw new Error("offline");
    };
    await rejects(() => client.query({ query, variables }));
    expect(failures).toEqual(["connection"]);
    expect(requests.map(({ url }) => url)).toEqual([
      "https://books.example/prefix/api-gateway/",
    ]);
  });

  it("cannot populate a replacement client with a late old response", async () => {
    let release!: (response: Response) => void;
    globalThis.fetch = () =>
      new Promise((resolve) => {
        release = resolve;
      });
    const pending = client.query({ query, variables });
    const replacement = createGuestClient(
      "https://next.example/",
      "open_ledger/example",
    );
    release(
      new Response(JSON.stringify(response), {
        headers: { "content-type": "application/json" },
      }),
    );
    await pending;
    expect(replacement.readQuery({ query, variables })).toBe(null);
    replacement.stop();
  });
});

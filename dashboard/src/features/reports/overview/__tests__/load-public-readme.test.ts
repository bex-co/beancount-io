import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GetLedgerDocument,
  GetLedgerFileDocument,
} from "@/graphql/definitions";
import { base64Encode } from "@/common/lib/utils/encode";
import {
  loadPublicReadme,
  PUBLIC_README_DEADLINE_MS,
} from "../load-public-readme";

const ledgerId = "public/example";
const variables = { ledgerId, path: "README.md" };
const clients: ApolloClient[] = [];

function fixture(isPrivate = false, denied = false) {
  const requests: string[] = [];
  let replyFile: (content: string | null) => void = () => {
    throw new Error("README was not requested");
  };
  let failFile: () => void = () => {
    throw new Error("README was not requested");
  };
  const client = new ApolloClient({
    ssrMode: true,
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          requests.push(operation.operationName);
          if (operation.operationName === "GetLedger") {
            if (denied) {
              observer.error(new Error("Access denied"));
              return;
            }
            observer.next({
              data: {
                getLedger: {
                  __typename: "Ledger",
                  id: ledgerId,
                  name: "example",
                  fullName: ledgerId,
                  httpUrl: "",
                  sshUrl: "",
                  private: isPrivate,
                  empty: false,
                  size: 1,
                  createdAt: "2026-01-01",
                  updatedAt: "2026-01-01",
                  description: "",
                  isStarred: false,
                  permissions: null,
                  options: null,
                  favaOptions: null,
                  bcioOptions: null,
                },
              },
            });
            observer.complete();
            return;
          }
          // Intentionally ignore AbortSignal here: late upstream results must be
          // harmless even when cancellation is not honored by a transport/link.
          replyFile = (content) => {
            observer.next({
              data: {
                getLedgerFile:
                  content === null
                    ? null
                    : {
                        __typename: "LedgerFileContent",
                        name: "README.md",
                        path: "README.md",
                        sha: "public-fixture",
                        size: content.length,
                        type: "file",
                        encoding: "base64",
                        content,
                        lastCommitSha: null,
                        lastAuthorDate: null,
                        lastCommitterDate: null,
                      },
              },
            });
            observer.complete();
          };
          failFile = () => observer.error(new Error("upstream failed"));
        }),
    ),
  });
  clients.push(client);
  return {
    client,
    requests,
    replyFile: (content: string | null) => replyFile(content),
    failFile: () => failFile(),
  };
}

afterEach(() => {
  clients.splice(0).forEach((client) => client.stop());
  vi.useRealTimers();
});

describe("public overview README SSR", () => {
  it("shares the parent ledger read and caches the settled public README", async () => {
    vi.useFakeTimers();
    const f = fixture();
    const parent = f.client.query({
      query: GetLedgerDocument,
      variables: { ledgerId },
    });
    const read = loadPublicReadme(
      f.client,
      ledgerId,
      new AbortController().signal,
    );
    await vi.advanceTimersByTimeAsync(0);
    f.replyFile(base64Encode("# Public example\n\nA reproducible ledger."));
    await parent;
    expect(await read).toEqual({
      ...variables,
      status: "ready",
      content: "# Public example\n\nA reproducible ledger.",
    });
    await f.client.query({ query: GetLedgerFileDocument, variables });
    expect(f.requests).toEqual(["GetLedger", "GetLedgerFile"]);
  });

  it.each([null, "", base64Encode("  "), "!!!invalid-base64!!!"])(
    "settles absent/empty/malformed content without leaking an error (%s)",
    async (content) => {
      vi.useFakeTimers();
      const f = fixture();
      const read = loadPublicReadme(
        f.client,
        ledgerId,
        new AbortController().signal,
      );
      await vi.advanceTimersByTimeAsync(0);
      f.replyFile(content);
      expect(await read).toMatchObject({ status: "ready", content: null });
      expect(
        f.client.readQuery({ query: GetLedgerFileDocument, variables }),
      ).not.toBeNull();
    },
  );

  it.each([
    [true, false],
    [false, true],
  ])(
    "never fetches README for private or denied ledger (private=%s denied=%s)",
    async (isPrivate, denied) => {
      const f = fixture(isPrivate, denied);
      expect(
        await loadPublicReadme(
          f.client,
          ledgerId,
          new AbortController().signal,
        ),
      ).toBeUndefined();
      expect(f.requests).toEqual(["GetLedger"]);
    },
  );

  it("bounds the wait and cannot let an uncancelled late response mutate the snapshot", async () => {
    vi.useFakeTimers();
    const f = fixture();
    const read = loadPublicReadme(
      f.client,
      ledgerId,
      new AbortController().signal,
    );
    await vi.advanceTimersByTimeAsync(PUBLIC_README_DEADLINE_MS);
    expect(await read).toMatchObject({ status: "unavailable", content: null });
    const snapshot = f.client.cache.extract();
    f.replyFile(base64Encode("# Too late"));
    await vi.advanceTimersByTimeAsync(0);
    expect(f.client.cache.extract()).toEqual(snapshot);
    expect(
      f.client.readQuery({ query: GetLedgerFileDocument, variables }),
    ).toBeNull();
  });

  it("settles on navigation abort without waiting for the deadline", async () => {
    vi.useFakeTimers();
    const f = fixture();
    const controller = new AbortController();
    const read = loadPublicReadme(f.client, ledgerId, controller.signal);
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    expect(await read).toMatchObject({ status: "unavailable" });
    f.replyFile(base64Encode("# Old ledger"));
    await vi.advanceTimersByTimeAsync(0);
    expect(
      f.client.readQuery({ query: GetLedgerFileDocument, variables }),
    ).toBeNull();
  });

  it("leaves failure uncached for a client retry without serializing upstream errors", async () => {
    vi.useFakeTimers();
    const f = fixture();
    const read = loadPublicReadme(
      f.client,
      ledgerId,
      new AbortController().signal,
    );
    await vi.advanceTimersByTimeAsync(0);
    f.failFile();
    expect(await read).toEqual({
      ...variables,
      status: "unavailable",
      content: null,
    });
    expect(
      f.client.readQuery({ query: GetLedgerFileDocument, variables }),
    ).toBeNull();
  });
});

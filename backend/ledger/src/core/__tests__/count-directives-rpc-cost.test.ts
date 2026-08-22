import { countDirectivesForRepo } from "@/core/directive-limit";

// The engine is the subject of other tests and needs `--experimental-vm-modules`
// to load its wasm; this one is about how many Gitea round trips a count costs,
// so the parse is stubbed to a fixed number.
jest.mock("@/foundation/rustledger", () => ({
  ...jest.requireActual("@/foundation/rustledger"),
  withLedger: async (
    _files: Record<string, string>,
    _entry: string,
    fn: (l: { directiveCount: () => number }) => number,
  ) => fn({ directiveCount: () => 2 }),
}));

jest.mock("@/foundation/clients/build-cache", () => ({
  getCacheHelper: () => ({
    get: async () => undefined,
    set: async () => {},
    del: async () => {},
    getOrSet: async <T>(_k: string, _ttl: number, loader: () => Promise<T>) =>
      loader(),
  }),
}));

/**
 * `countDirectivesForRepo` asks for the HEAD sha and the file map together, and
 * `loadCachedFileMapForRepo` resolves HEAD itself — so it reads like two Gitea
 * round trips per count, on a call that now sits on the push path.
 *
 * It is one. `resolveHeadShaCoalesced` de-duplicates by (client, owner/repo)
 * while a resolution is in flight, and both call sites start inside the same
 * `Promise.all`, so the second finds the first's promise. This test exists
 * because that is invisible at the call site: someone tidying the `Promise.all`
 * away, or swapping the coalescer for a plain resolve, would silently double the
 * cost of every push-path count.
 */
it("resolves HEAD once per count, not once per caller", async () => {
  let commitCalls = 0;
  const client = {
    repos: {
      repoGetAllCommits: async () => {
        commitCalls += 1;
        return { data: [{ sha: "deadbeef" }] };
      },
      repoGetContents: async () => ({
        data: {
          type: "file",
          path: "main.bean",
          content: Buffer.from(
            "2024-01-01 open Assets:A USD\n2024-01-02 open Assets:B USD\n",
          ).toString("base64"),
          encoding: "base64",
        },
      }),
      repoGetContentsList: async () => ({ data: [] }),
      repoGetFileContentsPost: async () => ({
        data: [
          {
            path: "main.bean",
            content: Buffer.from(
              "2024-01-01 open Assets:A USD\n2024-01-02 open Assets:B USD\n",
            ).toString("base64"),
            encoding: "base64",
          },
        ],
      }),
      getTree: async () => ({
        data: { tree: [{ path: "main.bean", type: "blob" }], truncated: false },
      }),
    },
  };

  const out = await countDirectivesForRepo(client as never, "o", "r");

  expect(commitCalls).toBe(1);
  expect(out).toEqual({ count: 2, sha: "deadbeef" });
});

import { NotFoundError, ResourceLimitReachedError } from "@/shared/errors";
import {
  collectSourceFiles,
  fetchBeanFileMap,
  GITEA_FILE_FETCH_CONCURRENCY,
  globToRegExp,
  loadLedgerFileMap,
  requireEntryPoint,
  MAX_INCLUDE_GLOB_WORK,
  MAX_LEDGER_FILE_MAP_FILES,
  MAX_LEDGER_SOURCE_FILE_BYTES,
  type GiteaClientLike,
} from "../file-map-loader";

describe("globToRegExp safety bounds", () => {
  it("rejects oversized or wildcard-heavy include patterns", () => {
    expect(globToRegExp("a".repeat(1025))).toBeNull();
    expect(globToRegExp("*".repeat(65))).toBeNull();
  });

  it("collapses a run of recursive stars without changing glob semantics", () => {
    const pattern = globToRegExp("books/***/2024.bean");
    expect(pattern?.test("books/archive/2024.bean")).toBe(true);
    expect(pattern?.test("books/2024.bean")).toBe(true);
  });

  it("matches character classes without a backtracking RegExp", () => {
    const pattern = globToRegExp("accounts/[!0-9]?.bean");
    expect(pattern?.test("accounts/ab.bean")).toBe(true);
    expect(pattern?.test("accounts/1b.bean")).toBe(false);
    expect(globToRegExp("accounts/[z-a].bean")).toBeNull();
  });

  it("rejects a hostile non-match without exponential backtracking", () => {
    const pattern = globToRegExp(`${"a*".repeat(30)}b`);
    expect(pattern?.test("a".repeat(256))).toBe(false);
  });
});

function b64(text: string): string {
  return Buffer.from(text, "utf-8").toString("base64");
}

/** Build a mock Gitea client backed by an in-memory repo tree + file contents. */
function mockClient(
  tree: Array<{ path: string; type: string }>,
  contents: Record<string, string>,
  opts: { truncatePages?: number; treeSha?: string } = {},
): { client: GiteaClientLike; getTree: jest.Mock; repoGetContents: jest.Mock } {
  const getTree = jest.fn(
    async (
      _owner: string,
      _repo: string,
      _sha: string,
      query?: { page?: number },
    ) => {
      const page = query?.page ?? 1;
      const truncated = page < (opts.truncatePages ?? 1);
      // Serve the whole tree on the last page; earlier pages are empty stubs.
      return {
        data: { sha: opts.treeSha, tree: truncated ? [] : tree, truncated },
      };
    },
  );
  const repoGetContents = jest.fn(
    async (_owner: string, _repo: string, filepath: string) => ({
      data: {
        type: "file",
        encoding: "base64",
        content: b64(contents[filepath]),
      },
    }),
  );
  return {
    client: { repos: { getTree, repoGetContents } },
    getTree,
    repoGetContents,
  };
}

describe("loadLedgerFileMap", () => {
  it("treats Object.prototype names only as real own-path entries", () => {
    const missing = { "main.bean": 'include "constructor"\n' };
    expect(collectSourceFiles(missing, "main.bean")).toEqual(["main.bean"]);
    expect(() =>
      requireEntryPoint(missing, "alice", "book", "valueOf"),
    ).toThrow(NotFoundError);

    const present = Object.assign(Object.create(null), missing, {
      constructor: "2024-01-01 open Assets:Cash USD\n",
    });
    expect(collectSourceFiles(present, "main.bean")).toEqual([
      "constructor",
      "main.bean",
    ]);
  });

  it("collects only .bean/.beancount blobs, decodes base64, and returns the entry point", async () => {
    const { client, repoGetContents } = mockClient(
      [
        { path: "main.bean", type: "blob" },
        { path: "accounts/opens.beancount", type: "blob" },
        { path: "accounts", type: "tree" },
        { path: "README.md", type: "blob" },
        { path: "receipts/r.pdf", type: "blob" },
      ],
      {
        "main.bean": 'include "accounts/opens.beancount"\n',
        "accounts/opens.beancount": "2024-01-01 open Assets:Cash USD\n",
      },
    );

    const result = await loadLedgerFileMap(client, "alice", "book");

    expect(result.entryPoint).toBe("main.bean");
    expect(Object.keys(result.files).sort()).toEqual([
      "accounts/opens.beancount",
      "main.bean",
    ]);
    expect(result.files["main.bean"]).toContain("include");
    expect(result.files["accounts/opens.beancount"]).toContain(
      "open Assets:Cash",
    );
    expect(result.sourceFiles).toEqual([
      "accounts/opens.beancount",
      "main.bean",
    ]);
    // README.md and receipts/r.pdf and the tree entry are excluded.
    expect(repoGetContents).toHaveBeenCalledTimes(2);
  });

  it("loads an oversized content:null blob through the raw endpoint", async () => {
    const getTree = jest.fn(async () => ({
      data: {
        tree: [{ path: "main.bean", type: "blob" }],
        truncated: false,
      },
    }));
    const repoGetContents = jest.fn(async () => ({
      data: { path: "main.bean", content: null, sha: "large-sha" },
    }));
    const repoGetRawFileOrLfs = jest.fn(async () => ({
      data: new Blob(['option "title" "Large"\n']),
    }));
    const client: GiteaClientLike = {
      repos: { getTree, repoGetContents, repoGetRawFileOrLfs },
    };

    const result = await loadLedgerFileMap(client, "alice", "book");

    expect(result.files["main.bean"]).toBe('option "title" "Large"\n');
    expect(repoGetRawFileOrLfs).toHaveBeenCalledWith(
      "alice",
      "book",
      "main.bean",
      undefined,
      { format: "raw" },
    );
  });

  it("rejects a raw source blob above the per-file byte budget before decoding", async () => {
    const client: GiteaClientLike = {
      repos: {
        getTree: async () => ({
          data: {
            tree: [{ path: "main.bean", type: "blob" }],
            truncated: false,
          },
        }),
        repoGetContents: async () => ({
          data: { path: "main.bean", content: null, sha: "large-sha" },
        }),
        repoGetRawFileOrLfs: async () =>
          new Response("x".repeat(MAX_LEDGER_SOURCE_FILE_BYTES + 1)) as never,
      },
    };

    await expect(
      loadLedgerFileMap(client, "alice", "book"),
    ).rejects.toBeInstanceOf(ResourceLimitReachedError);
  });

  it("uses declared tree sizes to reject an oversized source before fetching it", async () => {
    const repoGetContents = jest.fn();
    const client: GiteaClientLike = {
      repos: {
        getTree: async () => ({
          data: {
            tree: [
              {
                path: "main.bean",
                type: "blob",
                size: MAX_LEDGER_SOURCE_FILE_BYTES + 1,
              },
            ],
            truncated: false,
          },
        }),
        repoGetContents,
      },
    };

    await expect(
      fetchBeanFileMap(client, "alice", "book"),
    ).rejects.toBeInstanceOf(ResourceLimitReachedError);
    expect(repoGetContents).not.toHaveBeenCalled();
  });

  it("rejects a repository-wide bean sweep above the loaded-file budget", async () => {
    const paths = Array.from(
      { length: MAX_LEDGER_FILE_MAP_FILES + 1 },
      (_, index) => ({ path: `books/${index}.bean`, type: "blob" }),
    );
    const repoGetContents = jest.fn();
    const client: GiteaClientLike = {
      repos: {
        getTree: async () => ({ data: { tree: paths, truncated: false } }),
        repoGetContents,
      },
    };

    await expect(
      fetchBeanFileMap(client, "alice", "book"),
    ).rejects.toBeInstanceOf(ResourceLimitReachedError);
    expect(repoGetContents).not.toHaveBeenCalled();
  });

  it("rejects aggregate include-glob work above the matcher budget", async () => {
    const hostilePattern = `${"a*".repeat(30)}b`;
    const candidates = Array.from({ length: 800 }, (_, index) => ({
      path: `${"a".repeat(240)}-${index}.txt`,
      type: "blob",
    }));
    const { client } = mockClient(
      [{ path: "main.bean", type: "blob" }, ...candidates],
      { "main.bean": `include "${hostilePattern}"\n` },
    );

    await expect(
      fetchBeanFileMap(client, "alice", "book"),
    ).rejects.toMatchObject({
      metadata: expect.objectContaining({ limit: MAX_INCLUDE_GLOB_WORK }),
    });
  });

  it("rejects a broad glob before fetching more candidate files than allowed", async () => {
    const candidates = Array.from(
      { length: MAX_LEDGER_FILE_MAP_FILES + 1 },
      (_, index) => ({ path: `attachments/${index}.txt`, type: "blob" }),
    );
    const { client, repoGetContents } = mockClient(
      [{ path: "main.bean", type: "blob" }, ...candidates],
      { "main.bean": 'include "**"\n' },
    );

    await expect(
      fetchBeanFileMap(client, "alice", "book"),
    ).rejects.toBeInstanceOf(ResourceLimitReachedError);
    expect(repoGetContents).toHaveBeenCalledTimes(1);
  });

  it('loads a non-.bean file reached via `include` (include "accounts.txt")', async () => {
    const { client, repoGetContents } = mockClient(
      [
        { path: "main.bean", type: "blob" },
        { path: "accounts.txt", type: "blob" },
        { path: "prices", type: "blob" }, // extensionless, also included
        { path: "ignored.txt", type: "blob" }, // present but NOT included
      ],
      {
        "main.bean": 'include "accounts.txt"\ninclude "prices"\n',
        "accounts.txt": "2024-01-01 open Assets:Cash USD\n",
        prices: "2024-01-01 price HOOL 10 USD\n",
      },
    );

    const result = await loadLedgerFileMap(client, "alice", "book");

    expect(Object.keys(result.files).sort()).toEqual([
      "accounts.txt",
      "main.bean",
      "prices",
    ]);
    // main.bean (bean sweep) + the two included non-bean files; ignored.txt not fetched.
    expect(repoGetContents).toHaveBeenCalledTimes(3);
    expect(repoGetContents).not.toHaveBeenCalledWith(
      "alice",
      "book",
      "ignored.txt",
      undefined,
    );
  });

  it("resolves an include relative to the including file's directory", async () => {
    const { client } = mockClient(
      [
        { path: "main.bean", type: "blob" },
        { path: "sub/ledger.bean", type: "blob" },
        { path: "sub/accounts.txt", type: "blob" },
      ],
      {
        "main.bean": 'include "sub/ledger.bean"\n',
        // relative target -> resolves to sub/accounts.txt, NOT accounts.txt
        "sub/ledger.bean": 'include "accounts.txt"\n',
        "sub/accounts.txt": "2024-01-01 open Assets:Cash USD\n",
      },
    );
    const result = await loadLedgerFileMap(client, "alice", "book");
    expect(Object.keys(result.files).sort()).toEqual([
      "main.bean",
      "sub/accounts.txt",
      "sub/ledger.bean",
    ]);
  });

  it("follows transitive non-.bean includes", async () => {
    const { client } = mockClient(
      [
        { path: "main.bean", type: "blob" },
        { path: "a.txt", type: "blob" },
        { path: "b.txt", type: "blob" },
      ],
      {
        "main.bean": 'include "a.txt"\n',
        "a.txt": 'include "b.txt"\n',
        "b.txt": "2024-01-01 open Assets:Cash USD\n",
      },
    );
    const result = await loadLedgerFileMap(client, "alice", "book");
    expect(Object.keys(result.files).sort()).toEqual([
      "a.txt",
      "b.txt",
      "main.bean",
    ]);
  });

  it("expands a glob include (accounts/*.txt) to all matching repo blobs (#7)", async () => {
    const { client } = mockClient(
      [
        { path: "main.bean", type: "blob" },
        { path: "accounts/a.txt", type: "blob" },
        { path: "accounts/b.txt", type: "blob" },
        { path: "accounts/nested/c.txt", type: "blob" }, // * does not cross /
        { path: "accounts/note.md", type: "blob" }, // wrong extension
        { path: "other.txt", type: "blob" }, // wrong directory
      ],
      {
        "main.bean": 'include "accounts/*.txt"\n',
        "accounts/a.txt": "2024-01-01 open Assets:A USD\n",
        "accounts/b.txt": "2024-01-01 open Assets:B USD\n",
      },
    );
    const result = await loadLedgerFileMap(client, "alice", "book");
    expect(Object.keys(result.files)).toEqual([
      "accounts/a.txt",
      "accounts/b.txt",
      "main.bean",
    ]);
  });

  it("expands a recursive glob include (accounts/**/*.txt)", async () => {
    const { client } = mockClient(
      [
        { path: "main.bean", type: "blob" },
        { path: "accounts/a.txt", type: "blob" },
        { path: "accounts/nested/c.txt", type: "blob" },
      ],
      {
        "main.bean": 'include "accounts/**/*.txt"\n',
        "accounts/a.txt": "2024-01-01 open Assets:A USD\n",
        "accounts/nested/c.txt": "2024-01-01 open Assets:C USD\n",
      },
    );
    const result = await loadLedgerFileMap(client, "alice", "book");
    expect(Object.keys(result.files)).toEqual([
      "accounts/a.txt",
      "accounts/nested/c.txt",
      "main.bean",
    ]);
  });

  it("does not throw on a malformed glob include (reversed char-class range) (#4)", async () => {
    // `[z-a]` is an invalid RegExp range; a user-editable ledger must not 500.
    const { client } = mockClient([{ path: "main.bean", type: "blob" }], {
      "main.bean": 'include "[z-a].txt"\n',
    });
    const result = await loadLedgerFileMap(client, "alice", "book");
    // Loads nothing extra; the engine will report a normal "no match" error.
    expect(Object.keys(result.files)).toEqual(["main.bean"]);
  });

  it("returns files in DETERMINISTIC (sorted) key order regardless of fetch order (#5)", async () => {
    // Tree lists b before a; parallel fetch could insert either order. The
    // result must be sorted so the source-slice file walk is deterministic.
    const { client } = mockClient(
      [
        { path: "main.bean", type: "blob" },
        { path: "z.bean", type: "blob" },
        { path: "a.bean", type: "blob" },
        { path: "m.bean", type: "blob" },
      ],
      {
        "main.bean": "\n",
        "z.bean": "\n",
        "a.bean": "\n",
        "m.bean": "\n",
      },
    );
    const result = await loadLedgerFileMap(client, "alice", "book");
    expect(Object.keys(result.files)).toEqual([
      "a.bean",
      "m.bean",
      "main.bean",
      "z.bean",
    ]);
    // The repo-wide FileMap remains cacheable, while the entry-point closure
    // does not expose unrelated bean files as ledger sources.
    expect(result.sourceFiles).toEqual(["main.bean"]);
  });

  it("bounds concurrent fetches for the repository-wide bean sweep", async () => {
    const paths = Array.from(
      { length: GITEA_FILE_FETCH_CONCURRENCY + 3 },
      (_, index) => `ledger-${index}.bean`,
    );
    let active = 0;
    let maxActive = 0;
    let releaseFetches: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      releaseFetches = resolve;
    });
    const repoGetContents = jest.fn(async (_owner, _repo, path: string) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await gate;
      active -= 1;
      return { data: { encoding: "base64", content: b64(path) } };
    });
    const client: GiteaClientLike = {
      repos: {
        getTree: async () => ({
          data: {
            tree: paths.map((path) => ({ path, type: "blob" })),
            truncated: false,
          },
        }),
        repoGetContents,
      },
    };

    const loading = fetchBeanFileMap(client, "alice", "book");
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(active).toBe(GITEA_FILE_FETCH_CONCURRENCY);
    expect(maxActive).toBe(GITEA_FILE_FETCH_CONCURRENCY);
    releaseFetches?.();
    await expect(loading).resolves.toBeDefined();
    expect(repoGetContents).toHaveBeenCalledTimes(paths.length);
  });

  it("also bounds concurrent fetches for non-bean include batches", async () => {
    const includePaths = Array.from(
      { length: GITEA_FILE_FETCH_CONCURRENCY + 3 },
      (_, index) => `accounts-${index}.txt`,
    );
    let active = 0;
    let maxActive = 0;
    let releaseFetches: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      releaseFetches = resolve;
    });
    const repoGetContents = jest.fn(
      async (_owner: string, _repo: string, path: string) => {
        if (path === "main.bean") {
          return {
            data: {
              encoding: "base64",
              content: b64(
                includePaths.map((item) => `include "${item}"`).join("\n"),
              ),
            },
          };
        }
        active += 1;
        maxActive = Math.max(maxActive, active);
        await gate;
        active -= 1;
        return { data: { encoding: "base64", content: b64("") } };
      },
    );
    const client: GiteaClientLike = {
      repos: {
        getTree: async () => ({
          data: {
            tree: ["main.bean", ...includePaths].map((path) => ({
              path,
              type: "blob",
            })),
            truncated: false,
          },
        }),
        repoGetContents,
      },
    };

    const loading = fetchBeanFileMap(client, "alice", "book");
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(active).toBe(GITEA_FILE_FETCH_CONCURRENCY);
    expect(maxActive).toBe(GITEA_FILE_FETCH_CONCURRENCY);
    releaseFetches?.();
    const result = await loading;
    expect(Object.keys(result.files)).toHaveLength(includePaths.length + 1);
    expect(repoGetContents).toHaveBeenCalledTimes(includePaths.length + 1);
  });

  it("tracks only the transitive entry-point closure across globs and cycles", async () => {
    const { client } = mockClient(
      [
        { path: "main.bean", type: "blob" },
        { path: "books/a.bean", type: "blob" },
        { path: "books/b.bean", type: "blob" },
        { path: "scratch.bean", type: "blob" },
      ],
      {
        "main.bean": 'include "books/*.bean"\n',
        "books/a.bean": 'include "../main.bean"\n',
        "books/b.bean": "2024-01-01 open Assets:Cash USD\n",
        "scratch.bean": "2024-01-01 open Assets:Hidden USD\n",
      },
    );

    const result = await loadLedgerFileMap(client, "alice", "book");

    expect(Object.keys(result.files)).toContain("scratch.bean");
    expect(result.sourceFiles).toEqual([
      "books/a.bean",
      "books/b.bean",
      "main.bean",
    ]);
  });

  it("does not fetch an include target that is not in the repo (typo)", async () => {
    const { client, repoGetContents } = mockClient(
      [{ path: "main.bean", type: "blob" }],
      { "main.bean": 'include "missing.txt"\n' },
    );
    const result = await loadLedgerFileMap(client, "alice", "book");
    expect(Object.keys(result.files)).toEqual(["main.bean"]);
    // Only main.bean is fetched; the missing target is left for the engine to report.
    expect(repoGetContents).toHaveBeenCalledTimes(1);
  });

  it("ignores a commented-out include line", async () => {
    const { client } = mockClient(
      [
        { path: "main.bean", type: "blob" },
        { path: "secret.txt", type: "blob" },
      ],
      {
        "main.bean":
          '; include "secret.txt"\n2024-01-01 open Assets:Cash USD\n',
      },
    );
    const result = await loadLedgerFileMap(client, "alice", "book");
    expect(Object.keys(result.files)).toEqual(["main.bean"]);
  });

  it("honors a custom entry point", async () => {
    const { client } = mockClient([{ path: "ledger.bean", type: "blob" }], {
      "ledger.bean": "2024-01-01 open Assets:Cash USD\n",
    });
    const result = await loadLedgerFileMap(client, "alice", "book", {
      entryPoint: "ledger.bean",
    });
    expect(result.entryPoint).toBe("ledger.bean");
    expect(Object.keys(result.files)).toEqual(["ledger.bean"]);
  });

  it("throws NotFoundError when the entry point is missing", async () => {
    const { client } = mockClient([{ path: "other.bean", type: "blob" }], {
      "other.bean": "\n",
    });
    await expect(loadLedgerFileMap(client, "alice", "book")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("passes the requested ref through to tree + content reads", async () => {
    const { client, getTree, repoGetContents } = mockClient(
      [{ path: "main.bean", type: "blob" }],
      { "main.bean": "\n" },
    );
    await loadLedgerFileMap(client, "alice", "book", { ref: "abc123" });
    expect(getTree).toHaveBeenCalledWith(
      "alice",
      "book",
      "abc123",
      expect.objectContaining({ recursive: true }),
    );
    expect(repoGetContents).toHaveBeenCalledWith("alice", "book", "main.bean", {
      ref: "abc123",
    });
  });

  it("paginates the tree until not truncated", async () => {
    const { client, getTree, repoGetContents } = mockClient(
      [{ path: "main.bean", type: "blob" }],
      { "main.bean": "\n" },
      {
        truncatePages: 3,
        treeSha: "resolved-sha",
      }, // pages 1 and 2 truncated, page 3 serves the tree
    );
    const result = await loadLedgerFileMap(client, "alice", "book");
    expect(result.files["main.bean"]).toBeDefined();
    expect(getTree).toHaveBeenCalledTimes(3);
    expect(getTree.mock.calls.map((call) => call[2])).toEqual([
      "HEAD",
      "resolved-sha",
      "resolved-sha",
    ]);
    expect(repoGetContents).toHaveBeenCalledWith("alice", "book", "main.bean", {
      ref: "resolved-sha",
    });
  });

  it("rejects rather than caching or parsing an incomplete bounded tree", async () => {
    const { client, getTree, repoGetContents } = mockClient(
      [{ path: "main.bean", type: "blob" }],
      { "main.bean": "\n" },
      { truncatePages: 101 },
    );

    await expect(loadLedgerFileMap(client, "alice", "book")).rejects.toThrow(
      "pagination safety bound",
    );
    expect(getTree).toHaveBeenCalledTimes(100);
    expect(repoGetContents).not.toHaveBeenCalled();
  });
});

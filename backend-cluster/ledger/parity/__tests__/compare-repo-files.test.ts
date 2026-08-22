import { compareRepoFiles, GITEA_URL } from "../expect-parity";

type TreeEntry = { path: string; type: string; sha: string };

function stubGitea(
  trees: Record<string, TreeEntry[]>,
  contents: Record<string, string>, // "<repo>/<path>" → base64
): jest.SpyInstance {
  return jest.spyOn(global, "fetch").mockImplementation((input) => {
    const url = String(input);
    if (!url.startsWith(GITEA_URL)) {
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    }
    const treeMatch = url.match(/\/repos\/[^/]+\/([^/]+)\/git\/trees\/main/);
    if (treeMatch) {
      return Promise.resolve(
        new Response(JSON.stringify({ tree: trees[treeMatch[1]] ?? [] }), {
          status: 200,
        }),
      );
    }
    const contentMatch = url.match(/\/repos\/[^/]+\/([^/]+)\/contents\/(.+)$/);
    if (contentMatch) {
      const key = `${contentMatch[1]}/${decodeURIComponent(contentMatch[2])}`;
      return Promise.resolve(
        new Response(JSON.stringify({ content: contents[key] ?? "" }), {
          status: 200,
        }),
      );
    }
    return Promise.reject(new Error(`unhandled gitea url: ${url}`));
  });
}

const b64 = (s: string) => Buffer.from(s).toString("base64");

describe("compareRepoFiles (write-parity rule)", () => {
  afterEach(() => jest.restoreAllMocks());

  it("passes when trees have equal paths and blob SHAs (no blob fetches)", async () => {
    const spy = stubGitea(
      {
        a: [{ path: "main.bean", type: "blob", sha: "s1" }],
        b: [{ path: "main.bean", type: "blob", sha: "s1" }],
      },
      {},
    );
    await compareRepoFiles("a", "b");
    // only the two tree calls — equal SHAs prove equal bytes
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("fails when a file exists in only one repo", async () => {
    stubGitea(
      {
        a: [{ path: "main.bean", type: "blob", sha: "s1" }],
        b: [],
      },
      {},
    );
    await expect(compareRepoFiles("a", "b")).rejects.toThrow(/only in a/);
  });

  it("fails with a content diff when bytes differ", async () => {
    stubGitea(
      {
        a: [{ path: "main.bean", type: "blob", sha: "s1" }],
        b: [{ path: "main.bean", type: "blob", sha: "s2" }],
      },
      {
        "a/main.bean": b64("2020-01-01 open Assets:A\n"),
        "b/main.bean": b64("2020-01-01 open Assets:B\n"),
      },
    );
    await expect(compareRepoFiles("a", "b")).rejects.toThrow(
      /main\.bean differs/,
    );
  });

  it("tolerates differing SHAs when decoded bytes are identical (mode-only changes)", async () => {
    stubGitea(
      {
        a: [{ path: "main.bean", type: "blob", sha: "s1" }],
        b: [{ path: "main.bean", type: "blob", sha: "s2" }],
      },
      {
        "a/main.bean": b64("same\n"),
        "b/main.bean": b64("same\n"),
      },
    );
    await compareRepoFiles("a", "b");
  });
});

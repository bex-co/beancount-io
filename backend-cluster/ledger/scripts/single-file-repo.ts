/**
 * An in-memory Gitea client for a repository that holds exactly one ledger
 * file, `main.bean`, as the ledger loader expects it. Shared by the live engine
 * checks in `verify-rustledger.ts` and the BQL oracle replay.
 */
export function singleFileRepoFactory(source: string) {
  return {
    getPublicApiClient: async () => ({
      repos: {
        repoGetAllCommits: async () => ({ data: [] }),
        getTree: async () => ({
          data: {
            tree: [{ path: "main.bean", type: "blob" }],
            truncated: false,
          },
        }),
        repoGetContents: async (
          _owner: string,
          _repo: string,
          path: string,
        ) => {
          if (path !== "main.bean")
            throw new Error(`Unexpected verification fixture path: ${path}`);
          return {
            data: {
              type: "file",
              encoding: "base64",
              content: Buffer.from(source).toString("base64"),
            },
          };
        },
      },
    }),
  };
}

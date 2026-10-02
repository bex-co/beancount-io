import { ApiClient } from "@/foundation/fava/api-client";
import { Api as GiteaApi } from "@/features/gitea/client/gitea-api";

const targets = [
  ["alice", "x/star"],
  ["alice", "x?y=1"],
  ["alice", "x#y"],
  ["alice", "x%2fstar"],
  ["alice/else", "main"],
  ["alice?x=1", "main"],
  ["alice#x", "main"],
  ["alice%2felse", "main"],
];

function clients() {
  const requests: { url: URL; method: string | undefined }[] = [];
  const customFetch: typeof fetch = async (input, init) => {
    requests.push({ url: new URL(String(input)), method: init?.method });
    return Response.json({ success: true, data: {} });
  };
  return {
    requests,
    fava: new ApiClient({ baseUrl: "https://ledger.example", customFetch }),
    gitea: new GiteaApi({ baseUrl: "https://git.example/api/v1", customFetch }),
  };
}

describe.each(["fava", "gitea"] as const)("%s ledger path encoding", (kind) => {
  it.each(["read", "update", "delete"] as const)(
    "keeps owner and repository in their own segments during %s",
    async (operation) => {
      const { fava, gitea, requests } = clients();
      for (const [owner, name] of targets) {
        if (kind === "fava") {
          if (operation === "read") await fava.ledgers.getLedger(owner, name);
          if (operation === "update")
            await fava.ledgers.updateLedger(owner, name, {});
          if (operation === "delete")
            await fava.ledgers.deleteLedger(owner, name);
        } else {
          if (operation === "read") await gitea.repos.repoGet(owner, name);
          if (operation === "update")
            await gitea.repos.repoEdit(owner, name, {});
          if (operation === "delete") await gitea.repos.repoDelete(owner, name);
        }
        const { url, method } = requests.at(-1)!;
        const prefix = kind === "fava" ? "/ledgers" : "/api/v1/repos";
        expect(url.pathname).toBe(
          `${prefix}/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
        );
        expect(url.search).toBe("");
        expect(url.hash).toBe("");
        expect(method).toBe(
          operation === "read"
            ? "GET"
            : operation === "delete"
              ? "DELETE"
              : kind === "fava"
                ? "PUT"
                : "PATCH",
        );
      }
      expect(requests).toHaveLength(targets.length);
    },
  );
});

it("preserves Gitea nested file paths and branch queries while encoding the ledger", async () => {
  const { gitea, requests } = clients();
  await gitea.repos.repoGetContents("alice?x", "books#y", "nested/main.bean", {
    ref: "feature/reconciliation",
  });
  expect(requests[0].url.pathname).toBe(
    "/api/v1/repos/alice%3Fx/books%23y/contents/nested/main.bean",
  );
  expect(requests[0].url.searchParams.get("ref")).toBe(
    "feature/reconciliation",
  );
  expect(requests[0].url.hash).toBe("");
});

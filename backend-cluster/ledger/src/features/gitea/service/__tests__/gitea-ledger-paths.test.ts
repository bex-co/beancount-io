import { Api as GiteaApi } from "@/features/gitea/client/gitea-api";

const targets = [
  ["alice", "x/star", "alice/x%2Fstar"],
  ["alice", "x?y=1", "alice/x%3Fy%3D1"],
  ["alice", "x#y", "alice/x%23y"],
  ["alice", "x%2fstar", "alice/x%252fstar"],
  ["alice/else", "main", "alice%2Felse/main"],
  ["alice?x=1", "main", "alice%3Fx%3D1/main"],
  ["alice#x", "main", "alice%23x/main"],
  ["alice%2felse", "main", "alice%252felse/main"],
];

function client() {
  const requests: { url: URL; method: string | undefined }[] = [];
  const api = new GiteaApi({
    baseUrl: "https://git.example/api/v1",
    baseApiParams: { format: "json" },
    customFetch: async (input, init) => {
      requests.push({ url: new URL(String(input)), method: init?.method });
      return Response.json({ id: 42, private: true });
    },
  });
  return { api, requests };
}

describe.each(["read", "update", "delete"] as const)(
  "Gitea ledger coordinates during %s",
  (operation) => {
    it.each(targets)(
      "keeps %s/%s in its original coordinate segments",
      async (owner, repo, expected) => {
        const { api, requests } = client();
        if (operation === "read") await api.repos.repoGet(owner, repo);
        if (operation === "update") await api.repos.repoEdit(owner, repo, {});
        if (operation === "delete") await api.repos.repoDelete(owner, repo);

        expect(requests).toHaveLength(1);
        const { url, method } = requests[0];
        expect(url.pathname).toBe(`/api/v1/repos/${expected}`);
        expect(url.search).toBe("");
        expect(url.hash).toBe("");
        expect(method).toBe(
          operation === "read"
            ? "GET"
            : operation === "update"
              ? "PATCH"
              : "DELETE",
        );
      },
    );
  },
);

it("preserves nested file paths and branch queries while encoding ledger coordinates", async () => {
  const { api, requests } = client();
  await api.repos.repoGetContents("alice?x", "books#y", "nested/main.bean", {
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

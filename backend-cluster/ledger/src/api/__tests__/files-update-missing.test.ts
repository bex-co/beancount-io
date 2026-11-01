import { changeExistingFiles, updateExistingFile } from "@/api/files";
import { NotFoundDetailError } from "@/server/py-errors";
import { Api as GiteaApi } from "@/features/gitea/client/gitea-api";

// w21/468: Gitea answers an update of a path that no longer exists with 500, so
// a save of a file deleted elsewhere read as "temporarily unavailable".
type Call = { method: string; url: string };
const clientAnswering = (
  answer: (call: Call) => Response,
  calls: Call[] = [],
) =>
  new GiteaApi({
    baseUrl: "https://gitea.test/api/v1",
    baseApiParams: { format: "json" },
    customFetch: async (input, init) => {
      const call = {
        method: String(init?.method ?? "GET"),
        url: String(input),
      };
      calls.push(call);
      return answer(call);
    },
  });
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
const options = { content: "eA==", sha: "old", message: "Update qa.txt" };
const update = (client: GiteaApi<unknown>) =>
  updateExistingFile(
    client as never,
    "alice",
    "book",
    "qa.txt",
    "qa.txt",
    options,
  );

describe("updateExistingFile", () => {
  it("answers NOT_FOUND when Gitea fails the update and the path is gone", async () => {
    const calls: Call[] = [];
    const client = clientAnswering(
      ({ method }) =>
        method === "PUT"
          ? json(500, {
              message: "object does not exist [id: , rel_path: qa.txt]",
            })
          : json(404, { message: "not found" }),
      calls,
    );
    await expect(update(client)).rejects.toBeInstanceOf(NotFoundDetailError);
    await expect(update(client)).rejects.toThrow("File qa.txt does not exist");
    expect(calls.map((call) => call.method)).toEqual([
      "PUT",
      "GET",
      "PUT",
      "GET",
    ]);
  });

  it("keeps the original error when the file is still there", async () => {
    const client = clientAnswering(({ method }) =>
      method === "PUT"
        ? json(500, { message: "disk on fire" })
        : json(200, { name: "qa.txt", path: "qa.txt", type: "file", sha: "s" }),
    );
    await expect(update(client)).rejects.toMatchObject({ status: 500 });
  });

  // w23/072: production's lost race arrives as a 500 no rule recognizes.
  describe("a 500 nothing recognizes", () => {
    const failing = (current: unknown) =>
      clientAnswering(({ method }) =>
        method === "PUT" ? json(500, { message: "" }) : json(200, current),
      );
    const file = (content: string, sha: string) => ({
      name: "qa.txt",
      path: "qa.txt",
      type: "file",
      sha,
      content: Buffer.from(content).toString("base64"),
      encoding: "base64",
    });

    it("is a 409 conflict when another commit changed the file", async () => {
      const failure = await update(failing(file("theirs", "new"))).catch(
        (error: unknown) => error,
      );
      expect(failure).toMatchObject({ category: "CONFLICT" });
      expect((failure as Error).message).toMatch(/^Ledger file conflict:/);
    });

    it("reports success, without writing again, when the update had landed", async () => {
      const calls: Call[] = [];
      const client = clientAnswering(
        ({ method }) =>
          method === "PUT"
            ? json(500, { message: "" })
            : json(200, file("x", "new")),
        calls,
      );
      const result = (await update(client)) as { data: { content: unknown } };
      expect(result.data.content).toMatchObject({ sha: "new" });
      expect(calls.filter((call) => call.method === "PUT")).toHaveLength(1);
    });
  });

  it("does not probe a stale sha, a lost race, or a success", async () => {
    const calls: Call[] = [];
    const stale = clientAnswering(
      () => json(422, { message: "sha does not match [given: old]" }),
      calls,
    );
    await expect(update(stale)).rejects.toMatchObject({ status: 422 });
    const raced = clientAnswering(
      () =>
        json(500, {
          message: "PushRejected Error: cannot lock ref 'refs/heads/main'",
        }),
      calls,
    );
    await expect(update(raced)).rejects.toMatchObject({ status: 500 });
    const fine = clientAnswering(
      () => json(200, { content: { name: "qa.txt", path: "qa.txt" } }),
      calls,
    );
    await expect(update(fine)).resolves.toBeDefined();
    expect(calls.map((call) => call.method)).toEqual(["PUT", "PUT", "PUT"]);
  });
});

describe("changeExistingFiles", () => {
  const operations: Parameters<typeof changeExistingFiles>[4] = [
    { operation: "create", path: "new.bean", content: "eA==" },
    { operation: "update", path: "qa.txt", content: "eA==", sha: "old" },
  ];
  const change = (client: GiteaApi<unknown>) =>
    changeExistingFiles(
      client as never,
      "alice",
      "book",
      { files: operations ?? [] },
      operations,
    );

  it("answers NOT_FOUND naming the updated path that is gone", async () => {
    const calls: Call[] = [];
    const client = clientAnswering(({ method, url }) => {
      if (method === "POST") return json(500, { message: "boom" });
      return url.endsWith("qa.txt")
        ? json(404, { message: "not found" })
        : json(200, {});
    }, calls);
    await expect(change(client)).rejects.toBeInstanceOf(NotFoundDetailError);
    await expect(change(client)).rejects.toThrow("File qa.txt does not exist");
    // Only the update is probed, not the create.
    expect(
      calls
        .filter((call) => call.method === "GET")
        .every((call) => call.url.endsWith("qa.txt")),
    ).toBe(true);
  });

  it("keeps a stale sha and a success as they were", async () => {
    const stale = clientAnswering(() =>
      json(422, { message: "sha does not match" }),
    );
    await expect(change(stale)).rejects.toMatchObject({ status: 422 });
    const fine = clientAnswering(() => json(201, {}));
    await expect(change(fine)).resolves.toBeUndefined();
  });

  // w21/551: a delete of a file that is already gone failed the same way, and
  // REST (through /change-files) said SERVICE_UNAVAILABLE where GraphQL and MCP
  // said NOT_FOUND.
  it("answers NOT_FOUND for a delete of a path that is gone, and probes only it", async () => {
    const calls: Call[] = [];
    const client = clientAnswering(({ method, url }) => {
      if (method === "POST") {
        return json(500, { message: "repository file does not exist" });
      }
      return url.endsWith("nope.bean")
        ? json(404, { message: "not found" })
        : json(200, {});
    }, calls);
    const remove = () =>
      changeExistingFiles(client as never, "alice", "book", { files: [] }, [
        { operation: "create", path: "new.bean", content: "eA==" },
        { operation: "delete", path: "nope.bean", sha: "any" },
      ]);
    await expect(remove()).rejects.toBeInstanceOf(NotFoundDetailError);
    await expect(remove()).rejects.toThrow("File nope.bean does not exist");
    expect(
      calls
        .filter((call) => call.method === "GET")
        .every((call) => call.url.endsWith("nope.bean")),
    ).toBe(true);
  });

  it("keeps the original error when the file to delete is still there", async () => {
    const client = clientAnswering(({ method }) =>
      method === "POST"
        ? json(500, { message: "disk on fire" })
        : json(200, { name: "a.bean", path: "a.bean", type: "file", sha: "s" }),
    );
    await expect(
      changeExistingFiles(client as never, "alice", "book", { files: [] }, [
        { operation: "delete", path: "a.bean", sha: "s" },
      ]),
    ).rejects.toMatchObject({ status: 500 });
  });
});

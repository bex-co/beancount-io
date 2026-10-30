import {
  getFileContentsChunked,
  MAX_LARGE_FILE_BYTES,
  withLargeContent,
} from "@/api/files";
import {
  Api as GiteaApi,
  type ContentsResponse,
} from "@/features/gitea/client/gitea-api";

const clientServing = (body: string | Uint8Array) =>
  new GiteaApi({
    baseUrl: "https://gitea.test/api/v1",
    baseApiParams: { format: "json" },
    customFetch: async () => new Response(body),
  });

// Gitea sends `content: null` for a large blob despite its spec.
const large = (over: Record<string, unknown> = {}): ContentsResponse =>
  ({
    name: "main.bean",
    path: "main.bean",
    type: "file",
    sha: "large-sha",
    size: 11_000_000,
    content: null,
    encoding: null,
    ...over,
  }) as unknown as ContentsResponse;

describe("withLargeContent (w21/343)", () => {
  it("fills a file Gitea returned with content null from the raw endpoint", async () => {
    const text = 'option "title" "Big"\n';
    const out = await withLargeContent(
      clientServing(text) as never,
      "alice",
      "book",
      large(),
    );
    expect(out.encoding).toBe("base64");
    expect(Buffer.from(out.content as string, "base64").toString("utf-8")).toBe(
      text,
    );
    expect(out.sha).toBe("large-sha");
  });

  it("leaves an inline file, an empty file and a directory untouched", async () => {
    const client = clientServing("never read") as never;
    const inline = large({ content: "aGk=", encoding: "base64", size: 2 });
    const empty = large({ size: 0 });
    const dir = large({ type: "dir" });
    expect(await withLargeContent(client, "a", "b", inline)).toBe(inline);
    expect(await withLargeContent(client, "a", "b", empty)).toBe(empty);
    expect(await withLargeContent(client, "a", "b", dir)).toBe(dir);
  });

  it("refuses a blob past the cap instead of returning an empty read", async () => {
    const client = new GiteaApi({
      baseUrl: "https://gitea.test/api/v1",
      baseApiParams: { format: "json" },
      customFetch: async () =>
        new Response("x", {
          headers: { "content-length": String(MAX_LARGE_FILE_BYTES + 1) },
        }),
    });
    await expect(
      withLargeContent(client as never, "a", "b", large()),
    ).rejects.toThrow();
  });
});

describe("getFileContentsChunked (w23/205)", () => {
  // The host answers at most 30 entries per batched request and drops the rest.
  const host = (existing: ReadonlySet<string>) => {
    const calls: string[][] = [];
    const client = {
      repos: {
        repoGetFileContentsPost: async (
          _owner: string,
          _repo: string,
          { files }: { files: string[] },
        ) => {
          calls.push(files);
          return {
            data: files
              .slice(0, 30)
              .filter((path) => existing.has(path))
              .map((path) => ({ path })),
          };
        },
      },
    };
    return { client: client as never, calls };
  };
  const names = (count: number) =>
    Array.from({ length: count }, (_, i) => `d/f${i}.bean`);

  it.each([30, 31, 60, 95])(
    "returns all %i existing files in order",
    async (n) => {
      const files = names(n);
      const { client, calls } = host(new Set(files));
      const out = await getFileContentsChunked(client, "a", "b", files);
      expect(out.map((item) => item.path)).toEqual(files);
      expect(Math.max(...calls.map((c) => c.length))).toBeLessThanOrEqual(30);
    },
  );

  it("still omits a path that is really missing from the middle", async () => {
    const files = names(60);
    const { client } = host(
      new Set(files.filter((path) => path !== "d/f45.bean")),
    );
    const out = await getFileContentsChunked(client, "a", "b", files);
    expect(out.map((item) => item.path)).toEqual(
      files.filter((path) => path !== "d/f45.bean"),
    );
  });

  it("makes no request for no files", async () => {
    const { client, calls } = host(new Set());
    expect(await getFileContentsChunked(client, "a", "b", [])).toEqual([]);
    expect(calls).toEqual([]);
  });
});

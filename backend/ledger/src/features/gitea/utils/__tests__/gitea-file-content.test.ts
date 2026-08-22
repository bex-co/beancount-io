import { Api as GiteaApi } from "@/features/gitea/client/gitea-api";
import { readGiteaFileText } from "../gitea-file-content";

describe("readGiteaFileText", () => {
  it("overrides the client's JSON default and streams a capped raw response", async () => {
    const response = new Response('option "title" "Streamed"\n');
    const clone = jest.spyOn(response, "clone");
    const client = new GiteaApi({
      baseUrl: "https://gitea.test/api/v1",
      baseApiParams: { format: "json" },
      customFetch: async () => response,
    });

    await expect(
      readGiteaFileText(
        client.repos,
        "alice",
        "book",
        "main.bean",
        { content: null, sha: "large-sha" },
        undefined,
        { maxBytes: 1024, requireUtf8: true },
      ),
    ).resolves.toBe('option "title" "Streamed"\n');
    expect(clone).not.toHaveBeenCalled();
  });
});

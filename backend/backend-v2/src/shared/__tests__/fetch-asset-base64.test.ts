import { fetchAssetAsBase64 } from "../fetch-asset-base64";

describe("fetchAssetAsBase64", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("strips the prefix from a data: URI and returns its base64 payload", async () => {
    const base64 = Buffer.from("hello").toString("base64");

    const result = await fetchAssetAsBase64(`data:text/plain;base64,${base64}`);

    expect(result).toBe(base64);
  });

  it("fetches a remote URL and returns base64 of the body", async () => {
    const bytes = Buffer.from("receipt-bytes");
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () =>
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length),
    }) as unknown as typeof fetch;

    const result = await fetchAssetAsBase64("https://example.com/receipt.png");

    expect(result).toBe(bytes.toString("base64"));
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/receipt.png",
    );
  });

  it("throws when the remote response is not ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as unknown as typeof fetch;

    await expect(
      fetchAssetAsBase64("https://example.com/missing.png"),
    ).rejects.toThrow("asset download failed with status 404");
  });
});

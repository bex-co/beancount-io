import {
  expectParity,
  firstDifference,
  ParityMismatchError,
  PYTHON_URL,
  V2_URL,
} from "../expect-parity";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Stub fetch so python/v2 return controlled payloads. */
function stubTargets(python: Response, v2: Response): jest.SpyInstance {
  return jest.spyOn(global, "fetch").mockImplementation((input) => {
    const url = String(input);
    if (url.startsWith(PYTHON_URL)) return Promise.resolve(python);
    if (url.startsWith(V2_URL)) return Promise.resolve(v2);
    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  });
}

describe("expectParity failure modes (the harness must not lie)", () => {
  afterEach(() => jest.restoreAllMocks());

  it("fails on status divergence even when bodies match", async () => {
    stubTargets(
      jsonResponse(200, { success: true, data: [] }),
      jsonResponse(500, { success: true, data: [] }),
    );
    await expect(
      expectParity({ operation: "listLedgers", path: "/ledgers" }),
    ).rejects.toThrow(ParityMismatchError);
  });

  it("compares error responses instead of skipping them", async () => {
    stubTargets(
      jsonResponse(404, {
        success: false,
        error: "repo not found",
        code: null,
        details: null,
      }),
      jsonResponse(404, {
        success: false,
        error: "Not Found",
        code: null,
        details: null,
      }),
    );
    await expect(
      expectParity({ operation: "getLedger", path: "/ledgers/x/y" }),
    ).rejects.toThrow(/diverges at \$\.error/);
  });

  it("labels the divergent path python/v2 in the failure message", async () => {
    stubTargets(
      jsonResponse(200, { success: true, data: { size: 1 } }),
      jsonResponse(200, { success: true, data: { size: 2 } }),
    );
    await expect(
      expectParity({ operation: "getLedger", path: "/ledgers/x/y" }),
    ).rejects.toThrow(/\$\.data\.size: python=1 v2=2/);
  });

  it("passes when the only differences are allowlisted (decimal scale)", async () => {
    stubTargets(
      jsonResponse(200, { success: true, data: { total: "100.00" } }),
      jsonResponse(200, { success: true, data: { total: "100" } }),
    );
    const res = await expectParity({
      operation: "getLedgerErrors",
      path: "/reports/x/y/errors",
    });
    expect(res.status).toBe(200);
  });

  it("treats a non-JSON body as raw text and still compares it", async () => {
    stubTargets(
      new Response("plain text", { status: 200 }),
      new Response("different text", { status: 200 }),
    );
    await expect(
      expectParity({
        operation: "plaintextJournal",
        path: "/journal/x/y/plaintext",
      }),
    ).rejects.toThrow(ParityMismatchError);
  });
});

describe("firstDifference", () => {
  it("reports missing keys with the owning side", () => {
    expect(firstDifference({ a: 1 }, { a: 1, b: 2 })).toMatch(
      /\$\.b: missing in python, present in v2/,
    );
  });
  it("reports array length divergence", () => {
    expect(firstDifference([1], [1, 2])).toMatch(/array length 1 vs 2/);
  });
  it("returns null for deep-equal payloads", () => {
    expect(
      firstDifference({ a: [{ b: "x" }] }, { a: [{ b: "x" }] }),
    ).toBeNull();
  });
});

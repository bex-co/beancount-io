const fetchMock = jest.fn();
jest.mock("node-fetch", () => ({
  __esModule: true,
  default: (...args: unknown[]) => fetchMock(...args),
}));

import { BadUserInputError } from "@/shared/errors";
import { streamLedgerArchive } from "../archive-proxy";

function context() {
  return {
    set: jest.fn(),
    throw: jest.fn(),
    body: undefined,
  } as any;
}

function layers() {
  return {
    database: {
      db: {},
      models: {
        user: {
          getById: jest.fn(),
          getUserByUsername: jest.fn(),
        },
      },
    },
  } as any;
}

describe("streamLedgerArchive", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      body: "archive-bytes",
    });
  });

  it("uses credential-free public access instead of the ledger owner's user", async () => {
    const appLayers = layers();
    const ctx = context();

    await streamLedgerArchive(
      ctx,
      appLayers,
      { favaApi: { baseUrl: "http://ledger.internal/" } } as any,
      {
        ledgerId: "alice/public-ledger",
        archive: "gitea-main.zip",
        userId: null,
      },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://ledger.internal/ledgers/alice/public-ledger/archive/gitea-main.zip",
      {
        method: "GET",
        headers: { Authorization: "Anonymous" },
      },
    );
    expect(appLayers.database.models.user.getById).not.toHaveBeenCalled();
    expect(
      appLayers.database.models.user.getUserByUsername,
    ).not.toHaveBeenCalled();
    expect(ctx.body).toBe("archive-bytes");
  });

  it("rejects traversal before making an upstream request", async () => {
    await expect(
      streamLedgerArchive(
        context(),
        layers(),
        { favaApi: { baseUrl: "http://ledger.internal" } } as any,
        {
          ledgerId: "alice/public-ledger",
          archive: "../../private-ledger",
          userId: null,
        },
      ),
    ).rejects.toBeInstanceOf(BadUserInputError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

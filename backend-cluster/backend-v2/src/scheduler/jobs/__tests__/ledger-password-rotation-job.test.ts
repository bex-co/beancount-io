import type { AppLayers } from "@/foundation/composition";
import { createLedgerPasswordRotationJob } from "../ledger-password-rotation-job";

jest.mock("@/shared/logger", () => {
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn(),
  };
  mockLogger.child.mockReturnValue(mockLogger);
  return { logger: mockLogger };
});

describe("ledger password rotation job", () => {
  const editUser = jest.fn();
  const getCandidates = jest.fn();
  const stageRotation = jest.fn();
  const completeRotation = jest.fn();

  function makeLayers(): AppLayers {
    return {
      database: {
        db: {},
        models: {
          user: {
            getLedgerPasswordRotationCandidates: getCandidates,
            stageLedgerPasswordRotation: stageRotation,
            completeLedgerPasswordRotation: completeRotation,
          },
        },
      },
      clients: {
        favaClientFactory: {
          getAdminClient: () => ({ admin: { editUser } }),
        },
      },
    } as unknown as AppLayers;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    getCandidates.mockResolvedValue([
      { id: "user-1", ledgerUsername: "alice" },
    ]);
    stageRotation.mockResolvedValue({
      ledgerUsername: "alice",
      ledgerPassword: "staged-secure-password",
    });
    editUser.mockResolvedValue(undefined);
    completeRotation.mockResolvedValue(true);
  });

  it("updates Gitea with the staged value before marking rotation complete", async () => {
    const layers = makeLayers();
    const job = createLedgerPasswordRotationJob(layers, {} as any);

    await job.task();

    expect(getCandidates).toHaveBeenCalledWith(layers.database.db, 100);
    expect(stageRotation).toHaveBeenCalledWith(
      layers.database.db,
      "user-1",
      expect.stringMatching(/^[A-Za-z0-9]{32}$/),
    );
    expect(editUser).toHaveBeenCalledWith("alice", {
      login_name: "alice",
      source_id: 0,
      password: "staged-secure-password",
    });
    expect(completeRotation).toHaveBeenCalledWith(
      layers.database.db,
      "user-1",
      "staged-secure-password",
    );
    expect(editUser.mock.invocationCallOrder[0]).toBeLessThan(
      completeRotation.mock.invocationCallOrder[0],
    );
  });

  it("leaves a staged rotation pending when Gitea rejects the update", async () => {
    editUser.mockRejectedValue(new Error("Gitea unavailable"));
    const job = createLedgerPasswordRotationJob(makeLayers(), {} as any);

    await expect(job.task()).resolves.toBeUndefined();

    expect(completeRotation).not.toHaveBeenCalled();
  });

  it("does not contact Gitea when no rows need rotation", async () => {
    getCandidates.mockResolvedValue([]);
    const job = createLedgerPasswordRotationJob(makeLayers(), {} as any);

    await job.task();

    expect(stageRotation).not.toHaveBeenCalled();
    expect(editUser).not.toHaveBeenCalled();
  });
});

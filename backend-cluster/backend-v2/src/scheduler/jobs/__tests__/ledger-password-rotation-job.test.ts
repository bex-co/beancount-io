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
  const tx = {};
  const editUser = jest.fn();
  const getCandidates = jest.fn();
  const getByIdForUpdate = jest.fn();
  const updateLedgerPassword = jest.fn();
  const transaction = jest.fn(async (callback) => callback(tx));

  function makeLayers(): AppLayers {
    return {
      database: {
        db: { transaction },
        models: {
          user: {
            getLedgerPasswordRotationCandidates: getCandidates,
            getByIdForUpdate,
            updateLedgerPassword,
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
    getCandidates.mockResolvedValue([{ id: "user-1" }]);
    getByIdForUpdate.mockResolvedValue({
      id: "user-1",
      ledger_username: "alice",
      ledger_password: "legacy-password",
    });
    editUser.mockResolvedValue(undefined);
    updateLedgerPassword.mockResolvedValue(undefined);
  });

  it("row-locks each legacy user while updating Gitea and Postgres", async () => {
    const layers = makeLayers();
    const job = createLedgerPasswordRotationJob(layers, {} as any);

    await job.task();

    expect(getCandidates).toHaveBeenCalledWith(
      layers.database.db,
      "v2_",
      100,
    );
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(getByIdForUpdate).toHaveBeenCalledWith(tx, "user-1");

    const password = editUser.mock.calls[0][1].password;
    expect(password).toMatch(/^v2_[A-Za-z0-9]{32}$/);
    expect(editUser).toHaveBeenCalledWith("alice", {
      login_name: "alice",
      source_id: 0,
      password,
    });
    expect(updateLedgerPassword).toHaveBeenCalledWith(tx, "user-1", password);
  });

  it("skips a row another worker already rotated", async () => {
    getByIdForUpdate.mockResolvedValue({
      id: "user-1",
      ledger_username: "alice",
      ledger_password: "v2_already-rotated",
    });
    const job = createLedgerPasswordRotationJob(makeLayers(), {} as any);

    await job.task();

    expect(editUser).not.toHaveBeenCalled();
    expect(updateLedgerPassword).not.toHaveBeenCalled();
  });

  it("leaves the database unchanged when Gitea rejects the update", async () => {
    editUser.mockRejectedValue(new Error("Gitea unavailable"));
    const job = createLedgerPasswordRotationJob(makeLayers(), {} as any);

    await expect(job.task()).resolves.toBeUndefined();

    expect(updateLedgerPassword).not.toHaveBeenCalled();
  });

  it("does nothing when all credentials are current", async () => {
    getCandidates.mockResolvedValue([]);
    const job = createLedgerPasswordRotationJob(makeLayers(), {} as any);

    await job.task();

    expect(transaction).not.toHaveBeenCalled();
    expect(editUser).not.toHaveBeenCalled();
  });
});

import { LedgerCollaboratorsWorkflow } from "../ledger-collaborators-workflow";
import {
  AUTHORIZATION_ACTIONS,
  ledgerResource,
} from "@/server/api/authorization";

const identity = {
  userId: "usr_admin",
  method: "session",
  scopes: new Set<string>(),
  capabilityExempt: true,
} as const;
const ledgerId = "owner/main";

describe("LedgerCollaboratorsWorkflow authorization", () => {
  const getPublicApiClient = jest.fn();
  const getApiContext = jest.fn();
  const getAdminClient = jest.fn();
  const authorizeOrThrow = jest.fn();
  const listLedgerCollaborators = jest.fn();
  const getLedgerCollaboratorPermission = jest.fn();
  const addOrUpdateLedgerCollaborator = jest.fn();
  const deleteLedgerCollaborator = jest.fn();
  let workflow: LedgerCollaboratorsWorkflow;

  beforeEach(() => {
    jest.clearAllMocks();
    authorizeOrThrow.mockResolvedValue({ allowed: true });
    listLedgerCollaborators.mockResolvedValue({
      data: { success: true, data: [] },
    });
    getLedgerCollaboratorPermission.mockResolvedValue({
      data: {
        success: true,
        data: { permission: "write", role_name: "Write" },
      },
    });
    addOrUpdateLedgerCollaborator.mockResolvedValue({
      data: { success: true },
    });
    deleteLedgerCollaborator.mockResolvedValue({
      data: { success: true },
    });
    const favaApiClient = {
      collaborators: {
        listLedgerCollaborators,
        getLedgerCollaboratorPermission,
        addOrUpdateLedgerCollaborator,
        deleteLedgerCollaborator,
      },
    };
    getPublicApiClient.mockResolvedValue(favaApiClient);
    getApiContext.mockResolvedValue({
      favaApiClient,
      favaUser: { username: "admin" },
    });
    getAdminClient.mockReturnValue(favaApiClient);
    workflow = new LedgerCollaboratorsWorkflow(
      { getPublicApiClient, getApiContext, getAdminClient } as never,
      {} as never,
      {} as never,
      {} as never,
      { authorizeOrThrow } as never,
    );
  });

  it.each([
    [
      AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_LIST,
      () => workflow.listCollaborators({ identity, ledgerId }),
    ],
    [
      AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_PERMISSION_READ,
      () =>
        workflow.getCollaboratorPermission({
          identity,
          ledgerId,
          collaborator: "reader",
        }),
    ],
    [
      AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_UPDATE,
      () =>
        workflow.addOrUpdateCollaborator({
          identity,
          ledgerId,
          collaborator: "reader",
          permission: "read",
        }),
    ],
    [
      AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_DELETE,
      () =>
        workflow.deleteCollaborator({
          identity,
          ledgerId,
          collaborator: "reader",
        }),
    ],
    [
      AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_LEAVE,
      () => workflow.leaveLedger({ identity, ledgerId }),
    ],
  ] as const)(
    "denies %s before client provisioning, quotas, or Gitea mutations",
    async (action, invoke) => {
      authorizeOrThrow.mockRejectedValueOnce(new Error("denied"));
      await expect(invoke()).rejects.toThrow("denied");
      expect(authorizeOrThrow).toHaveBeenCalledWith({
        principal: identity,
        action,
        resource: ledgerResource(ledgerId),
      });
      expect(getPublicApiClient).not.toHaveBeenCalled();
      expect(getApiContext).not.toHaveBeenCalled();
      expect(getAdminClient).not.toHaveBeenCalled();
      expect(listLedgerCollaborators).not.toHaveBeenCalled();
      expect(getLedgerCollaboratorPermission).not.toHaveBeenCalled();
      expect(addOrUpdateLedgerCollaborator).not.toHaveBeenCalled();
      expect(deleteLedgerCollaborator).not.toHaveBeenCalled();
    },
  );

  it("keeps collaborator reads behind the decision and preserves paging", async () => {
    await expect(
      workflow.listCollaborators({ identity, ledgerId, page: 3, limit: 20 }),
    ).resolves.toEqual([]);
    expect(authorizeOrThrow.mock.invocationCallOrder[0]).toBeLessThan(
      getPublicApiClient.mock.invocationCallOrder[0],
    );
    expect(listLedgerCollaborators).toHaveBeenCalledWith("owner", "main", {
      page: 3,
      limit: 20,
    });
  });

  it("preserves self-leave through the current user's source username", async () => {
    await expect(workflow.leaveLedger({ identity, ledgerId })).resolves.toEqual({
      success: true,
      message: "Removed self from repository successfully",
    });
    expect(deleteLedgerCollaborator).toHaveBeenCalledWith(
      "owner",
      "main",
      "admin",
    );
  });
});

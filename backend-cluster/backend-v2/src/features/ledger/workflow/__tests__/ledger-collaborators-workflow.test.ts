import { LedgerCollaboratorsWorkflow } from "../ledger-collaborators-workflow";
import {
  AUTHORIZATION_ACTIONS,
  ledgerResource,
} from "@/server/api/authorization";

const identity = {
  userId: "usr_admin",
  method: "session",
  scopes: new Set<string>(),
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
      { authorizeOrThrow } as never,
      {
        user: { getUserByUsername: jest.fn().mockResolvedValue(null) },
      } as never,
      {} as never,
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

  // w23/038: the host answers an out-of-range page or limit with its own.
  it.each([
    [1, 51],
    [0, 10],
    [1, 2.5],
  ])(
    "refuses page %p and limit %p before the decision or the host",
    async (page, limit) => {
      await expect(
        workflow.listCollaborators({ identity, ledgerId, page, limit }),
      ).rejects.toMatchObject({ category: "BAD_USER_INPUT" });
      expect(authorizeOrThrow).not.toHaveBeenCalled();
      expect(listLedgerCollaborators).not.toHaveBeenCalled();
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
    await expect(workflow.leaveLedger({ identity, ledgerId })).resolves.toEqual(
      {
        success: true,
        message: "Removed self from repository successfully",
        // w23/m13/t004: commits echo the flag off with no preview.
        dryRun: false,
      },
    );
    expect(deleteLedgerCollaborator).toHaveBeenCalledWith(
      "owner",
      "main",
      "admin",
    );
  });

  it("translates Gitea's unknown-user error into No such user", async () => {
    addOrUpdateLedgerCollaborator.mockRejectedValueOnce(
      new Error("user does not exist [uid: 0, name: ghost]"),
    );
    await expect(
      workflow.addOrUpdateCollaborator({
        identity,
        ledgerId,
        collaborator: "ghost",
        permission: "read",
      }),
    ).rejects.toMatchObject({
      name: "BadUserInputError",
      category: "BAD_USER_INPUT",
      message: "No such user: ghost",
    });
  });

  it("translates Gitea's unknown-user error on delete, and nothing else", async () => {
    deleteLedgerCollaborator.mockRejectedValueOnce(
      new Error("user does not exist [uid: 0, name: ghost]"),
    );
    await expect(
      workflow.deleteCollaborator({
        identity,
        ledgerId,
        collaborator: "ghost",
      }),
    ).rejects.toMatchObject({
      name: "BadUserInputError",
      category: "BAD_USER_INPUT",
      message: "No such user: ghost",
    });
    deleteLedgerCollaborator.mockRejectedValueOnce(new Error("upstream down"));
    await expect(
      workflow.deleteCollaborator({
        identity,
        ledgerId,
        collaborator: "ghost",
      }),
    ).rejects.toThrow("upstream down");
  });

  it("translates Gitea's unknown-user error on a permission read, and nothing else", async () => {
    getLedgerCollaboratorPermission.mockRejectedValueOnce(
      new Error("user does not exist [uid: 0, name: ghost]"),
    );
    await expect(
      workflow.getCollaboratorPermission({
        identity,
        ledgerId,
        collaborator: "ghost",
      }),
    ).rejects.toMatchObject({
      name: "BadUserInputError",
      category: "BAD_USER_INPUT",
      message: "No such user: ghost",
    });
    getLedgerCollaboratorPermission.mockRejectedValueOnce(
      new Error("upstream down"),
    );
    await expect(
      workflow.getCollaboratorPermission({
        identity,
        ledgerId,
        collaborator: "ghost",
      }),
    ).rejects.toThrow("upstream down");
  });

  it.each(["", "   "])(
    "refuses a blank collaborator name %j on update, delete and permission read before any upstream work",
    async (collaborator) => {
      await expect(
        workflow.addOrUpdateCollaborator({
          identity,
          ledgerId,
          collaborator,
          permission: "read",
        }),
      ).rejects.toMatchObject({ category: "BAD_USER_INPUT" });
      await expect(
        workflow.deleteCollaborator({ identity, ledgerId, collaborator }),
      ).rejects.toMatchObject({ category: "BAD_USER_INPUT" });
      await expect(
        workflow.getCollaboratorPermission({
          identity,
          ledgerId,
          collaborator,
        }),
      ).rejects.toMatchObject({ category: "BAD_USER_INPUT" });
      expect(getPublicApiClient).not.toHaveBeenCalled();
      expect(addOrUpdateLedgerCollaborator).not.toHaveBeenCalled();
      expect(deleteLedgerCollaborator).not.toHaveBeenCalled();
      expect(getLedgerCollaboratorPermission).not.toHaveBeenCalled();
    },
  );

  it("rethrows other collaborator-update failures unchanged", async () => {
    addOrUpdateLedgerCollaborator.mockRejectedValueOnce(
      new Error("team is full"),
    );
    await expect(
      workflow.addOrUpdateCollaborator({
        identity,
        ledgerId,
        collaborator: "ghost",
        permission: "read",
      }),
    ).rejects.toThrow("team is full");
  });

  it("echoes dryRun:false and no preview on a set commit", async () => {
    const result = await workflow.addOrUpdateCollaborator({
      identity,
      ledgerId,
      collaborator: "newbie",
      permission: "read",
    });

    expect(result.dryRun).toBe(false);
    expect(result.preview).toBeUndefined();
  });

  it("echoes dryRun:false and no preview on a remove commit", async () => {
    const result = await workflow.deleteCollaborator({
      identity,
      ledgerId,
      collaborator: "reader",
    });

    expect(result.dryRun).toBe(false);
    expect(result.preview).toBeUndefined();
  });

  it("renders a new grant and grants nothing on a set preview", async () => {
    const result = await workflow.addOrUpdateCollaborator({
      identity,
      ledgerId,
      collaborator: "newbie",
      permission: "read",
      input: { dryRun: true },
    });

    expect(addOrUpdateLedgerCollaborator).not.toHaveBeenCalled();
    expect(result.dryRun).toBe(true);
    expect(result.preview).toMatchObject({
      collaborator: "newbie",
      current: null,
      requested: "read",
    });
    expect(result.preview?.warnings).toEqual([
      "This would add newbie to owner/main with read access.",
      "If newbie names no known user, applying this would fail.",
    ]);
  });

  it("renders a permission change on a set preview for a member", async () => {
    listLedgerCollaborators.mockResolvedValueOnce({
      data: { success: true, data: [{ login: "reader" }] },
    });

    const result = await workflow.addOrUpdateCollaborator({
      identity,
      ledgerId,
      collaborator: "reader",
      permission: "admin",
      input: { dryRun: true },
    });

    expect(addOrUpdateLedgerCollaborator).not.toHaveBeenCalled();
    expect(result.preview).toMatchObject({
      collaborator: "reader",
      current: "write",
      requested: "admin",
    });
    expect(result.preview?.warnings).toEqual([
      "This would change reader's access to owner/main from write to admin.",
    ]);
  });

  it("renders the revocation and revokes nothing on a remove preview", async () => {
    const result = await workflow.deleteCollaborator({
      identity,
      ledgerId,
      collaborator: "reader",
      input: { dryRun: true },
    });

    expect(deleteLedgerCollaborator).not.toHaveBeenCalled();
    expect(result.dryRun).toBe(true);
    expect(result.preview).toMatchObject({
      collaborator: "reader",
      current: "write",
      requested: null,
    });
    expect(result.preview?.warnings).toEqual([
      "This would revoke reader's write access to owner/main.",
    ]);
  });

  it("says so when a remove preview cannot confirm current access", async () => {
    getLedgerCollaboratorPermission.mockRejectedValueOnce(
      new Error("upstream down"),
    );

    const result = await workflow.deleteCollaborator({
      identity,
      ledgerId,
      collaborator: "reader",
      input: { dryRun: true },
    });

    expect(deleteLedgerCollaborator).not.toHaveBeenCalled();
    expect(result.preview?.current).toBeNull();
    expect(result.preview?.warnings).toEqual([
      "This would revoke reader's access to owner/main, but no current access could be confirmed — the removal may fail if they hold no grant.",
    ]);
  });

  it("renders the self-removal and stays put on a leave preview", async () => {
    const result = await workflow.leaveLedger({
      identity,
      ledgerId,
      input: { dryRun: true },
    });

    expect(deleteLedgerCollaborator).not.toHaveBeenCalled();
    expect(result.dryRun).toBe(true);
    expect(result.preview).toMatchObject({
      collaborator: "admin",
      current: "write",
      requested: null,
    });
    expect(result.preview?.warnings).toEqual([
      "This would remove your (admin) write access to owner/main.",
    ]);
  });

  it.each([
    [
      "set",
      () =>
        workflow.addOrUpdateCollaborator({
          identity,
          ledgerId,
          collaborator: "newbie",
          permission: "read",
          input: { dryRun: true },
        }),
    ],
    [
      "remove",
      () =>
        workflow.deleteCollaborator({
          identity,
          ledgerId,
          collaborator: "reader",
          input: { dryRun: true },
        }),
    ],
    [
      "leave",
      () => workflow.leaveLedger({ identity, ledgerId, input: { dryRun: true } }),
    ],
  ] as const)(
    "authorizes before reading anything on a %s preview, like the commit",
    async (_op, invoke) => {
      authorizeOrThrow.mockRejectedValueOnce(new Error("denied"));
      await expect(invoke()).rejects.toThrow("denied");
      expect(getPublicApiClient).not.toHaveBeenCalled();
      expect(getApiContext).not.toHaveBeenCalled();
      expect(listLedgerCollaborators).not.toHaveBeenCalled();
      expect(getLedgerCollaboratorPermission).not.toHaveBeenCalled();
      expect(addOrUpdateLedgerCollaborator).not.toHaveBeenCalled();
      expect(deleteLedgerCollaborator).not.toHaveBeenCalled();
    },
  );
});

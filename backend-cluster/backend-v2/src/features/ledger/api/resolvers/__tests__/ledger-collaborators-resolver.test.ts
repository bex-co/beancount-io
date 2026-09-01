import "reflect-metadata";
import { LedgerCollaboratorsQueryResolver } from "../ledger-collaborators-resolver.query";
import { LedgerCollaboratorsMutationResolver } from "../ledger-collaborators-resolver.mutation";
import { IContext } from "@/server/graphql/context";
import { InternalServerError } from "@/shared/errors";

describe("LedgerCollaboratorsResolver", () => {
  const identity = {
    userId: "user-123",
    method: "session",
    scopes: new Set<string>(),
  } as const;
  let queryResolver: LedgerCollaboratorsQueryResolver;
  let mutationResolver: LedgerCollaboratorsMutationResolver;
  let mockContext: IContext;
  let mockCollaboratorsWorkflow: {
    addOrUpdateCollaborator: jest.Mock;
    deleteCollaborator: jest.Mock;
    listCollaborators: jest.Mock;
    getCollaboratorPermission: jest.Mock;
    leaveLedger: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockCollaboratorsWorkflow = {
      addOrUpdateCollaborator: jest.fn(),
      deleteCollaborator: jest.fn(),
      listCollaborators: jest.fn(),
      getCollaboratorPermission: jest.fn(),
      leaveLedger: jest.fn(),
    };

    mockContext = {
      userId: "user-123",
      token: "mock-token",
      reqHeaders: {},
      service: {} as any,
      config: {},
      getCurrentUserId: jest.fn().mockReturnValue("user-123"),
      getCurrentIdentity: jest.fn().mockReturnValue(identity),
    } as unknown as IContext;

    queryResolver = new LedgerCollaboratorsQueryResolver(
      mockCollaboratorsWorkflow as any,
    );
    mutationResolver = new LedgerCollaboratorsMutationResolver(
      mockCollaboratorsWorkflow as any,
    );
  });

  describe("listLedgerCollaborators", () => {
    const ledgerId = "testuser/test-ledger";

    it("should delegate to workflow and return result", async () => {
      const expected = [
        {
          id: 1,
          login: "user1",
          fullName: "User One",
          email: "user1@example.com",
          active: true,
          isAdmin: false,
          created: "2024-01-01T00:00:00Z",
          lastLogin: "2024-01-15T00:00:00Z",
          permission: "read" as const,
        },
        {
          id: 2,
          login: "user2",
          fullName: "User Two",
          email: "user2@example.com",
          active: true,
          isAdmin: true,
          created: "2024-01-02T00:00:00Z",
          lastLogin: "2024-01-16T00:00:00Z",
          permission: "write" as const,
        },
      ];

      mockCollaboratorsWorkflow.listCollaborators.mockResolvedValue(expected);

      const result = await queryResolver.listLedgerCollaborators(
        ledgerId,
        { page: 1, limit: 10 },
        mockContext,
      );

      expect(mockCollaboratorsWorkflow.listCollaborators).toHaveBeenCalledWith({
        identity,
        ledgerId,
        page: 1,
        limit: 10,
      });
      expect(result).toEqual(expected);
    });

    it("should pass undefined pagination when not provided", async () => {
      mockCollaboratorsWorkflow.listCollaborators.mockResolvedValue([]);

      await queryResolver.listLedgerCollaborators(ledgerId, {}, mockContext);

      expect(mockCollaboratorsWorkflow.listCollaborators).toHaveBeenCalledWith({
        identity,
        ledgerId,
        page: undefined,
        limit: undefined,
      });
    });

    it("should propagate errors thrown by the workflow", async () => {
      mockCollaboratorsWorkflow.listCollaborators.mockRejectedValue(
        new InternalServerError("Failed to fetch collaborators"),
      );

      await expect(
        queryResolver.listLedgerCollaborators(ledgerId, {}, mockContext),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("getLedgerCollaboratorPermission", () => {
    const ledgerId = "testuser/test-ledger";
    const collaborator = "collaborator1";

    it("should delegate to workflow and return result", async () => {
      const expected = {
        permission: "write",
        roleName: "Maintainer",
        user: {
          id: 1,
          login: "collaborator1",
          fullName: "Collaborator One",
          email: "collab1@example.com",
          active: true,
          isAdmin: false,
          created: "2024-01-01T00:00:00Z",
          lastLogin: "2024-01-15T00:00:00Z",
        },
      };

      mockCollaboratorsWorkflow.getCollaboratorPermission.mockResolvedValue(
        expected,
      );

      const result = await queryResolver.getLedgerCollaboratorPermission(
        { ledgerId, collaborator },
        mockContext,
      );

      expect(
        mockCollaboratorsWorkflow.getCollaboratorPermission,
      ).toHaveBeenCalledWith({
        identity,
        ledgerId,
        collaborator,
      });
      expect(result).toEqual(expected);
    });

    it("should propagate errors thrown by the workflow", async () => {
      mockCollaboratorsWorkflow.getCollaboratorPermission.mockRejectedValue(
        new InternalServerError("Failed to fetch collaborator permission"),
      );

      await expect(
        queryResolver.getLedgerCollaboratorPermission(
          { ledgerId, collaborator },
          mockContext,
        ),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("addOrUpdateLedgerCollaborator", () => {
    const ledgerId = "testuser/test-ledger";
    const collaborator = "newcollaborator";

    it("should delegate to workflow with correct params and return result", async () => {
      const expected = {
        success: true,
        message: "Collaborator added/updated successfully",
      };
      mockCollaboratorsWorkflow.addOrUpdateCollaborator.mockResolvedValue(
        expected,
      );

      const result = await mutationResolver.addOrUpdateLedgerCollaborator(
        { ledgerId, collaborator, permission: "write" },
        mockContext,
      );

      expect(
        mockCollaboratorsWorkflow.addOrUpdateCollaborator,
      ).toHaveBeenCalledWith({
        identity,
        ledgerId,
        collaborator,
        permission: "write",
      });
      expect(result).toEqual(expected);
    });

    it("should pass undefined permission when not provided", async () => {
      mockCollaboratorsWorkflow.addOrUpdateCollaborator.mockResolvedValue({
        success: true,
        message: "Collaborator added/updated successfully",
      });

      await mutationResolver.addOrUpdateLedgerCollaborator(
        { ledgerId, collaborator },
        mockContext,
      );

      expect(
        mockCollaboratorsWorkflow.addOrUpdateCollaborator,
      ).toHaveBeenCalledWith({
        identity,
        ledgerId,
        collaborator,
        permission: undefined,
      });
    });

    it("should propagate errors thrown by the workflow", async () => {
      mockCollaboratorsWorkflow.addOrUpdateCollaborator.mockRejectedValue(
        new InternalServerError("Maximum number of collaborators (1) reached"),
      );

      await expect(
        mutationResolver.addOrUpdateLedgerCollaborator(
          { ledgerId, collaborator, permission: "write" },
          mockContext,
        ),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("deleteLedgerCollaborator", () => {
    const ledgerId = "testuser/test-ledger";
    const collaborator = "oldcollaborator";

    it("should delegate to workflow with correct params and return result", async () => {
      const expected = {
        success: true,
        message: "Collaborator deleted successfully",
      };
      mockCollaboratorsWorkflow.deleteCollaborator.mockResolvedValue(expected);

      const result = await mutationResolver.deleteLedgerCollaborator(
        { ledgerId, collaborator },
        mockContext,
      );

      expect(mockCollaboratorsWorkflow.deleteCollaborator).toHaveBeenCalledWith(
        {
          identity,
          ledgerId,
          collaborator,
        },
      );
      expect(result).toEqual(expected);
    });

    it("should propagate errors thrown by the workflow", async () => {
      mockCollaboratorsWorkflow.deleteCollaborator.mockRejectedValue(
        new InternalServerError("Failed to delete collaborator"),
      );

      await expect(
        mutationResolver.deleteLedgerCollaborator(
          { ledgerId, collaborator },
          mockContext,
        ),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("leaveLedger", () => {
    const ledgerId = "testuser/test-ledger";

    it("should delegate to workflow and return result", async () => {
      const expected = {
        success: true,
        message: "Removed self from repository successfully",
      };
      mockCollaboratorsWorkflow.leaveLedger.mockResolvedValue(expected);

      const result = await mutationResolver.leaveLedger(
        { ledgerId },
        mockContext,
      );

      expect(mockCollaboratorsWorkflow.leaveLedger).toHaveBeenCalledWith({
        identity,
        ledgerId,
      });
      expect(result).toEqual(expected);
    });

    it("should propagate errors thrown by the workflow", async () => {
      mockCollaboratorsWorkflow.leaveLedger.mockRejectedValue(
        new InternalServerError("Failed to remove self from repository"),
      );

      await expect(
        mutationResolver.leaveLedger({ ledgerId }, mockContext),
      ).rejects.toThrow(InternalServerError);
    });
  });
});

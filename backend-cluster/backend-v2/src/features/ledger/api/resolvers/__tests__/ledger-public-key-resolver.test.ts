import "reflect-metadata";
import { LedgerPublicKeyMutationResolver } from "../ledger-public-key-resolver.mutation";
import { LedgerPublicKeyQueryResolver } from "../ledger-public-key-resolver.query";
import { IContext } from "@/server/graphql/context";
import { InternalServerError } from "@/shared/errors";

describe("LedgerPublicKeyResolver", () => {
  const identity = {
    userId: "user-123",
    method: "session",
    scopes: new Set<string>(),
    capabilityExempt: true,
  } as const;
  let mutationResolver: LedgerPublicKeyMutationResolver;
  let queryResolver: LedgerPublicKeyQueryResolver;
  let mockContext: IContext;
  let mockPublicKeyService: {
    listPublicKeys: jest.Mock;
    getPublicKey: jest.Mock;
    createPublicKey: jest.Mock;
    deletePublicKey: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockPublicKeyService = {
      listPublicKeys: jest.fn(),
      getPublicKey: jest.fn(),
      createPublicKey: jest.fn(),
      deletePublicKey: jest.fn(),
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

    mutationResolver = new LedgerPublicKeyMutationResolver(
      mockPublicKeyService as any,
    );
    queryResolver = new LedgerPublicKeyQueryResolver(
      mockPublicKeyService as any,
    );
  });

  describe("createPublicKey", () => {
    it("should delegate to service and return result", async () => {
      const expected = {
        id: 1,
        fingerprint: "SHA256:abc123",
        key: "ssh-rsa AAAAB3...",
        lastUsedAt: "2024-01-01T00:00:00Z",
        title: "My SSH Key",
        createdAt: "2024-01-01T00:00:00Z",
      };
      mockPublicKeyService.createPublicKey.mockResolvedValue(expected);

      const input = {
        key: "ssh-rsa AAAAB3...",
        title: "My SSH Key",
        readOnly: false,
      };
      const result = await mutationResolver.createPublicKey(input, mockContext);

      expect(mockPublicKeyService.createPublicKey).toHaveBeenCalledWith(
        identity,
        { key: "ssh-rsa AAAAB3...", title: "My SSH Key", readOnly: false },
      );
      expect(result).toEqual(expected);
    });

    it("should propagate errors thrown by the service", async () => {
      mockPublicKeyService.createPublicKey.mockRejectedValue(
        new InternalServerError("Failed to create public key"),
      );

      await expect(
        mutationResolver.createPublicKey(
          { key: "ssh-rsa AAAAB3...", title: "My SSH Key", readOnly: false },
          mockContext,
        ),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("listPublicKeys", () => {
    it("should delegate to service with pagination and return result", async () => {
      const expected = [
        {
          id: 1,
          fingerprint: "SHA256:abc123",
          key: "ssh-rsa AAAAB3...",
          lastUsedAt: "2024-01-01T00:00:00Z",
          title: "Key 1",
          createdAt: "2024-01-01T00:00:00Z",
        },
        {
          id: 2,
          fingerprint: "SHA256:def456",
          key: "ssh-rsa BBBBB4...",
          lastUsedAt: undefined,
          title: "Key 2",
          createdAt: "2024-01-02T00:00:00Z",
        },
      ];
      mockPublicKeyService.listPublicKeys.mockResolvedValue(expected);

      const result = await queryResolver.listPublicKeys(
        { page: 1, limit: 10 },
        mockContext,
      );

      expect(mockPublicKeyService.listPublicKeys).toHaveBeenCalledWith(
        identity,
        { page: 1, limit: 10 },
      );
      expect(result).toEqual(expected);
    });

    it("should pass undefined pagination when not provided", async () => {
      mockPublicKeyService.listPublicKeys.mockResolvedValue([]);

      await queryResolver.listPublicKeys({}, mockContext);

      expect(mockPublicKeyService.listPublicKeys).toHaveBeenCalledWith(
        identity,
        { page: undefined, limit: undefined },
      );
    });

    it("should propagate errors thrown by the service", async () => {
      mockPublicKeyService.listPublicKeys.mockRejectedValue(
        new InternalServerError("Failed to list public keys"),
      );

      await expect(
        queryResolver.listPublicKeys({}, mockContext),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("getPublicKey", () => {
    it("should delegate to service and return result", async () => {
      const expected = {
        id: 1,
        fingerprint: "SHA256:abc123",
        key: "ssh-rsa AAAAB3...",
        lastUsedAt: "2024-01-01T00:00:00Z",
        title: "My SSH Key",
        createdAt: "2024-01-01T00:00:00Z",
      };
      mockPublicKeyService.getPublicKey.mockResolvedValue(expected);

      const result = await queryResolver.getPublicKey(1, mockContext);

      expect(mockPublicKeyService.getPublicKey).toHaveBeenCalledWith(
        identity,
        1,
      );
      expect(result).toEqual(expected);
    });

    it("should propagate errors thrown by the service", async () => {
      mockPublicKeyService.getPublicKey.mockRejectedValue(
        new InternalServerError("Failed to get public key"),
      );

      await expect(queryResolver.getPublicKey(1, mockContext)).rejects.toThrow(
        InternalServerError,
      );
    });

    it("should work with different key IDs", async () => {
      const expected = {
        id: 42,
        fingerprint: "SHA256:xyz",
        key: "ssh-rsa ...",
        lastUsedAt: undefined,
        title: "Key",
        createdAt: "2024-01-01T00:00:00Z",
      };
      mockPublicKeyService.getPublicKey.mockResolvedValue(expected);

      const result = await queryResolver.getPublicKey(42, mockContext);

      expect(mockPublicKeyService.getPublicKey).toHaveBeenCalledWith(
        identity,
        42,
      );
      expect(result).toEqual(expected);
    });
  });

  describe("deletePublicKey", () => {
    it("should delegate to service and return result", async () => {
      const expected = { id: 1 };
      mockPublicKeyService.deletePublicKey.mockResolvedValue(expected);

      const result = await mutationResolver.deletePublicKey(1, mockContext);

      expect(mockPublicKeyService.deletePublicKey).toHaveBeenCalledWith(
        identity,
        1,
      );
      expect(result).toEqual(expected);
    });

    it("should propagate errors thrown by the service", async () => {
      mockPublicKeyService.deletePublicKey.mockRejectedValue(
        new InternalServerError("Failed to delete public key"),
      );

      await expect(
        mutationResolver.deletePublicKey(1, mockContext),
      ).rejects.toThrow(InternalServerError);
    });

    it("should work with different key IDs", async () => {
      mockPublicKeyService.deletePublicKey.mockResolvedValue({ id: 42 });

      const result = await mutationResolver.deletePublicKey(42, mockContext);

      expect(mockPublicKeyService.deletePublicKey).toHaveBeenCalledWith(
        identity,
        42,
      );
      expect(result.id).toBe(42);
    });
  });
});

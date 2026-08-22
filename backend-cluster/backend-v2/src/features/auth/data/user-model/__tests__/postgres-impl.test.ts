import "reflect-metadata";
import { UserPostgresModel } from "../postgres-impl";
import type { CreateUserInput } from "../types";

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
  compare: jest.fn(),
}));

import bcrypt from "bcryptjs";

const mockBcryptCompare = bcrypt.compare as jest.MockedFunction<
  typeof bcrypt.compare
>;

const mockDb = {
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
} as any;

const mockUserRow = {
  id: "user-id-1",
  password: "hashed-password",
  email: "user@example.com",
  ip: "127.0.0.1",
  avatar: null,
  locale: "en",
  firstName: "John",
  lastName: "Doe",
  isBlocked: false,
  ledger_username: "johndoe",
  ledger_password: "ledger-pass",
  ledger_api_token: null,
  createAt: new Date("2024-01-01"),
  updateAt: new Date("2024-01-01"),
};

describe("UserPostgresModel", () => {
  let model: UserPostgresModel;

  beforeEach(() => {
    model = new UserPostgresModel();
    // Reset all mock implementations before re-establishing chain mocks
    jest.resetAllMocks();
    mockDb.insert.mockReturnThis();
    mockDb.values.mockReturnThis();
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.limit.mockReturnThis();
    mockDb.update.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.delete.mockReturnThis();
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");
  });

  describe("getById", () => {
    it("should return null when not found", async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await model.getById(mockDb, "nonexistent");

      expect(result).toBeNull();
    });

    it("should return user when found", async () => {
      mockDb.limit.mockResolvedValue([mockUserRow]);

      const result = await model.getById(mockDb, "user-id-1");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("user-id-1");
      expect(result!.email).toBe("user@example.com");
      // avatarUrl computed from makeGravatar since avatar is null
      expect(result!.avatarUrl).toMatch(/gravatar\.com\/avatar\//);
    });
  });

  describe("getByMail", () => {
    it("should return null when not found", async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await model.getByMail(mockDb, "nobody@example.com");

      expect(result).toBeNull();
    });

    it("should return user when found", async () => {
      mockDb.limit.mockResolvedValue([mockUserRow]);

      const result = await model.getByMail(mockDb, "user@example.com");

      expect(result).not.toBeNull();
      expect(result!.email).toBe("user@example.com");
    });
  });

  describe("getUserByUsername", () => {
    it("should return null when not found", async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await model.getUserByUsername(mockDb, "nobody");

      expect(result).toBeNull();
    });

    it("should return user when found", async () => {
      mockDb.limit.mockResolvedValue([mockUserRow]);

      const result = await model.getUserByUsername(mockDb, "johndoe");

      expect(result).not.toBeNull();
      expect(result!.ledger_username).toBe("johndoe");
    });
  });

  describe("create", () => {
    it("should store password as-is, insert user, and return user with avatarUrl", async () => {
      const input: CreateUserInput = {
        password: "$2b$10$alreadyhashed",
        email: "new@example.com",
        ip: "10.0.0.1",
        ledger_username: "newuser",
        ledger_password: "ledger-pass",
        locale: "en",
      };

      mockDb.returning.mockResolvedValue([
        {
          ...mockUserRow,
          email: input.email,
          password: input.password,
          ledger_username: "newuser",
        },
      ]);

      const result = await model.create(mockDb, input);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          password: input.password,
          email: input.email,
          ledger_username: "newuser",
        }),
      );
      expect(result.email).toBe(input.email);
      expect(result.avatarUrl).toBeTruthy();
    });
  });

  describe("findUserByEmailOrUsername", () => {
    it("should return empty array when no users found", async () => {
      mockDb.where.mockResolvedValue([]);

      const result = await model.findUserByEmailOrUsername(
        mockDb,
        "nobody@example.com",
      );

      expect(result).toEqual([]);
    });

    it("should find users by email or username", async () => {
      mockDb.where.mockResolvedValue([mockUserRow]);

      const result = await model.findUserByEmailOrUsername(
        mockDb,
        "user@example.com",
      );

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe("user@example.com");
    });

    it("should deduplicate users when both email and username match", async () => {
      // Return the same user twice (simulating two matches)
      mockDb.where.mockResolvedValue([mockUserRow, mockUserRow]);

      const result = await model.findUserByEmailOrUsername(mockDb, "johndoe");

      expect(result).toHaveLength(1);
    });
  });

  describe("verifyPassword", () => {
    it("should return false when user not found", async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await model.verifyPassword(mockDb, "user1", "password");

      expect(result).toBe(false);
    });

    it("should return false when user has no password", async () => {
      mockDb.limit.mockResolvedValue([{ password: null }]);

      const result = await model.verifyPassword(mockDb, "user1", "password");

      expect(result).toBe(false);
    });

    it("should use bcrypt.compare and return its result", async () => {
      mockDb.limit.mockResolvedValue([{ password: "hashed-password" }]);
      (mockBcryptCompare as any).mockResolvedValue(true);

      const result = await model.verifyPassword(mockDb, "user1", "plain-pass");

      expect(bcrypt.compare).toHaveBeenCalledWith(
        "plain-pass",
        "hashed-password",
      );
      expect(result).toBe(true);
    });
  });

  describe("deleteByUserId", () => {
    it("should call delete with correct userId", async () => {
      await model.deleteByUserId(mockDb, "user1");

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe("updateUser", () => {
    it("should call update with the provided fields and updateAt", async () => {
      await model.updateUser(mockDb, "user1", { firstName: "Jane" });

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "Jane",
          updateAt: expect.any(Date),
        }),
      );
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe("updatePassword", () => {
    it("should hash the new password and call update", async () => {
      await model.updatePassword(mockDb, "user1", "new-password");

      expect(bcrypt.hash).toHaveBeenCalledWith("new-password", 10);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          password: "hashed-password",
          updateAt: expect.any(Date),
        }),
      );
    });
  });

  describe("updateLocale", () => {
    it("should update locale and updateAt", async () => {
      await model.updateLocale(mockDb, "user1", "zh");

      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          locale: "zh",
          updateAt: expect.any(Date),
        }),
      );
    });
  });

  describe("updateUsername", () => {
    it("should update ledger_username and updateAt", async () => {
      await model.updateUsername(mockDb, "user1", "newusername");

      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          ledger_username: "newusername",
          updateAt: expect.any(Date),
        }),
      );
    });
  });

  describe("updateFirstName", () => {
    it("should update firstName and updateAt", async () => {
      await model.updateFirstName(mockDb, "user1", "Alice");

      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "Alice",
          updateAt: expect.any(Date),
        }),
      );
    });
  });

  describe("updateLastName", () => {
    it("should update lastName and updateAt", async () => {
      await model.updateLastName(mockDb, "user1", "Smith");

      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          lastName: "Smith",
          updateAt: expect.any(Date),
        }),
      );
    });
  });
});

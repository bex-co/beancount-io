import "reflect-metadata";
import { validate } from "class-validator";
import { LedgerTemplate } from "@/features/ledger/workflow/ledger-workflow.types";
import {
  Permission,
  Ledger,
  LedgerFileContent,
  CreateLedgerInput,
  UpdateLedgerInput,
  CreateLedgerFileInput,
  UpdateLedgerFileInput,
  DeleteLedgerFileInput,
  RenameLedgerFileInput,
  ListLedgersArgs,
  SearchLedgersArgs,
  GetLedgerFileArgs,
  GetLedgerDirContentArgs,
  DeleteLedgerResponse,
  DeleteLedgerFileResponse,
  RenameLedgerFileResponse,
} from "../ledger-resolver.types";

describe("ledger-resolver.types", () => {
  describe("Permission", () => {
    it("should create a Permission object with all boolean fields", () => {
      const permission = new Permission();
      permission.admin = true;
      permission.pull = true;
      permission.push = false;

      expect(permission.admin).toBe(true);
      expect(permission.pull).toBe(true);
      expect(permission.push).toBe(false);
    });
  });

  describe("Ledger", () => {
    it("should create a Ledger object with all required fields", () => {
      const ledger = new Ledger();
      ledger.id = "test-id";
      ledger.name = "test-ledger";
      ledger.fullName = "user/test-ledger";
      ledger.sshUrl = "git@gitea:user/test-ledger.git";
      ledger.httpUrl = "https://gitea/user/test-ledger.git";
      ledger.empty = false;
      ledger.private = true;
      ledger.createdAt = "2024-01-01T00:00:00Z";
      ledger.updatedAt = "2024-01-02T00:00:00Z";
      ledger.size = 1024;

      expect(ledger.id).toBe("test-id");
      expect(ledger.name).toBe("test-ledger");
      expect(ledger.fullName).toBe("user/test-ledger");
      expect(ledger.private).toBe(true);
      expect(ledger.size).toBe(1024);
    });

    it("should allow optional fields to be undefined", () => {
      const ledger = new Ledger();
      ledger.id = "test-id";
      ledger.name = "test-ledger";
      ledger.fullName = "user/test-ledger";
      ledger.sshUrl = "git@gitea:user/test-ledger.git";
      ledger.httpUrl = "https://gitea/user/test-ledger.git";
      ledger.empty = false;
      ledger.private = true;
      ledger.createdAt = "2024-01-01T00:00:00Z";
      ledger.updatedAt = "2024-01-02T00:00:00Z";
      ledger.size = 1024;

      expect(ledger.permissions).toBeUndefined();
      expect(ledger.description).toBeUndefined();
    });

    it("should allow nullable description", () => {
      const ledger = new Ledger();
      ledger.id = "test-id";
      ledger.name = "test-ledger";
      ledger.fullName = "user/test-ledger";
      ledger.sshUrl = "git@gitea:user/test-ledger.git";
      ledger.httpUrl = "https://gitea/user/test-ledger.git";
      ledger.empty = false;
      ledger.private = true;
      ledger.createdAt = "2024-01-01T00:00:00Z";
      ledger.updatedAt = "2024-01-02T00:00:00Z";
      ledger.size = 1024;
      ledger.description = null;

      expect(ledger.description).toBeNull();
    });
  });

  describe("LedgerFileContent", () => {
    it("should create a LedgerFileContent object with required fields", () => {
      const fileContent = new LedgerFileContent();
      fileContent.name = "main.bean";
      fileContent.path = "/main.bean";
      fileContent.type = "file";
      fileContent.sha = "abc123";
      fileContent.size = 512;

      expect(fileContent.name).toBe("main.bean");
      expect(fileContent.path).toBe("/main.bean");
      expect(fileContent.type).toBe("file");
      expect(fileContent.sha).toBe("abc123");
      expect(fileContent.size).toBe(512);
    });

    it("should allow optional fields to be undefined", () => {
      const fileContent = new LedgerFileContent();
      fileContent.name = "main.bean";
      fileContent.path = "/main.bean";
      fileContent.type = "file";
      fileContent.sha = "abc123";
      fileContent.size = 512;

      expect(fileContent.content).toBeUndefined();
      expect(fileContent.encoding).toBeUndefined();
      expect(fileContent.lastCommitSha).toBeUndefined();
      expect(fileContent.lastCommitterDate).toBeUndefined();
      expect(fileContent.lastAuthorDate).toBeUndefined();
    });

    it("should accept all optional fields", () => {
      const fileContent = new LedgerFileContent();
      fileContent.name = "main.bean";
      fileContent.path = "/main.bean";
      fileContent.type = "file";
      fileContent.sha = "abc123";
      fileContent.size = 512;
      fileContent.content = "2024-01-01 * Opening";
      fileContent.encoding = "base64";
      fileContent.lastCommitSha = "commit123";
      fileContent.lastCommitterDate = "2024-01-01T00:00:00Z";
      fileContent.lastAuthorDate = "2024-01-01T00:00:00Z";

      expect(fileContent.content).toBe("2024-01-01 * Opening");
      expect(fileContent.encoding).toBe("base64");
      expect(fileContent.lastCommitSha).toBe("commit123");
    });
  });

  describe("CreateLedgerInput", () => {
    it("should validate correct input", async () => {
      const input = new CreateLedgerInput();
      input.name = "my-ledger";

      const errors = await validate(input);
      expect(errors).toHaveLength(0);
    });

    it("should fail validation for name with uppercase letters", async () => {
      const input = new CreateLedgerInput();
      input.name = "MyLedger";

      const errors = await validate(input);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.matches).toContain(
        "lowercase letters, numbers, hyphens, and underscores",
      );
    });

    it("should fail validation for name with spaces", async () => {
      const input = new CreateLedgerInput();
      input.name = "my ledger";

      const errors = await validate(input);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail validation for name exceeding 100 characters", async () => {
      const input = new CreateLedgerInput();
      input.name = "a".repeat(101);

      const errors = await validate(input);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.maxLength).toContain("100 characters");
    });

    it("should accept valid slug-like names", async () => {
      const validNames = [
        "my-ledger",
        "my_ledger",
        "my-ledger-2024",
        "123-ledger",
        "ledger123",
      ];

      for (const name of validNames) {
        const input = new CreateLedgerInput();
        input.name = name;
        const errors = await validate(input);
        expect(errors).toHaveLength(0);
      }
    });

    it("should accept optional description", async () => {
      const input = new CreateLedgerInput();
      input.name = "my-ledger";
      input.description = "A test ledger";

      const errors = await validate(input);
      expect(errors).toHaveLength(0);
    });

    it("should accept optional private flag", async () => {
      const input = new CreateLedgerInput();
      input.name = "my-ledger";
      input.private = true;

      const errors = await validate(input);
      expect(errors).toHaveLength(0);
    });

    it("should accept a supported ledger template", async () => {
      const input = new CreateLedgerInput();
      input.name = "my-ledger";
      input.template = LedgerTemplate.SAMPLE;

      const errors = await validate(input);
      expect(errors).toHaveLength(0);
    });
  });

  describe("UpdateLedgerInput", () => {
    it("should validate correct input with all fields", async () => {
      const input = new UpdateLedgerInput();
      input.name = "updated-ledger";
      input.description = "Updated description";
      input.private = true;

      const errors = await validate(input);
      expect(errors).toHaveLength(0);
    });

    it("should validate with only description", async () => {
      const input = new UpdateLedgerInput();
      input.description = "Only description updated";

      const errors = await validate(input);
      expect(errors).toHaveLength(0);
    });

    it("should validate with only private flag", async () => {
      const input = new UpdateLedgerInput();
      input.private = false;

      const errors = await validate(input);
      expect(errors).toHaveLength(0);
    });

    it("should validate with empty object (no updates)", async () => {
      const input = new UpdateLedgerInput();

      const errors = await validate(input);
      expect(errors).toHaveLength(0);
    });

    it("should fail validation for invalid name format", async () => {
      const input = new UpdateLedgerInput();
      input.name = "Invalid Name!";

      const errors = await validate(input);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail validation for name exceeding 100 characters", async () => {
      const input = new UpdateLedgerInput();
      input.name = "a".repeat(101);

      const errors = await validate(input);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("CreateLedgerFileInput", () => {
    it("should create input with required fields", () => {
      const input = new CreateLedgerFileInput();
      input.path = "accounts.bean";
      input.content = "; Accounts file";

      expect(input.path).toBe("accounts.bean");
      expect(input.content).toBe("; Accounts file");
      expect(input.message).toBeUndefined();
    });

    it("should accept optional message", () => {
      const input = new CreateLedgerFileInput();
      input.path = "accounts.bean";
      input.content = "; Accounts file";
      input.message = "Add accounts file";

      expect(input.message).toBe("Add accounts file");
    });
  });

  describe("UpdateLedgerFileInput", () => {
    it("should create input with required fields", () => {
      const input = new UpdateLedgerFileInput();
      input.path = "accounts.bean";
      input.content = "; Updated accounts file";
      input.sha = "abc123";

      expect(input.path).toBe("accounts.bean");
      expect(input.content).toBe("; Updated accounts file");
      expect(input.sha).toBe("abc123");
      expect(input.message).toBeUndefined();
    });

    it("should accept optional message", () => {
      const input = new UpdateLedgerFileInput();
      input.path = "accounts.bean";
      input.content = "; Updated accounts file";
      input.sha = "abc123";
      input.message = "Update accounts";

      expect(input.message).toBe("Update accounts");
    });
  });

  describe("DeleteLedgerFileInput", () => {
    it("should create input with required fields", () => {
      const input = new DeleteLedgerFileInput();
      input.path = "old-file.bean";
      input.sha = "abc123";

      expect(input.path).toBe("old-file.bean");
      expect(input.sha).toBe("abc123");
      expect(input.message).toBeUndefined();
    });

    it("should accept optional message", () => {
      const input = new DeleteLedgerFileInput();
      input.path = "old-file.bean";
      input.sha = "abc123";
      input.message = "Delete unused file";

      expect(input.message).toBe("Delete unused file");
    });
  });

  describe("RenameLedgerFileInput", () => {
    it("should create input with required fields", () => {
      const input = new RenameLedgerFileInput();
      input.oldPath = "old-name.bean";
      input.newPath = "new-name.bean";

      expect(input.oldPath).toBe("old-name.bean");
      expect(input.newPath).toBe("new-name.bean");
      expect(input.message).toBeUndefined();
    });

    it("should accept optional message", () => {
      const input = new RenameLedgerFileInput();
      input.oldPath = "old-name.bean";
      input.newPath = "new-name.bean";
      input.message = "Rename file";

      expect(input.message).toBe("Rename file");
    });
  });

  describe("ListLedgersArgs", () => {
    it("should create args with pagination fields", () => {
      const args = new ListLedgersArgs();
      args.page = 1;
      args.limit = 10;

      expect(args.page).toBe(1);
      expect(args.limit).toBe(10);
    });

    it("should allow undefined pagination fields", () => {
      const args = new ListLedgersArgs();

      expect(args.page).toBeUndefined();
      expect(args.limit).toBeUndefined();
    });
  });

  describe("SearchLedgersArgs", () => {
    it("should create args with query field", () => {
      const args = new SearchLedgersArgs();
      args.q = "test";

      expect(args.q).toBe("test");
    });

    it("should accept all optional search parameters", () => {
      const args = new SearchLedgersArgs();
      args.q = "test";
      args.topic = true;
      args.includeDesc = true;
      args.uid = 123;
      args.priorityOwnerId = 456;
      args.teamId = 789;
      args.starredBy = 101;
      args.private = true;
      args.isPrivate = true;
      args.template = false;
      args.archived = false;
      args.mode = "exact";
      args.exclusive = true;
      args.sort = "name";
      args.order = "asc";
      args.page = 1;
      args.limit = 20;

      expect(args.q).toBe("test");
      expect(args.topic).toBe(true);
      expect(args.includeDesc).toBe(true);
      expect(args.uid).toBe(123);
      expect(args.priorityOwnerId).toBe(456);
      expect(args.teamId).toBe(789);
      expect(args.starredBy).toBe(101);
      expect(args.private).toBe(true);
      expect(args.isPrivate).toBe(true);
      expect(args.template).toBe(false);
      expect(args.archived).toBe(false);
      expect(args.mode).toBe("exact");
      expect(args.exclusive).toBe(true);
      expect(args.sort).toBe("name");
      expect(args.order).toBe("asc");
      expect(args.page).toBe(1);
      expect(args.limit).toBe(20);
    });
  });

  describe("GetLedgerFileArgs", () => {
    it("should create args with path field", () => {
      const args = new GetLedgerFileArgs();
      args.path = "main.bean";

      expect(args.path).toBe("main.bean");
    });
  });

  describe("GetLedgerDirContentArgs", () => {
    it("should create args with dirPath field", () => {
      const args = new GetLedgerDirContentArgs();
      args.dirPath = "/subdir";

      expect(args.dirPath).toBe("/subdir");
    });

    it("should allow null dirPath", () => {
      const args = new GetLedgerDirContentArgs();
      args.dirPath = null;

      expect(args.dirPath).toBeNull();
    });

    it("should allow undefined dirPath", () => {
      const args = new GetLedgerDirContentArgs();

      expect(args.dirPath).toBeUndefined();
    });
  });

  describe("DeleteLedgerResponse", () => {
    it("should create response with ledgerId field", () => {
      const response = new DeleteLedgerResponse();
      response.ledgerId = "ledger-123";

      expect(response.ledgerId).toBe("ledger-123");
    });
  });

  describe("DeleteLedgerFileResponse", () => {
    it("should create response with path field", () => {
      const response = new DeleteLedgerFileResponse();
      response.path = "deleted-file.bean";

      expect(response.path).toBe("deleted-file.bean");
    });
  });

  describe("RenameLedgerFileResponse", () => {
    it("should create response with oldPath and newPath fields", () => {
      const response = new RenameLedgerFileResponse();
      response.oldPath = "old-name.bean";
      response.newPath = "new-name.bean";

      expect(response.oldPath).toBe("old-name.bean");
      expect(response.newPath).toBe("new-name.bean");
    });
  });
});

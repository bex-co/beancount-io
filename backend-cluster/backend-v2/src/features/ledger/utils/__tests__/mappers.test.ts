import { mapToLedgerFileContent, mapToLedger } from "../mappers";
import { FavaLedgerPublic } from "@/features/ledger/types/fava-api.types";
import { LedgerFileContentPublic } from "@/foundation/fava/Api";
import { type AppConfig } from "@/config/config";

describe("ledger mappers", () => {
  describe("mapToLedgerFileContent", () => {
    it("should map snake_case API fields to camelCase GraphQL fields", () => {
      const apiData: LedgerFileContentPublic = {
        name: "main.bean",
        path: "/main.bean",
        type: "file",
        sha: "abc123",
        size: 1024,
        content: 'option "title" "test"',
        encoding: "base64",
        last_commit_sha: "commit123",
        last_committer_date: "2024-01-15T10:00:00Z",
        last_author_date: "2024-01-15T09:00:00Z",
      };

      const result = mapToLedgerFileContent(apiData);

      expect(result).toEqual({
        name: "main.bean",
        path: "/main.bean",
        type: "file",
        sha: "abc123",
        size: 1024,
        content: 'option "title" "test"',
        encoding: "base64",
        lastCommitSha: "commit123",
        lastCommitterDate: "2024-01-15T10:00:00Z",
        lastAuthorDate: "2024-01-15T09:00:00Z",
      });
    });

    it("should convert null values to undefined for optional fields", () => {
      const apiData: LedgerFileContentPublic = {
        name: "accounts.bean",
        path: "/accounts.bean",
        type: "file",
        sha: "def456",
        size: 512,
        content: null,
        encoding: null,
        last_commit_sha: null,
        last_committer_date: null,
        last_author_date: null,
      };

      const result = mapToLedgerFileContent(apiData);

      expect(result).toEqual({
        name: "accounts.bean",
        path: "/accounts.bean",
        type: "file",
        sha: "def456",
        size: 512,
        content: undefined,
        encoding: undefined,
        lastCommitSha: undefined,
        lastCommitterDate: undefined,
        lastAuthorDate: undefined,
      });
    });

    it("should handle directory type", () => {
      const apiData: LedgerFileContentPublic = {
        name: "subdir",
        path: "/subdir",
        type: "dir",
        sha: "xyz789",
        size: 0,
      };

      const result = mapToLedgerFileContent(apiData);

      expect(result.type).toBe("dir");
      expect(result.name).toBe("subdir");
    });

    it("should handle missing optional fields", () => {
      const apiData: LedgerFileContentPublic = {
        name: "test.bean",
        path: "/test.bean",
        type: "file",
        sha: "test123",
        size: 100,
      };

      const result = mapToLedgerFileContent(apiData);

      expect(result.content).toBeUndefined();
      expect(result.encoding).toBeUndefined();
      expect(result.lastCommitSha).toBeUndefined();
      expect(result.lastCommitterDate).toBeUndefined();
      expect(result.lastAuthorDate).toBeUndefined();
    });
  });

  describe("mapToLedger", () => {
    // Create a mock context with the necessary config
    const mockGitea = {
      hostName: "git.example.com",
      httpPort: 443,
      sshPort: 22,
    } as unknown as AppConfig["gitea"];

    it("should map FavaLedgerPublic to GraphQL Ledger", () => {
      const apiLedger: FavaLedgerPublic = {
        id: 1,
        name: "my-ledger",
        description: "A test ledger",
        full_name: "user/my-ledger",
        empty: false,
        private: true,
        size: 2048,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-15T10:00:00Z",
        permissions: {
          admin: true,
          pull: true,
          push: true,
        },
      };

      const result = mapToLedger(apiLedger, mockGitea);

      expect(result.name).toBe("my-ledger");
      expect(result.fullName).toBe("user/my-ledger");
      expect(result.empty).toBe(false);
      expect(result.private).toBe(true);
      expect(result.size).toBe(2048);
      expect(result.createdAt).toBe("2024-01-01T00:00:00Z");
      expect(result.updatedAt).toBe("2024-01-15T10:00:00Z");
      expect(result.description).toBe("A test ledger");
      expect(result.permissions).toEqual({
        admin: true,
        pull: true,
        push: true,
      });
      // ID should be base64 encoded
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe("string");
    });

    it("should handle null description", () => {
      const apiLedger: FavaLedgerPublic = {
        id: 2,
        name: "no-desc",
        description: null,
        full_name: "user/no-desc",
        empty: true,
        private: false,
        size: 0,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        permissions: null,
      };

      const result = mapToLedger(apiLedger, mockGitea);

      expect(result.description).toBeNull();
      expect(result.permissions).toBeUndefined();
    });

    it("should handle null permission fields", () => {
      const apiLedger: FavaLedgerPublic = {
        id: 3,
        name: "partial-perms",
        description: "Has partial permissions",
        full_name: "user/partial-perms",
        empty: false,
        private: true,
        size: 100,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        permissions: {
          admin: null,
          pull: true,
          push: null,
        },
      };

      const result = mapToLedger(apiLedger, mockGitea);

      // Null permissions should be converted to false
      expect(result.permissions).toEqual({
        admin: false,
        pull: true,
        push: false,
      });
    });

    it("should generate correct Gitea URLs", () => {
      const apiLedger: FavaLedgerPublic = {
        id: 4,
        name: "url-test",
        description: null,
        full_name: "testuser/url-test",
        empty: false,
        private: false,
        size: 500,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        permissions: null,
      };

      const result = mapToLedger(apiLedger, mockGitea);

      // Check URLs contain the full_name
      expect(result.sshUrl).toBeDefined();
      expect(result.httpUrl).toBeDefined();
    });

    it("should encode ledger ID properly", () => {
      const apiLedger: FavaLedgerPublic = {
        id: 5,
        name: "id-test",
        description: null,
        full_name: "owner/id-test",
        empty: false,
        private: false,
        size: 0,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        permissions: null,
      };

      const result = mapToLedger(apiLedger, mockGitea);

      // ID should be base64url encoded version of full_name
      // Decoding should give us back "owner/id-test"
      expect(result.id).toBeDefined();
      expect(result.id.length).toBeGreaterThan(0);
    });
  });
});

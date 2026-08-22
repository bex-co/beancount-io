import {
  getAllOpenEntries,
  getAllCloseEntries,
  getAccountEntryCounts,
} from "../account-entries";
import type { FavaApiClient } from "@/foundation/fava";
import { DirectiveType } from "@/foundation/fava";

function makeSuccessResponse(items: unknown[], total: number) {
  return {
    data: {
      success: true,
      data: { items, total },
    },
  };
}

function makeFailureResponse() {
  return {
    data: { success: false },
  };
}

function makeMockJournalClient(
  responses: ReturnType<typeof makeSuccessResponse>[],
) {
  let callCount = 0;
  return {
    getJournal: jest.fn().mockImplementation(() => {
      const resp = responses[callCount] ?? responses[responses.length - 1];
      callCount++;
      return Promise.resolve(resp);
    }),
  };
}

describe("account-entries", () => {
  const owner = "testuser";
  const repoName = "my-book";

  describe("getAllOpenEntries", () => {
    it("should return all open entries when total fits in one page", async () => {
      const mockItems = [
        {
          directive_type: DirectiveType.Open,
          account: "Assets:Checking",
          date: "2020-01-01",
        },
        {
          directive_type: DirectiveType.Open,
          account: "Expenses:Food",
          date: "2020-01-01",
        },
      ];
      const journalClient = makeMockJournalClient([
        makeSuccessResponse(mockItems, 2),
      ]);
      const mockClient = { journal: journalClient } as unknown as FavaApiClient;

      const result = await getAllOpenEntries(mockClient, owner, repoName);

      expect(result).toHaveLength(2);
      expect(journalClient.getJournal).toHaveBeenCalledTimes(1);
      expect(journalClient.getJournal).toHaveBeenCalledWith(owner, repoName, {
        directive_types: [DirectiveType.Open],
        limit: 1000,
        offset: 0,
      });
    });

    it("should paginate when total exceeds page size", async () => {
      const firstPageItems = Array.from({ length: 1000 }, (_, i) => ({
        account: `Assets:Account${i}`,
        date: "2020-01-01",
      }));
      const secondPageItems = [
        { account: "Assets:Account1000", date: "2020-01-01" },
      ];

      const journalClient = {
        getJournal: jest
          .fn()
          .mockResolvedValueOnce(makeSuccessResponse(firstPageItems, 1001))
          .mockResolvedValueOnce(makeSuccessResponse(secondPageItems, 1001)),
      };
      const mockClient = { journal: journalClient } as unknown as FavaApiClient;

      const result = await getAllOpenEntries(mockClient, owner, repoName);

      expect(result).toHaveLength(1001);
      expect(journalClient.getJournal).toHaveBeenCalledTimes(2);
      // Second call should use offset=1000
      expect(journalClient.getJournal).toHaveBeenNthCalledWith(
        2,
        owner,
        repoName,
        {
          directive_types: [DirectiveType.Open],
          limit: 1000,
          offset: 1000,
        },
      );
    });

    it("should throw an error when API returns failure", async () => {
      const journalClient = {
        getJournal: jest.fn().mockResolvedValue(makeFailureResponse()),
      };
      const mockClient = { journal: journalClient } as unknown as FavaApiClient;

      await expect(
        getAllOpenEntries(mockClient, owner, repoName),
      ).rejects.toThrow("Failed to fetch Open entries");
    });

    it("should return empty array when total is 0", async () => {
      const journalClient = {
        getJournal: jest.fn().mockResolvedValue(makeSuccessResponse([], 0)),
      };
      const mockClient = { journal: journalClient } as unknown as FavaApiClient;

      const result = await getAllOpenEntries(mockClient, owner, repoName);

      expect(result).toHaveLength(0);
    });
  });

  describe("getAllCloseEntries", () => {
    it("should return all close entries", async () => {
      const mockItems = [
        {
          directive_type: DirectiveType.Close,
          account: "Assets:OldAccount",
          date: "2023-12-31",
        },
      ];
      const journalClient = {
        getJournal: jest
          .fn()
          .mockResolvedValue(makeSuccessResponse(mockItems, 1)),
      };
      const mockClient = { journal: journalClient } as unknown as FavaApiClient;

      const result = await getAllCloseEntries(mockClient, owner, repoName);

      expect(result).toHaveLength(1);
      expect(journalClient.getJournal).toHaveBeenCalledWith(owner, repoName, {
        directive_types: [DirectiveType.Close],
        limit: 1000,
        offset: 0,
      });
    });

    it("should throw an error when API returns failure", async () => {
      const journalClient = {
        getJournal: jest.fn().mockResolvedValue(makeFailureResponse()),
      };
      const mockClient = { journal: journalClient } as unknown as FavaApiClient;

      await expect(
        getAllCloseEntries(mockClient, owner, repoName),
      ).rejects.toThrow("Failed to fetch Close entries");
    });
  });

  describe("getAccountEntryCounts", () => {
    it("should return a map of account to count", async () => {
      const shellClient = {
        queryShell: jest.fn().mockResolvedValue({
          data: {
            data: {
              result: {
                rows: [
                  ["Assets:Checking", 42],
                  ["Expenses:Food", 15],
                  ["Income:Salary", 7],
                ],
              },
            },
          },
        }),
      };
      const mockClient = { shell: shellClient } as unknown as FavaApiClient;

      const result = await getAccountEntryCounts(mockClient, owner, repoName);

      expect(result.size).toBe(3);
      expect(result.get("Assets:Checking")).toBe(42);
      expect(result.get("Expenses:Food")).toBe(15);
      expect(result.get("Income:Salary")).toBe(7);
    });

    it("should use the correct BQL query", async () => {
      const shellClient = {
        queryShell: jest.fn().mockResolvedValue({
          data: {
            data: {
              result: { rows: [] },
            },
          },
        }),
      };
      const mockClient = { shell: shellClient } as unknown as FavaApiClient;

      await getAccountEntryCounts(mockClient, owner, repoName);

      expect(shellClient.queryShell).toHaveBeenCalledWith(owner, repoName, {
        query: "SELECT account, count(account) ORDER BY account",
      });
    });

    it("should return empty map when result has no rows field", async () => {
      const shellClient = {
        queryShell: jest.fn().mockResolvedValue({
          data: {
            data: {
              result: { columns: [] },
            },
          },
        }),
      };
      const mockClient = { shell: shellClient } as unknown as FavaApiClient;

      const result = await getAccountEntryCounts(mockClient, owner, repoName);

      expect(result.size).toBe(0);
    });

    it("should return empty map when result is null", async () => {
      const shellClient = {
        queryShell: jest.fn().mockResolvedValue({
          data: { data: { result: null } },
        }),
      };
      const mockClient = { shell: shellClient } as unknown as FavaApiClient;

      const result = await getAccountEntryCounts(mockClient, owner, repoName);

      expect(result.size).toBe(0);
    });

    it("should convert account and count to correct types", async () => {
      const shellClient = {
        queryShell: jest.fn().mockResolvedValue({
          data: {
            data: {
              result: {
                rows: [[123, "not-a-number"]],
              },
            },
          },
        }),
      };
      const mockClient = { shell: shellClient } as unknown as FavaApiClient;

      const result = await getAccountEntryCounts(mockClient, owner, repoName);

      // String() and Number() conversions are applied
      expect(result.get("123")).toBeNaN();
    });
  });
});

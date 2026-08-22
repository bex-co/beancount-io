import "reflect-metadata";
import {
  parseActivityContent,
  summarizeParsedContent,
} from "../activity-content-parser";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePushContent(overrides?: object): string {
  return JSON.stringify({
    Commits: [
      {
        Sha1: "abc123",
        Message: "Add entry\n",
        AuthorName: "Alice",
        AuthorEmail: "alice@example.com",
        CommitterName: "Alice",
        CommitterEmail: "alice@example.com",
        Timestamp: "2024-01-15T10:00:00Z",
      },
      {
        Sha1: "def456",
        Message: "Fix typo",
        AuthorName: "Bob",
        AuthorEmail: "bob@example.com",
        CommitterName: "Bob",
        CommitterEmail: "bob@example.com",
        Timestamp: "2024-01-15T11:00:00Z",
      },
    ],
    HeadCommit: {
      Sha1: "def456",
      Message: "Fix typo",
      AuthorName: "Bob",
      AuthorEmail: "bob@example.com",
      CommitterName: "Bob",
      CommitterEmail: "bob@example.com",
      Timestamp: "2024-01-15T11:00:00Z",
    },
    CompareURL: "https://git.example.com/compare/abc..def",
    Len: 2,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// parseActivityContent
// ---------------------------------------------------------------------------

describe("parseActivityContent", () => {
  describe("push-like op_types", () => {
    const pushOpTypes = [
      "commit_repo",
      "push_tag",
      "delete_tag",
      "delete_branch",
      "mirror_sync_push",
      "mirror_sync_create",
      "mirror_sync_delete",
    ];

    it.each(pushOpTypes)(
      'parses valid PushCommits JSON for op_type "%s"',
      (opType) => {
        const content = makePushContent();
        const result = parseActivityContent(opType, content);

        expect(result.kind).toBe("push");
        if (result.kind === "push") {
          expect(result.commits).toHaveLength(2);
          expect(result.commits[0]).toEqual({
            sha1: "abc123",
            message: "Add entry",
            authorName: "Alice",
            timestamp: "2024-01-15T10:00:00Z",
          });
          expect(result.headSha).toBe("def456");
          expect(result.compareUrl).toBe(
            "https://git.example.com/compare/abc..def",
          );
          expect(result.totalCount).toBe(2);
        }
      },
    );

    it("trims trailing newline from commit message", () => {
      const result = parseActivityContent("commit_repo", makePushContent());
      expect(result.kind).toBe("push");
      if (result.kind === "push") {
        expect(result.commits[0].message).toBe("Add entry");
      }
    });

    it("falls back to raw when content is not valid JSON", () => {
      const result = parseActivityContent("commit_repo", "not json");
      expect(result).toEqual({ kind: "raw", text: "not json" });
    });

    it("falls back to raw when Commits field is missing", () => {
      const result = parseActivityContent(
        "commit_repo",
        JSON.stringify({ Len: 0 }),
      );
      expect(result).toEqual({ kind: "raw", text: JSON.stringify({ Len: 0 }) });
    });

    it("handles empty Commits array", () => {
      const content = makePushContent({ Commits: [], Len: 0 });
      const result = parseActivityContent("commit_repo", content);
      expect(result.kind).toBe("push");
      if (result.kind === "push") {
        expect(result.commits).toHaveLength(0);
        expect(result.headSha).toBe("def456");
        expect(result.totalCount).toBe(0);
      }
    });
  });

  describe("issue/PR op_types", () => {
    const issueOpTypes = [
      "create_issue",
      "create_pull_request",
      "close_issue",
      "reopen_issue",
      "close_pull_request",
      "reopen_pull_request",
      "merge_pull_request",
      "auto_merge_pull_request",
      "comment_issue",
      "comment_pull",
      "approve_pull_request",
      "reject_pull_request",
      "pull_request_ready_for_review",
    ];

    it.each(issueOpTypes)(
      'parses "IssueIndex|Title" format for op_type "%s"',
      (opType) => {
        const result = parseActivityContent(opType, "42|Fix transaction date");

        expect(result.kind).toBe("issue");
        if (result.kind === "issue") {
          expect(result.issueIndex).toBe(42);
          expect(result.title).toBe("Fix transaction date");
          expect(result.extra).toBeUndefined();
        }
      },
    );

    it("parses issue with empty title (close/reopen pattern)", () => {
      const result = parseActivityContent("close_issue", "7|");

      expect(result.kind).toBe("issue");
      if (result.kind === "issue") {
        expect(result.issueIndex).toBe(7);
        expect(result.title).toBe("");
      }
    });

    it("parses pull_review_dismissed with 3 parts", () => {
      const result = parseActivityContent(
        "pull_review_dismissed",
        "15|alice|Looks good overall",
      );

      expect(result.kind).toBe("issue");
      if (result.kind === "issue") {
        expect(result.issueIndex).toBe(15);
        expect(result.title).toBe("alice");
        expect(result.extra).toBe("Looks good overall");
      }
    });

    it("falls back to raw when first segment is not a number", () => {
      const result = parseActivityContent("create_issue", "no-index|title");
      expect(result).toEqual({ kind: "raw", text: "no-index|title" });
    });

    it("falls back to raw for content without pipe delimiter", () => {
      const result = parseActivityContent("create_issue", "plain text");
      expect(result).toEqual({ kind: "raw", text: "plain text" });
    });
  });

  describe("repo lifecycle and other op_types", () => {
    const otherOpTypes = [
      "create_repo",
      "rename_repo",
      "star_repo",
      "watch_repo",
      "transfer_repo",
      "publish_release",
    ];

    it.each(otherOpTypes)('returns raw content for op_type "%s"', (opType) => {
      const result = parseActivityContent(opType, "some content");
      expect(result).toEqual({ kind: "raw", text: "some content" });
    });
  });

  describe("edge cases", () => {
    it("returns empty raw for undefined op_type", () => {
      expect(parseActivityContent(undefined, "content")).toEqual({
        kind: "raw",
        text: "content",
      });
    });

    it("returns empty raw for undefined content", () => {
      expect(parseActivityContent("commit_repo", undefined)).toEqual({
        kind: "raw",
        text: "",
      });
    });

    it("returns empty raw for empty content", () => {
      expect(parseActivityContent("commit_repo", "")).toEqual({
        kind: "raw",
        text: "",
      });
    });
  });
});

// ---------------------------------------------------------------------------
// summarizeParsedContent
// ---------------------------------------------------------------------------

describe("summarizeParsedContent", () => {
  it("shows first line of each commit message", () => {
    const parsed = parseActivityContent("commit_repo", makePushContent());
    const summary = summarizeParsedContent(parsed);
    expect(summary).toBe("Add entry\nFix typo");
  });

  it("uses only the first line of multi-line commit messages", () => {
    const content = makePushContent({
      Commits: [
        {
          Sha1: "aaa",
          Message: "Subject line\n\nBody of the commit",
          AuthorName: "Alice",
          AuthorEmail: "a@b.com",
          CommitterName: "Alice",
          CommitterEmail: "a@b.com",
          Timestamp: "2024-01-01T00:00:00Z",
        },
      ],
      Len: 1,
    });
    const parsed = parseActivityContent("commit_repo", content);
    expect(summarizeParsedContent(parsed)).toBe("Subject line");
  });

  it("appends remainder count when commits exceed maxCommits", () => {
    const content = JSON.stringify({
      Commits: Array.from({ length: 5 }, (_, i) => ({
        Sha1: `sha${i}`,
        Message: `Commit ${i + 1}`,
        AuthorName: "Alice",
        AuthorEmail: "a@b.com",
        CommitterName: "Alice",
        CommitterEmail: "a@b.com",
        Timestamp: "2024-01-01T00:00:00Z",
      })),
      HeadCommit: null,
      CompareURL: "",
      Len: 5,
    });
    const parsed = parseActivityContent("commit_repo", content);
    const summary = summarizeParsedContent(parsed, 3);
    expect(summary).toBe("Commit 1\nCommit 2\nCommit 3\n+2 more commit(s)");
  });

  it("returns empty string for push with no commits", () => {
    const content = makePushContent({ Commits: [], Len: 0 });
    const parsed = parseActivityContent("commit_repo", content);
    expect(summarizeParsedContent(parsed)).toBe("");
  });

  it("formats issue content with index and title", () => {
    const parsed = parseActivityContent(
      "create_issue",
      "42|Fix transaction date",
    );
    expect(summarizeParsedContent(parsed)).toBe("#42: Fix transaction date");
  });

  it("formats issue content with index only when title is empty", () => {
    const parsed = parseActivityContent("close_issue", "7|");
    expect(summarizeParsedContent(parsed)).toBe("#7");
  });

  it("formats pull_review_dismissed with extra field", () => {
    const parsed = parseActivityContent(
      "pull_review_dismissed",
      "15|alice|Looks good",
    );
    expect(summarizeParsedContent(parsed)).toBe("#15: alice — Looks good");
  });

  it("returns raw text as-is", () => {
    const parsed = parseActivityContent("create_repo", "Created new repo");
    expect(summarizeParsedContent(parsed)).toBe("Created new repo");
  });
});

import { COMMIT_READS } from "../../api/commit-reads";
import {
  CommitsService,
  MAX_COMMITS_PAGE_SIZE,
  isMissingCommitLookupError,
  stripCommitMetadata,
  parseFileStatsFromDiff,
  commitFileChanges,
} from "../commits-service";
import {
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from "@/shared/errors";

describe("CommitsService authorization", () => {
  it("denies before provisioning a Gitea client", async () => {
    const getUserApiClient = jest.fn();
    const getAnonymousApiClient = jest.fn();
    const service = new CommitsService(
      { getUserApiClient, getAnonymousApiClient } as never,
      {
        authorizeOrThrow: jest.fn().mockRejectedValue(new Error("denied")),
      } as never,
    );

    await expect(
      service.listCommits({
        identity: {
          userId: "usr_1",
          method: "session",
          scopes: new Set(),
        },
        ledgerId: "alice/main",
      }),
    ).rejects.toThrow("denied");
    expect(getUserApiClient).not.toHaveBeenCalled();
    expect(getAnonymousApiClient).not.toHaveBeenCalled();
  });
});

describe("CommitsService.getCommitDetails missing revisions", () => {
  const identity = {
    userId: "usr_1",
    method: "session" as const,
    scopes: new Set<string>(),
  };
  const sha = "0000000000000000000000000000000000000000";

  function serviceWithHistory(history: jest.Mock) {
    return new CommitsService(
      {
        getUserApiClient: jest.fn().mockResolvedValue({
          repos: {
            repoGetAllCommits: history,
            repoDownloadCommitDiffOrPatch: jest.fn(),
          },
        }),
        getAnonymousApiClient: jest.fn(),
      } as never,
      { authorizeOrThrow: jest.fn().mockResolvedValue(undefined) } as never,
    );
  }

  it("maps an empty commits list to NotFoundError", async () => {
    const history = jest.fn().mockResolvedValue({ data: [] });
    const service = serviceWithHistory(history);
    await expect(
      service.getCommitDetails({ identity, ledgerId: "alice/main", sha }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("maps a Gitea 404 Response to NotFoundError", async () => {
    const response = new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
    const history = jest.fn().mockRejectedValue(response);
    const service = serviceWithHistory(history);
    await expect(
      service.getCommitDetails({ identity, ledgerId: "alice/main", sha }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("maps a Gitea 500 absence-shaped Response to NotFoundError", async () => {
    const response = Object.assign(
      new Response(null, { status: 500, statusText: "Internal Server Error" }),
      { error: { message: "object does not exist" } },
    );
    const history = jest.fn().mockRejectedValue(response);
    const service = serviceWithHistory(history);
    await expect(
      service.getCommitDetails({ identity, ledgerId: "alice/main", sha }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("preserves preexisting DomainError instances", async () => {
    const history = jest
      .fn()
      .mockRejectedValue(new ForbiddenError("Ledger is private"));
    const service = serviceWithHistory(history);
    await expect(
      service.getCommitDetails({ identity, ledgerId: "alice/main", sha }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("keeps genuine upstream outages as InternalServerError", async () => {
    const response = new Response(null, {
      status: 503,
      statusText: "Service Unavailable",
    });
    const history = jest.fn().mockRejectedValue(response);
    const service = serviceWithHistory(history);
    await expect(
      service.getCommitDetails({ identity, ledgerId: "alice/main", sha }),
    ).rejects.toBeInstanceOf(InternalServerError);
  });
});

describe("CommitsService.listCommits paging bounds", () => {
  it.each([
    { page: 0 },
    { page: -1 },
    { limit: 0 },
    { limit: -1 },
    { page: 1.5 },
  ])("refuses %j as bad input before any Gitea call", async (paging) => {
    const history = jest.fn();
    const service = new CommitsService(
      {
        getUserApiClient: jest.fn().mockResolvedValue({
          repos: { repoGetAllCommits: history },
        }),
        getAnonymousApiClient: jest.fn(),
      } as never,
      { authorizeOrThrow: jest.fn().mockResolvedValue(undefined) } as never,
    );
    await expect(
      service.listCommits({
        identity: { userId: "usr_1", method: "session", scopes: new Set() },
        ledgerId: "alice/main",
        ...paging,
      }),
    ).rejects.toMatchObject({ category: "BAD_USER_INPUT" });
    expect(history).not.toHaveBeenCalled();
  });

  // w23/102: Gitea computes (page - 1) * limit in int32 — one past
  // 2,147,483,647 overflows and the hop 500s. Bisected on production:
  // page=214748365 at limit=10 (offset 2,147,483,640) answers, one more
  // page (offset 2,147,483,650) does not.
  it.each([
    { page: 214748366, limit: 10 },
    { page: 42949674, limit: 50 },
  ])(
    "answers the empty page past the int32 offset without hopping (%j)",
    async (paging) => {
      const history = jest.fn();
      const authorizeOrThrow = jest.fn().mockResolvedValue(undefined);
      const service = new CommitsService(
        {
          getUserApiClient: jest.fn().mockResolvedValue({
            repos: { repoGetAllCommits: history },
          }),
          getAnonymousApiClient: jest.fn(),
        } as never,
        { authorizeOrThrow } as never,
      );
      await expect(
        service.listCommits({
          identity: {
            userId: "usr_1",
            method: "session",
            scopes: new Set(),
          },
          ledgerId: "alice/main",
          ...paging,
        }),
      ).resolves.toEqual([]);
      expect(authorizeOrThrow).toHaveBeenCalled();
      expect(history).not.toHaveBeenCalled();
    },
  );

  it.each([
    { page: 214748365, limit: 10 },
    { page: 42949673, limit: 50 },
  ])("still hops at the largest in-range offset (%j)", async (paging) => {
    const history = jest.fn().mockResolvedValue({ data: [] });
    const service = new CommitsService(
      {
        getUserApiClient: jest.fn().mockResolvedValue({
          repos: { repoGetAllCommits: history },
        }),
        getAnonymousApiClient: jest.fn(),
      } as never,
      { authorizeOrThrow: jest.fn().mockResolvedValue(undefined) } as never,
    );
    await expect(
      service.listCommits({
        identity: { userId: "usr_1", method: "session", scopes: new Set() },
        ledgerId: "alice/main",
        ...paging,
      }),
    ).resolves.toEqual([]);
    expect(history).toHaveBeenCalledTimes(1);
  });
});

describe("CommitsService.listCommits unknown branches", () => {
  const identity = {
    userId: "usr_1",
    method: "session" as const,
    scopes: new Set<string>(),
  };
  const list = (history: jest.Mock) =>
    new CommitsService(
      {
        getUserApiClient: jest.fn().mockResolvedValue({
          repos: { repoGetAllCommits: history },
        }),
        getAnonymousApiClient: jest.fn(),
      } as never,
      { authorizeOrThrow: jest.fn().mockResolvedValue(undefined) } as never,
    ).listCommits({ identity, ledgerId: "alice/main", branch: "feature/x" });

  it("maps a Gitea 404 Response to NotFoundError naming the branch", async () => {
    const failure = await list(
      jest
        .fn()
        .mockRejectedValue(
          new Response(null, { status: 404, statusText: "Not Found" }),
        ),
    ).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(NotFoundError);
    expect((failure as Error).message).toContain("feature/x");
    expect((failure as Error).message).not.toContain("[object Response]");
  });

  it("keeps a genuine outage as InternalServerError without stringifying the Response", async () => {
    const failure = await list(
      jest
        .fn()
        .mockRejectedValue(
          new Response(null, { status: 503, statusText: "Unavailable" }),
        ),
    ).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(InternalServerError);
    expect((failure as Error).message).not.toContain("[object Response]");
  });

  it("preserves preexisting DomainError instances", async () => {
    await expect(
      list(
        jest.fn().mockRejectedValue(new ForbiddenError("Ledger is private")),
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("isMissingCommitLookupError", () => {
  it("recognizes 404 and absence-shaped 500 responses only", () => {
    expect(
      isMissingCommitLookupError(new Response(null, { status: 404 })),
    ).toBe(true);
    expect(
      isMissingCommitLookupError(
        Object.assign(new Response(null, { status: 500 }), {
          error: { message: "object does not exist" },
        }),
      ),
    ).toBe(true);
    expect(
      isMissingCommitLookupError(new Response(null, { status: 503 })),
    ).toBe(false);
    expect(
      isMissingCommitLookupError(
        Object.assign(new Response(null, { status: 500 }), {
          error: { message: "database connection refused" },
        }),
      ),
    ).toBe(false);
  });
});

describe("stripCommitMetadata", () => {
  it("should extract clean diff from full git patch", () => {
    const gitPatch = `commit 283b786cb66dd85e0c767dcdc5565bcbe620d7aa
Author: un_ht7hcm3zq3yb <user@example.com>
Date:   Thu Dec 25 08:31:58 2025 +0000

    Add main.bean

diff --git a/main.bean b/main.bean
new file mode 100644
index 0000000..c802502
--- /dev/null
+++ b/main.bean
@@ -0,0 +1,50 @@
+content here`;

    const result = stripCommitMetadata(gitPatch);

    expect(result).toContain("diff --git a/main.bean b/main.bean");
    expect(result).toContain("new file mode 100644");
    expect(result).toContain("+content here");
    expect(result).not.toContain("commit 283b786");
    expect(result).not.toContain("Author:");
    expect(result).not.toContain("Date:");
    expect(result).not.toContain("Add main.bean");
  });

  it("should return empty string for patch without diff marker", () => {
    const gitPatch = `commit abc123
Author: test <test@example.com>
Date:   Mon Jan 1 12:00:00 2025 +0000

    Empty commit`;

    const result = stripCommitMetadata(gitPatch);
    expect(result).toBe("");
  });

  it("should handle empty string input", () => {
    expect(stripCommitMetadata("")).toBe("");
  });

  it("should handle whitespace-only input", () => {
    expect(stripCommitMetadata("   ")).toBe("");
    expect(stripCommitMetadata("\n\n")).toBe("");
    expect(stripCommitMetadata("\t\t")).toBe("");
  });

  it("should handle diff that starts immediately with diff --git", () => {
    const cleanDiff = `diff --git a/test.txt b/test.txt
index abc123..def456 100644
--- a/test.txt
+++ b/test.txt
@@ -1,3 +1,4 @@
 line 1
 line 2
+new line
 line 3`;

    const result = stripCommitMetadata(cleanDiff);
    expect(result).toBe(cleanDiff);
  });

  it("should handle multiple files in diff", () => {
    const gitPatch = `commit abc123
Author: test <test@example.com>
Date:   Mon Jan 1 12:00:00 2025 +0000

    Multiple file changes

diff --git a/file1.txt b/file1.txt
index 111..222 100644
--- a/file1.txt
+++ b/file1.txt
@@ -1 +1 @@
-old content
+new content
diff --git a/file2.txt b/file2.txt
new file mode 100644
index 0000000..abc123
--- /dev/null
+++ b/file2.txt
@@ -0,0 +1 @@
+file2 content`;

    const result = stripCommitMetadata(gitPatch);

    expect(result).toContain("diff --git a/file1.txt b/file1.txt");
    expect(result).toContain("diff --git a/file2.txt b/file2.txt");
    expect(result).toContain("+new content");
    expect(result).toContain("+file2 content");
    expect(result).not.toContain("commit abc123");
    expect(result).not.toContain("Multiple file changes");
  });

  it("should handle binary file diffs", () => {
    const gitPatch = `commit abc123
Author: test <test@example.com>
Date:   Mon Jan 1 12:00:00 2025 +0000

    Add binary file

diff --git a/image.png b/image.png
new file mode 100644
index 0000000..abc123
Binary files /dev/null and b/image.png differ`;

    const result = stripCommitMetadata(gitPatch);

    expect(result).toContain("diff --git a/image.png b/image.png");
    expect(result).toContain("Binary files /dev/null and b/image.png differ");
    expect(result).not.toContain("commit abc123");
  });

  it("should handle file deletions", () => {
    const gitPatch = `commit abc123
Author: test <test@example.com>
Date:   Mon Jan 1 12:00:00 2025 +0000

    Delete file

diff --git a/deleted.txt b/deleted.txt
deleted file mode 100644
index abc123..0000000
--- a/deleted.txt
+++ /dev/null
@@ -1,3 +0,0 @@
-line 1
-line 2
-line 3`;

    const result = stripCommitMetadata(gitPatch);

    expect(result).toContain("diff --git a/deleted.txt b/deleted.txt");
    expect(result).toContain("deleted file mode 100644");
    expect(result).not.toContain("commit abc123");
  });

  it("should handle file renames", () => {
    const gitPatch = `commit abc123
Author: test <test@example.com>
Date:   Mon Jan 1 12:00:00 2025 +0000

    Rename file

diff --git a/old-name.txt b/new-name.txt
similarity index 100%
rename from old-name.txt
rename to new-name.txt`;

    const result = stripCommitMetadata(gitPatch);

    expect(result).toContain("diff --git a/old-name.txt b/new-name.txt");
    expect(result).toContain("rename from old-name.txt");
    expect(result).toContain("rename to new-name.txt");
    expect(result).not.toContain("commit abc123");
  });
});

describe("parseFileStatsFromDiff", () => {
  it("should parse simple single-file diff", () => {
    const diff = `diff --git a/test.txt b/test.txt
index abc123..def456 100644
--- a/test.txt
+++ b/test.txt
@@ -1,3 +1,4 @@
 unchanged line
-removed line
+added line
 another unchanged`;

    const result = parseFileStatsFromDiff(diff);

    expect(result.size).toBe(1);
    expect(result.get("test.txt")).toEqual({
      additions: 1,
      deletions: 1,
      status: "modified",
      previousFilename: null,
    });
  });

  it("should parse multiple files in diff", () => {
    const diff = `diff --git a/file1.txt b/file1.txt
index 111..222 100644
--- a/file1.txt
+++ b/file1.txt
@@ -1,2 +1,3 @@
 line 1
+new line
 line 2
diff --git a/file2.txt b/file2.txt
index 333..444 100644
--- a/file2.txt
+++ b/file2.txt
@@ -1,3 +1,2 @@
 keep this
-delete this
 and this`;

    const result = parseFileStatsFromDiff(diff);

    expect(result.size).toBe(2);
    expect(result.get("file1.txt")).toEqual({
      additions: 1,
      deletions: 0,
      status: "modified",
      previousFilename: null,
    });
    expect(result.get("file2.txt")).toEqual({
      additions: 0,
      deletions: 1,
      status: "modified",
      previousFilename: null,
    });
  });

  it("should handle new file creation", () => {
    const diff = `diff --git a/new-file.txt b/new-file.txt
new file mode 100644
index 0000000..abc123
--- /dev/null
+++ b/new-file.txt
@@ -0,0 +1,5 @@
+line 1
+line 2
+line 3
+line 4
+line 5`;

    const result = parseFileStatsFromDiff(diff);

    expect(result.size).toBe(1);
    expect(result.get("new-file.txt")).toEqual({
      additions: 5,
      deletions: 0,
      status: "added",
      previousFilename: null,
    });
  });

  it("should handle file deletion", () => {
    const diff = `diff --git a/deleted.txt b/deleted.txt
deleted file mode 100644
index abc123..0000000
--- a/deleted.txt
+++ /dev/null
@@ -1,3 +0,0 @@
-line 1
-line 2
-line 3`;

    const result = parseFileStatsFromDiff(diff);

    expect(result.size).toBe(1);
    expect(result.get("deleted.txt")).toEqual({
      additions: 0,
      deletions: 3,
      status: "removed",
      previousFilename: null,
    });
  });

  it("should not count file header markers", () => {
    const diff = `diff --git a/test.txt b/test.txt
index abc..def 100644
--- a/test.txt
+++ b/test.txt
@@ -1,2 +1,2 @@
-old line
+new line`;

    const result = parseFileStatsFromDiff(diff);

    expect(result.size).toBe(1);
    expect(result.get("test.txt")).toEqual({
      additions: 1,
      deletions: 1,
      status: "modified",
      previousFilename: null,
    });
  });

  it("should handle files in subdirectories", () => {
    const diff = `diff --git a/src/components/Button.tsx b/src/components/Button.tsx
index 111..222 100644
--- a/src/components/Button.tsx
+++ b/src/components/Button.tsx
@@ -1,5 +1,6 @@
 import React from 'react';

+// New comment
 export function Button() {
   return <button>Click me</button>;
 }`;

    const result = parseFileStatsFromDiff(diff);

    expect(result.size).toBe(1);
    expect(result.get("src/components/Button.tsx")).toEqual({
      additions: 1,
      deletions: 0,
      status: "modified",
      previousFilename: null,
    });
  });

  it("should handle empty diff", () => {
    const result = parseFileStatsFromDiff("");
    expect(result.size).toBe(0);
  });

  it("should handle whitespace-only diff", () => {
    const result = parseFileStatsFromDiff("   \n\n  ");
    expect(result.size).toBe(0);
  });

  it("should handle diff with no changes (context only)", () => {
    const diff = `diff --git a/unchanged.txt b/unchanged.txt
index abc..def 100644
--- a/unchanged.txt
+++ b/unchanged.txt
@@ -1,3 +1,3 @@
 line 1
 line 2
 line 3`;

    const result = parseFileStatsFromDiff(diff);

    expect(result.size).toBe(1);
    expect(result.get("unchanged.txt")).toEqual({
      additions: 0,
      deletions: 0,
      status: "modified",
      previousFilename: null,
    });
  });

  it("should handle large diff with many changes", () => {
    // Build a diff with 100 additions and 50 deletions
    let diff = `diff --git a/large-file.txt b/large-file.txt
index abc..def 100644
--- a/large-file.txt
+++ b/large-file.txt
@@ -1,50 +1,100 @@\n`;

    for (let i = 0; i < 50; i++) {
      diff += `-old line ${i}\n`;
    }
    for (let i = 0; i < 100; i++) {
      diff += `+new line ${i}\n`;
    }

    const result = parseFileStatsFromDiff(diff);

    expect(result.size).toBe(1);
    expect(result.get("large-file.txt")).toEqual({
      additions: 100,
      deletions: 50,
      status: "modified",
      previousFilename: null,
    });
  });

  it("should handle binary file diff (no stats)", () => {
    const diff = `diff --git a/image.png b/image.png
new file mode 100644
index 0000000..abc123
Binary files /dev/null and b/image.png differ`;

    const result = parseFileStatsFromDiff(diff);

    expect(result.size).toBe(1);
    expect(result.get("image.png")).toEqual({
      additions: 0,
      deletions: 0,
      status: "added",
      previousFilename: null,
    });
  });

  it("should handle file with special characters in name", () => {
    const diff = `diff --git a/file with spaces.txt b/file with spaces.txt
index abc..def 100644
--- a/file with spaces.txt
+++ b/file with spaces.txt
@@ -1 +1,2 @@
 existing line
+new line`;

    const result = parseFileStatsFromDiff(diff);

    expect(result.size).toBe(1);
    expect(result.get("file with spaces.txt")).toEqual({
      additions: 1,
      deletions: 0,
      status: "modified",
      previousFilename: null,
    });
  });

  it("should handle Beancount file (.bean extension)", () => {
    const diff = `diff --git a/main.bean b/main.bean
index 111..222 100644
--- a/main.bean
+++ b/main.bean
@@ -1,5 +1,7 @@
 2025-01-01 open Assets:Bank:Checking

+2025-01-02 * "Grocery Store" "Weekly groceries"
+  Expenses:Food:Groceries    50.00 USD
-2025-01-03 close Assets:OldAccount

 2025-01-04 balance Assets:Bank:Checking  1000.00 USD`;

    const result = parseFileStatsFromDiff(diff);

    expect(result.size).toBe(1);
    expect(result.get("main.bean")).toEqual({
      additions: 2,
      deletions: 1,
      status: "modified",
      previousFilename: null,
    });
  });
});

// w21/132: a rename read as two untouched files, and an empty file's
// creation looked the same as its deletion.
describe("commit file status", () => {
  const rename = `diff --git a/qa-a.bean b/qa-c.bean
similarity index 100%
rename from qa-a.bean
rename to qa-c.bean
diff --git a/books.bean b/books.bean
index 111..222 100644
--- a/books.bean
+++ b/books.bean
@@ -1 +1,2 @@
 keep
++++ a line that reads like a header
`;

  it("names a rename, and counts content that looks like a header", () => {
    const stats = parseFileStatsFromDiff(rename);
    expect([...stats.keys()]).toEqual(["qa-c.bean", "books.bean"]);
    expect(stats.get("qa-c.bean")).toEqual({
      additions: 0,
      deletions: 0,
      status: "renamed",
      previousFilename: "qa-a.bean",
    });
    expect(stats.get("books.bean")?.additions).toBe(1);
  });

  it("collapses Gitea's removed + added pair into one renamed row", () => {
    expect(
      commitFileChanges(
        [
          { filename: "books.bean", status: "modified" },
          { filename: "qa-a.bean", status: "removed" },
          { filename: "qa-c.bean", status: "added" },
        ],
        parseFileStatsFromDiff(rename),
      ),
    ).toEqual([
      {
        filename: "books.bean",
        additions: 1,
        deletions: 0,
        status: "modified",
        previousFilename: null,
      },
      {
        filename: "qa-c.bean",
        additions: 0,
        deletions: 0,
        status: "renamed",
        previousFilename: "qa-a.bean",
      },
    ]);
  });

  it("tells an empty file's creation from its deletion", () => {
    const created = parseFileStatsFromDiff(
      "diff --git a/qa/n.bean b/qa/n.bean\nnew file mode 100644\nindex 0000000..e69de29\n",
    );
    const deleted = parseFileStatsFromDiff(
      "diff --git a/qa/n.bean b/qa/n.bean\ndeleted file mode 100644\nindex e69de29..0000000\n",
    );
    expect(created.get("qa/n.bean")?.status).toBe("added");
    expect(deleted.get("qa/n.bean")?.status).toBe("removed");
  });

  it("reads a path containing ' b/' from its header", () => {
    const stats = parseFileStatsFromDiff(
      "diff --git a/x b/y.bean b/x b/y.bean\n--- a/x b/y.bean\n+++ b/x b/y.bean\n@@ -0,0 +1 @@\n+z\n",
    );
    expect([...stats.keys()]).toEqual(["x b/y.bean"]);
  });

  it("falls back to Gitea's status when the diff is unavailable", () => {
    expect(
      commitFileChanges(
        [
          { filename: "a.bean", status: "added" },
          { filename: "b.bean", status: "deleted" },
          { filename: "c.bean" },
        ],
        new Map(),
      ).map((f) => f.status),
    ).toEqual(["added", "removed", "modified"]);
  });
});

// w21/133: the file name came from the first `b/` in the header, so a path
// under `lib/` or `web/` never matched, and header-looking content lines
// went uncounted.
describe("per-file counts the old parser missed", () => {
  it("keys a file under a directory ending in b by its real path", () => {
    const stats = parseFileStatsFromDiff(
      [
        "diff --git a/lib/x.bean b/lib/x.bean",
        "--- a/lib/x.bean",
        "+++ b/lib/x.bean",
        "@@ -1 +1 @@",
        "-old",
        "+new",
      ].join("\n"),
    );
    expect([...stats.keys()]).toEqual(["lib/x.bean"]);
    expect(stats.get("lib/x.bean")).toMatchObject({
      additions: 1,
      deletions: 1,
    });
  });

  it("counts a deleted --- line and an added ++ line", () => {
    const stats = parseFileStatsFromDiff(
      [
        "diff --git a/README.md b/README.md",
        "--- a/README.md",
        "+++ b/README.md",
        "@@ -1,2 +1,2 @@",
        " Title",
        "----",
        "+++note",
      ].join("\n"),
    );
    expect(stats.get("README.md")).toMatchObject({
      additions: 1,
      deletions: 1,
    });
  });

  it("names both sides of a rename whose paths contain b/", () => {
    const stats = parseFileStatsFromDiff(
      [
        "diff --git a/web/b/old.bean b/lib/b/new.bean",
        "similarity index 90%",
        "rename from web/b/old.bean",
        "rename to lib/b/new.bean",
        "--- a/web/b/old.bean",
        "+++ b/lib/b/new.bean",
        "@@ -1 +1 @@",
        "-a",
        "+b",
      ].join("\n"),
    );
    expect([...stats.keys()]).toEqual(["lib/b/new.bean"]);
    expect(stats.get("lib/b/new.bean")).toEqual({
      additions: 1,
      deletions: 1,
      status: "renamed",
      previousFilename: "web/b/old.bean",
    });
  });
});

// w21/314: Gitea silently caps a commit page at 50, so a larger `limit` returned
// 50 and a client treating a short page as the end stopped early; the list call
// also asked Gitea for stats, verification and file lists it threw away.
describe("CommitsService.listCommits page size", () => {
  const identity = { userId: "usr_1", method: "session", scopes: new Set() };
  const serviceWith = (history: jest.Mock) =>
    new CommitsService(
      {
        getUserApiClient: jest.fn().mockResolvedValue({
          repos: { repoGetAllCommits: history },
        }),
        getAnonymousApiClient: jest.fn(),
      } as never,
      { authorizeOrThrow: jest.fn().mockResolvedValue(undefined) } as never,
    );

  it.each([51, 100, 1000])(
    "refuses limit=%d with the documented maximum, before any Gitea call",
    async (limit) => {
      const history = jest.fn();
      await expect(
        serviceWith(history).listCommits({
          identity: identity as never,
          ledgerId: "alice/main",
          limit,
        }),
      ).rejects.toMatchObject({
        category: "BAD_USER_INPUT",
        message: "limit must be at most 50",
      });
      expect(history).not.toHaveBeenCalled();
    },
  );

  it("accepts exactly 50 and asks Gitea only for what it reads", async () => {
    const history = jest.fn().mockResolvedValue({ data: [] });
    await serviceWith(history).listCommits({
      identity: identity as never,
      ledgerId: "alice/main",
      limit: 50,
    });
    expect(history).toHaveBeenCalledWith(
      "alice",
      "main",
      expect.objectContaining({
        limit: 50,
        stat: false,
        verification: false,
        files: false,
      }),
      expect.anything(),
    );
  });
});

describe("the commit list's published maximum (w21/314)", () => {
  it("is enforced by the REST query schema and shown to GraphQL", () => {
    const read = COMMIT_READS.find((entry) => entry.name === "ledgerCommits")!;
    expect(read.query.safeParse({ limit: "50" }).success).toBe(true);
    expect(read.query.safeParse({ limit: "51" }).success).toBe(false);
    expect(MAX_COMMITS_PAGE_SIZE).toBe(50);
  });
});

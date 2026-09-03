import {
  CommitsService,
  stripCommitMetadata,
  parseFileStatsFromDiff,
} from "../commits-service";

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
    });
    expect(result.get("file2.txt")).toEqual({
      additions: 0,
      deletions: 1,
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
    });
  });
});

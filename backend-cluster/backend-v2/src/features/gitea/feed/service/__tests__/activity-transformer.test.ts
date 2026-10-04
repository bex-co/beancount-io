import "reflect-metadata";
import { Activity } from "@/features/gitea/client/gitea-api";
import {
  aggregateActivities,
  transformActivityToFeedItem,
} from "../activity-transformer";
import { FeedSource } from "../../api/feed-resolver.types";
import {
  parseActivityContent,
  serializeAggregatedContent,
} from "../activity-content-parser";

describe("ActivityTransformer", () => {
  describe("aggregateActivities", () => {
    it("should not aggregate single activity", () => {
      const activity: Activity = {
        id: 1,
        op_type: "commit_repo",
        repo: {
          id: 1,
          name: "my-ledger",
          full_name: "user/my-ledger",
          owner: { login: "user" },
        },
        created: "2024-01-15T10:00:00Z",
        content: "Updated ledger",
      };

      const result = aggregateActivities([activity]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(activity);
    });

    it("should aggregate multiple activities for same repo on same day", () => {
      const activities: Activity[] = [
        {
          id: 1,
          op_type: "commit_repo",
          repo: {
            id: 1,
            name: "my-ledger",
            full_name: "user/my-ledger",
            owner: { login: "user" },
          },
          created: "2024-01-15T10:00:00Z",
          content: "First commit",
        },
        {
          id: 2,
          op_type: "commit_repo",
          repo: {
            id: 1,
            name: "my-ledger",
            full_name: "user/my-ledger",
            owner: { login: "user" },
          },
          created: "2024-01-15T11:00:00Z",
          content: "Second commit",
        },
        {
          id: 3,
          op_type: "push_tag",
          repo: {
            id: 1,
            name: "my-ledger",
            full_name: "user/my-ledger",
            owner: { login: "user" },
          },
          created: "2024-01-15T12:00:00Z",
          content: "Pushed tag v1.0",
        },
      ];

      const result = aggregateActivities(activities);

      expect(result).toHaveLength(1);
      expect(result[0].created).toBe("2024-01-15T10:00:00Z"); // Earliest

      const parsed = parseActivityContent(result[0].op_type, result[0].content);
      expect(parsed.kind).toBe("aggregated");
      if (parsed.kind === "aggregated") {
        expect(parsed.count).toBe(3);
        expect(parsed.messages).toEqual([
          "First commit",
          "Second commit",
          "Pushed tag v1.0",
        ]);
      }
    });

    it("should not aggregate activities from different days", () => {
      const activities: Activity[] = [
        {
          id: 1,
          op_type: "commit_repo",
          repo: {
            id: 1,
            name: "my-ledger",
            full_name: "user/my-ledger",
            owner: { login: "user" },
          },
          created: "2024-01-15T10:00:00Z",
          content: "Day 1 commit",
        },
        {
          id: 2,
          op_type: "commit_repo",
          repo: {
            id: 1,
            name: "my-ledger",
            full_name: "user/my-ledger",
            owner: { login: "user" },
          },
          created: "2024-01-16T10:00:00Z",
          content: "Day 2 commit",
        },
      ];

      const result = aggregateActivities(activities);

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe("Day 1 commit");
      expect(result[1].content).toBe("Day 2 commit");
    });

    it("should not aggregate activities from different repos", () => {
      const activities: Activity[] = [
        {
          id: 1,
          op_type: "commit_repo",
          repo: {
            id: 1,
            name: "ledger-1",
            full_name: "user/ledger-1",
            owner: { login: "user" },
          },
          created: "2024-01-15T10:00:00Z",
          content: "Ledger 1 commit",
        },
        {
          id: 2,
          op_type: "commit_repo",
          repo: {
            id: 2,
            name: "ledger-2",
            full_name: "user/ledger-2",
            owner: { login: "user" },
          },
          created: "2024-01-15T11:00:00Z",
          content: "Ledger 2 commit",
        },
      ];

      const result = aggregateActivities(activities);

      expect(result).toHaveLength(2);
      expect(result[0].repo?.name).toBe("ledger-1");
      expect(result[1].repo?.name).toBe("ledger-2");
    });

    it("should handle activities without repo or created date", () => {
      const activities: Activity[] = [
        {
          id: 1,
          op_type: "commit_repo",
          created: "2024-01-15T10:00:00Z",
          content: "No repo",
        },
        {
          id: 2,
          op_type: "commit_repo",
          repo: {
            id: 1,
            name: "my-ledger",
            full_name: "user/my-ledger",
            owner: { login: "user" },
          },
          content: "No created date",
        },
      ];

      const result = aggregateActivities(activities);

      // Activities without required fields are skipped
      expect(result).toHaveLength(0);
    });

    it("should aggregate with correct count in different time zones", () => {
      const activities: Activity[] = [
        {
          id: 1,
          op_type: "commit_repo",
          repo: {
            id: 1,
            name: "my-ledger",
            full_name: "user/my-ledger",
            owner: { login: "user" },
          },
          created: "2024-01-15T23:00:00Z",
          content: "Late commit",
        },
        {
          id: 2,
          op_type: "commit_repo",
          repo: {
            id: 1,
            name: "my-ledger",
            full_name: "user/my-ledger",
            owner: { login: "user" },
          },
          created: "2024-01-15T01:00:00Z",
          content: "Early commit",
        },
      ];

      const result = aggregateActivities(activities);

      expect(result).toHaveLength(1);
      const parsed = parseActivityContent(result[0].op_type, result[0].content);
      expect(parsed.kind).toBe("aggregated");
      if (parsed.kind === "aggregated") {
        expect(parsed.count).toBe(2);
      }
    });
  });

  describe("transformActivityToFeedItem", () => {
    it("should transform commit activity to FeedItem", () => {
      const activity: Activity = {
        id: 1,
        op_type: "commit_repo",
        repo: {
          id: 1,
          name: "my-ledger",
          full_name: "user/my-ledger",
          owner: { login: "testuser" },
        },
        act_user: {
          id: 1,
          login: "testuser",
          full_name: "Test User",
          avatar_url: "https://example.com/avatar.jpg",
        },
        created: "2024-01-15T10:00:00Z",
        content: "Fixed accounting errors",
      };

      const result = transformActivityToFeedItem(activity);

      expect(result).toEqual({
        id: "gitea-activity-1",
        title: "Committed to my-ledger",
        summary: "Fixed accounting errors",
        link: "/ledger/testuser/my-ledger",
        publishedAt: new Date("2024-01-15T10:00:00Z"),
        author: "testuser",
        authorAvatar: "https://example.com/avatar.jpg",
        source: FeedSource.LEDGER_RSS,
      });
    });

    describe("contentless and ref activities", () => {
      const activityOf = (
        op_type: string,
        content: string,
        ref_name?: string,
      ): Activity => ({
        id: 11,
        op_type: op_type as Activity["op_type"],
        ref_name,
        repo: {
          id: 1,
          name: "example",
          full_name: "testuser/example",
          owner: { login: "testuser" },
        },
        act_user: { login: "testuser" },
        created: "2024-01-15T10:00:00Z",
        content,
      });
      const emptyPush = JSON.stringify({
        Commits: [],
        HeadCommit: { Sha1: "abc123", Message: "Add opening balances" },
        CompareURL: "",
        Len: 0,
      });

      it.each(["commit_repo", "mirror_sync_push"])(
        "skips a %s push that introduced no commits",
        (op) => {
          expect(
            transformActivityToFeedItem(activityOf(op, emptyPush)),
          ).toBeNull();
        },
      );

      it("skips a commit_repo activity with no content", () => {
        expect(
          transformActivityToFeedItem(activityOf("commit_repo", "")),
        ).toBeNull();
      });

      it("keeps a push that introduced commits", () => {
        const push = JSON.stringify({
          Commits: [{ Sha1: "abc123", Message: "Add opening balances" }],
          HeadCommit: { Sha1: "abc123" },
          CompareURL: "",
          Len: 1,
        });
        const item = transformActivityToFeedItem(
          activityOf("commit_repo", push),
        );
        expect(item?.title).toBe("Committed to example");
        expect(item?.summary).toBe("Add opening balances");
      });

      it("titles a branch creation recorded as push_tag as a branch", () => {
        const item = transformActivityToFeedItem(
          activityOf("push_tag", "", "refs/heads/feature"),
        );
        expect(item?.title).toBe("Created branch feature in example");
      });

      it("titles tags and deleted refs by their short names", () => {
        expect(
          transformActivityToFeedItem(
            activityOf("push_tag", "", "refs/tags/v1"),
          )?.title,
        ).toBe("Pushed tag v1 to example");
        expect(
          transformActivityToFeedItem(
            activityOf("delete_branch", "", "refs/heads/old"),
          )?.title,
        ).toBe("Deleted branch old from example");
      });

      it("gives an unknown op type a neutral title, not a commit title", () => {
        const item = transformActivityToFeedItem(
          activityOf("some_future_op", ""),
        );
        expect(item?.title).toBe("Activity in example");
      });
    });

    describe("authorAvatar", () => {
      const withAvatar = (avatar_url: string | undefined): Activity => ({
        id: 9,
        op_type: "commit_repo",
        repo: {
          id: 1,
          name: "my-ledger",
          full_name: "testuser/my-ledger",
          owner: { login: "testuser" },
        },
        act_user: { login: "testuser", avatar_url },
        created: "2024-01-15T10:00:00Z",
        content: "Fixed accounting errors",
      });

      it.each([
        "https://git.example.org/avatars/abc123",
        "https://secure.gravatar.com/avatar/abc?d=identicon",
      ])("keeps a publicly reachable avatar URL (%s)", (url) => {
        expect(transformActivityToFeedItem(withAvatar(url))?.authorAvatar).toBe(
          url,
        );
      });

      it.each([
        "http://localhost:3000/avatars/abc123",
        "http://LOCALHOST/avatars/abc123",
        "http://gitea:3000/avatars/abc123",
        "http://127.0.0.1:3000/avatars/abc123",
        "http://[::1]:3000/avatars/abc123",
        "http://10.0.0.5/avatars/abc123",
        "http://172.20.1.2/avatars/abc123",
        "http://192.168.1.10/avatars/abc123",
        "http://169.254.169.254/avatars/abc123",
        "http://gitea.internal/avatars/abc123",
        "http://app.localhost/avatars/abc123",
        "/avatars/abc123",
        "javascript:alert(1)",
        "",
        undefined,
      ])("omits a non-public avatar URL (%s)", (url) => {
        const item = transformActivityToFeedItem(withAvatar(url));
        expect(item).not.toBeNull();
        expect(item?.authorAvatar).toBeUndefined();
      });
    });

    it("links push commits to their exact dashboard version", () => {
      const activity: Activity = {
        id: 7,
        op_type: "commit_repo",
        repo: {
          id: 1,
          name: "my-ledger",
          full_name: "testuser/my-ledger",
          owner: { login: "testuser" },
        },
        act_user: { login: "testuser" },
        created: "2024-01-15T11:00:00Z",
        content: JSON.stringify({
          Commits: [
            {
              Sha1: "abc123",
              Message: "Add opening balances",
              AuthorName: "Test User",
              Timestamp: "2024-01-15T10:59:00Z",
            },
            {
              Sha1: "def456",
              Message: "Reconcile checking account",
              AuthorName: "Test User",
              Timestamp: "2024-01-15T11:00:00Z",
            },
          ],
          HeadCommit: { Sha1: "def456" },
          CompareURL: "",
          Len: 2,
        }),
      };

      const result = transformActivityToFeedItem(activity);

      expect(result?.link).toBe("/ledger/testuser/my-ledger/commit/def456");
    });

    it("should transform aggregated activity with count and messages", () => {
      const activity: Activity = {
        id: 1,
        op_type: "commit_repo",
        repo: {
          id: 1,
          name: "my-ledger",
          full_name: "user/my-ledger",
          owner: { login: "testuser" },
        },
        act_user: {
          id: 1,
          login: "testuser",
        },
        created: "2024-01-15T10:00:00Z",
        content: serializeAggregatedContent(5, [
          "First commit",
          "Second commit",
          "Third commit",
          "Fourth commit",
          "Fifth commit",
        ]),
      };

      const result = transformActivityToFeedItem(activity);

      expect(result).not.toBeNull();
      expect(result?.title).toBe("5 activities in my-ledger");
      expect(result?.summary).toContain("First commit");
      expect(result?.summary).toContain("+2 more");
    });

    it("should transform create_repo activity", () => {
      const activity: Activity = {
        id: 2,
        op_type: "create_repo",
        repo: {
          id: 1,
          name: "new-ledger",
          full_name: "user/new-ledger",
          owner: { login: "user" },
        },
        act_user: { login: "user" },
        created: "2024-01-15T10:00:00Z",
        content: "Created new repository",
      };

      const result = transformActivityToFeedItem(activity);

      expect(result?.title).toBe("Created repository new-ledger");
    });

    it("should transform push_tag activity with ref_name", () => {
      const activity: Activity = {
        id: 3,
        op_type: "push_tag",
        repo: {
          id: 1,
          name: "my-ledger",
          full_name: "user/my-ledger",
          owner: { login: "user" },
        },
        act_user: { login: "user" },
        created: "2024-01-15T10:00:00Z",
        content: "Pushed new tag",
        ref_name: "v1.0.0",
      };

      const result = transformActivityToFeedItem(activity);

      expect(result?.title).toBe("Pushed tag v1.0.0 to my-ledger");
    });

    it("should transform create_issue activity", () => {
      const activity: Activity = {
        id: 4,
        op_type: "create_issue",
        repo: {
          id: 1,
          name: "my-ledger",
          full_name: "user/my-ledger",
          owner: { login: "user" },
        },
        act_user: { login: "user" },
        created: "2024-01-15T10:00:00Z",
        content: "Opened new issue",
      };

      const result = transformActivityToFeedItem(activity);

      expect(result?.title).toBe("Created issue in my-ledger");
    });

    it("should transform merge_pull_request activity", () => {
      const activity: Activity = {
        id: 5,
        op_type: "merge_pull_request",
        repo: {
          id: 1,
          name: "my-ledger",
          full_name: "user/my-ledger",
          owner: { login: "user" },
        },
        act_user: { login: "user" },
        created: "2024-01-15T10:00:00Z",
        content: "Merged PR #5",
      };

      const result = transformActivityToFeedItem(activity);

      expect(result?.title).toBe("Merged pull request in my-ledger");
    });

    it("should return null for activity without id", () => {
      const activity: Activity = {
        op_type: "commit_repo",
        repo: {
          id: 1,
          name: "my-ledger",
          full_name: "user/my-ledger",
          owner: { login: "user" },
        },
        created: "2024-01-15T10:00:00Z",
        content: "No ID",
      };

      const result = transformActivityToFeedItem(activity);

      expect(result).toBeNull();
    });

    it("should return null for activity without created date", () => {
      const activity: Activity = {
        id: 1,
        op_type: "commit_repo",
        repo: {
          id: 1,
          name: "my-ledger",
          full_name: "user/my-ledger",
          owner: { login: "user" },
        },
        content: "No created date",
      };

      const result = transformActivityToFeedItem(activity);

      expect(result).toBeNull();
    });

    it("should return null for activity without op_type", () => {
      const activity: Activity = {
        id: 1,
        repo: {
          id: 1,
          name: "my-ledger",
          full_name: "user/my-ledger",
          owner: { login: "user" },
        },
        created: "2024-01-15T10:00:00Z",
        content: "No op_type",
      };

      const result = transformActivityToFeedItem(activity);

      expect(result).toBeNull();
    });

    it("should handle activity without author", () => {
      const activity: Activity = {
        id: 1,
        op_type: "commit_repo",
        repo: {
          id: 1,
          name: "my-ledger",
          full_name: "user/my-ledger",
          owner: { login: "user" },
        },
        created: "2024-01-15T10:00:00Z",
        content: "No author",
      };

      const result = transformActivityToFeedItem(activity);

      expect(result).not.toBeNull();
      expect(result?.author).toBeUndefined();
      expect(result?.authorAvatar).toBeUndefined();
    });

    it("should fallback to home for activity without repo owner", () => {
      const activity: Activity = {
        id: 1,
        op_type: "commit_repo",
        repo: {
          id: 1,
          name: "my-ledger",
          full_name: "user/my-ledger",
        },
        created: "2024-01-15T10:00:00Z",
        content: "No owner",
      };

      const result = transformActivityToFeedItem(activity);

      expect(result?.link).toBe("/");
    });

    it("should strip HTML from summary", () => {
      const activity: Activity = {
        id: 1,
        op_type: "commit_repo",
        repo: {
          id: 1,
          name: "my-ledger",
          full_name: "user/my-ledger",
          owner: { login: "user" },
        },
        act_user: { login: "user" },
        created: "2024-01-15T10:00:00Z",
        content:
          "<p>HTML <strong>content</strong> with <a href='#'>link</a></p>",
      };

      const result = transformActivityToFeedItem(activity);

      expect(result?.summary).toBe("HTML content with link");
      expect(result?.summary).not.toContain("<");
      expect(result?.summary).not.toContain(">");
    });

    it("should truncate long summary to 200 characters", () => {
      const longContent = "a".repeat(250);
      const activity: Activity = {
        id: 1,
        op_type: "commit_repo",
        repo: {
          id: 1,
          name: "my-ledger",
          full_name: "user/my-ledger",
          owner: { login: "user" },
        },
        act_user: { login: "user" },
        created: "2024-01-15T10:00:00Z",
        content: longContent,
      };

      const result = transformActivityToFeedItem(activity);

      expect(result).not.toBeNull();
      if (result && result.summary) {
        expect(result.summary.length).toBeLessThanOrEqual(203); // 200 + "..."
        expect(result.summary).toContain("...");
      }
    });

    it("should use full_name as author if login is not available", () => {
      const activity: Activity = {
        id: 1,
        op_type: "commit_repo",
        repo: {
          id: 1,
          name: "my-ledger",
          full_name: "user/my-ledger",
          owner: { login: "user" },
        },
        act_user: {
          id: 1,
          full_name: "Test User",
        },
        created: "2024-01-15T10:00:00Z",
        content: "Commit message",
      };

      const result = transformActivityToFeedItem(activity);

      expect(result?.author).toBe("Test User");
    });
  });
});

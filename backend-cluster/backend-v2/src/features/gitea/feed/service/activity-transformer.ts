import { Activity } from "@/features/gitea/client/gitea-api";
import { FeedItem, FeedSource } from "../api/feed-resolver.types";
import { stripHtml } from "./html-utils";
import {
  parseActivityContent,
  serializeAggregatedContent,
  summarizeParsedContent,
} from "./activity-content-parser";

/**
 * Aggregate activities by repository and calendar day
 * Groups multiple activities for the same repo on the same day into a single aggregated activity
 * @param activities Array of Activity objects to aggregate
 * @returns Array of Activity objects with same-day, same-repo activities aggregated
 */
export function aggregateActivities(activities: Activity[]): Activity[] {
  // Group by repo full_name + calendar day
  const groups = new Map<string, Activity[]>();

  for (const activity of activities) {
    if (!activity.repo?.full_name || !activity.created) {
      continue;
    }

    const dateKey = activity.created.split("T")[0]; // YYYY-MM-DD
    const groupKey = `${activity.repo.full_name}:${dateKey}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(activity);
  }

  // Process groups
  const result: Activity[] = [];
  for (const groupActivities of groups.values()) {
    if (groupActivities.length === 1) {
      // Single activity - no aggregation
      result.push(groupActivities[0]);
    } else {
      // Multiple activities - aggregate
      const count = groupActivities.length;

      // Sort by timestamp to get earliest
      const sortedActivities = [...groupActivities].sort((a, b) => {
        const aTime = a.created ? new Date(a.created).getTime() : 0;
        const bTime = b.created ? new Date(b.created).getTime() : 0;
        return aTime - bTime;
      });

      const earliest = sortedActivities[0];

      // Collect the first-line subject from every activity in time order
      const messages: string[] = [];
      for (const act of sortedActivities) {
        const parsed = parseActivityContent(act.op_type, act.content);
        const text = summarizeParsedContent(parsed, 1).split("\n")[0].trim();
        if (text) {
          messages.push(text);
        }
      }

      result.push({
        ...earliest,
        content: serializeAggregatedContent(count, messages),
      });
    }
  }

  return result;
}

/**
 * Short display name of an activity ref. Gitea records full ref names
 * (`refs/heads/main`, `refs/tags/v1`); readers know them by their short name.
 */
function refName(activity: Activity): string {
  return (activity.ref_name || "").replace(/^refs\/(heads|tags)\//, "");
}

/**
 * Title templates for different activity types
 */
const titleTemplates: Record<string, (activity: Activity) => string> = {
  create_repo: (a) => `Created repository ${a.repo?.name || "repository"}`,
  rename_repo: (a) => `Renamed repository ${a.repo?.name || "repository"}`,
  star_repo: (a) => `Starred ${a.repo?.name || "repository"}`,
  watch_repo: (a) => `Watched ${a.repo?.name || "repository"}`,
  commit_repo: (a) => `Committed to ${a.repo?.name || "repository"}`,
  create_issue: (a) => `Created issue in ${a.repo?.name || "repository"}`,
  create_pull_request: (a) =>
    `Created pull request in ${a.repo?.name || "repository"}`,
  transfer_repo: (a) =>
    `Transferred repository ${a.repo?.name || "repository"}`,
  // Gitea records a new branch as push_tag too, with a refs/heads/ ref.
  push_tag: (a) =>
    a.ref_name?.startsWith("refs/heads/")
      ? `Created branch ${refName(a)} in ${a.repo?.name || "repository"}`
      : `Pushed tag ${refName(a)} to ${a.repo?.name || "repository"}`,
  comment_issue: (a) => `Commented on issue in ${a.repo?.name || "repository"}`,
  merge_pull_request: (a) =>
    `Merged pull request in ${a.repo?.name || "repository"}`,
  close_issue: (a) => `Closed issue in ${a.repo?.name || "repository"}`,
  reopen_issue: (a) => `Reopened issue in ${a.repo?.name || "repository"}`,
  close_pull_request: (a) =>
    `Closed pull request in ${a.repo?.name || "repository"}`,
  reopen_pull_request: (a) =>
    `Reopened pull request in ${a.repo?.name || "repository"}`,
  delete_tag: (a) =>
    `Deleted tag ${refName(a)} from ${a.repo?.name || "repository"}`,
  delete_branch: (a) =>
    `Deleted branch ${refName(a)} from ${a.repo?.name || "repository"}`,
  mirror_sync_push: (a) =>
    `Mirror synced (push) ${a.repo?.name || "repository"}`,
  mirror_sync_create: (a) =>
    `Mirror synced (create) ${a.repo?.name || "repository"}`,
  mirror_sync_delete: (a) =>
    `Mirror synced (delete) ${a.repo?.name || "repository"}`,
  approve_pull_request: (a) =>
    `Approved pull request in ${a.repo?.name || "repository"}`,
  reject_pull_request: (a) =>
    `Rejected pull request in ${a.repo?.name || "repository"}`,
  comment_pull: (a) =>
    `Commented on pull request in ${a.repo?.name || "repository"}`,
  publish_release: (a) =>
    `Published release in ${a.repo?.name || "repository"}`,
  pull_review_dismissed: (a) =>
    `Dismissed pull request review in ${a.repo?.name || "repository"}`,
  pull_request_ready_for_review: (a) =>
    `Pull request ready for review in ${a.repo?.name || "repository"}`,
  auto_merge_pull_request: (a) =>
    `Auto-merged pull request in ${a.repo?.name || "repository"}`,
};

/**
 * Generate user-friendly title from Activity
 * Detects aggregated activities and shows count
 * @param activity Activity object
 * @returns User-friendly title string
 */
function generateActivityTitle(
  activity: Activity,
  parsed: ReturnType<typeof parseActivityContent>,
): string {
  const repoName = activity.repo?.name || "unknown";

  if (parsed.kind === "aggregated") {
    return `${parsed.count} activities in ${repoName}`;
  }

  const template = titleTemplates[activity.op_type || ""];
  return template ? template(activity) : `Activity in ${repoName}`;
}

/**
 * Generate dashboard link from activity
 * Push activity links to its immutable head commit; other activity links to
 * the ledger root.
 * @param activity Activity object
 * @returns Dashboard route path
 */
function generateActivityLink(
  activity: Activity,
  parsed: ReturnType<typeof parseActivityContent>,
): string {
  if (!activity.repo?.owner?.login || !activity.repo?.name) {
    return "/"; // Fallback to home
  }

  const ledgerPath = `/ledger/${activity.repo.owner.login}/${activity.repo.name}`;
  if (parsed.kind === "push" && parsed.headSha) {
    return `${ledgerPath}/commit/${parsed.headSha}`;
  }

  return ledgerPath;
}

/**
 * Keep an avatar URL only when a client outside the server can load it.
 * Gitea builds `avatar_url` from its own ROOT_URL, which a deployment may set
 * to a loopback or compose-internal origin (`http://localhost:3000/avatars/…`);
 * passing that through hands every API consumer a broken, internal link.
 */
function publicAvatarUrl(avatarUrl: string | undefined): string | undefined {
  if (!avatarUrl) {
    return undefined;
  }
  let url: URL;
  try {
    url = new URL(avatarUrl);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return undefined;
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const isNonPublic =
    !host.includes(".") || // localhost, compose service names like `gitea`, IPv6
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^(127|10|0)\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  return isNonPublic ? undefined : avatarUrl;
}

/**
 * A push that introduced no commits — a new ref at an existing tip, or a
 * branch moved back to an ancestor. Its head commit already has its own card
 * from the push that introduced it, so a card here would only repeat that SHA
 * under a "Committed to" title with nothing to read.
 */
function isContentlessPush(
  opType: string,
  parsed: ReturnType<typeof parseActivityContent>,
): boolean {
  if (opType !== "commit_repo" && opType !== "mirror_sync_push") {
    return false;
  }
  return parsed.kind === "push"
    ? parsed.commits.length === 0
    : parsed.kind === "raw" && parsed.text.trim() === "";
}

/**
 * Transform Gitea Activity object to FeedItem format
 * @param activity Activity object from Gitea API
 * @returns FeedItem or null if activity is invalid
 */
export function transformActivityToFeedItem(
  activity: Activity,
): FeedItem | null {
  // Skip activities without required fields
  if (!activity.id || !activity.created || !activity.op_type) {
    return null;
  }

  const parsed = parseActivityContent(activity.op_type, activity.content);
  if (isContentlessPush(activity.op_type, parsed)) {
    return null;
  }

  return {
    id: `gitea-activity-${activity.id}`,
    title: generateActivityTitle(activity, parsed),
    summary: stripHtml(summarizeParsedContent(parsed), false),
    link: generateActivityLink(activity, parsed),
    publishedAt: new Date(activity.created),
    author: activity.act_user?.login || activity.act_user?.full_name,
    authorAvatar: publicAvatarUrl(activity.act_user?.avatar_url),
    source: FeedSource.LEDGER_RSS, // Keep same source for compatibility
  };
}

/**
 * Parses the `content` field of a Gitea Activity.
 *
 * The format varies by op_type (sourced from Gitea services/feed/notifier.go):
 *
 * - Push-like ops (commit_repo, push_tag, delete_tag, delete_branch,
 *   mirror_sync_*): JSON-encoded PushCommits struct (PascalCase keys, no JSON tags)
 * - Issue/PR ops (create_issue, create_pull_request, comment_issue, ...):
 *   Pipe-delimited "IssueIndex|Title" or "IssueIndex|Content"
 * - pull_review_dismissed: "IssueIndex|ReviewerName|CommentContent"
 * - Repo lifecycle ops (create_repo, star_repo, ...): empty or plain string
 */

// ---------------------------------------------------------------------------
// Raw Go struct shapes (PascalCase — Go default JSON marshaling, no struct tags)
// ---------------------------------------------------------------------------

interface GiteaPushCommit {
  Sha1: string;
  Message: string;
  AuthorEmail: string;
  AuthorName: string;
  CommitterEmail: string;
  CommitterName: string;
  Timestamp: string;
}

interface GiteaPushCommits {
  Commits: GiteaPushCommit[];
  HeadCommit: GiteaPushCommit | null;
  CompareURL: string;
  Len: number;
}

// ---------------------------------------------------------------------------
// Parsed content types
// ---------------------------------------------------------------------------

interface ParsedPushContent {
  kind: "push";
  commits: Array<{
    sha1: string;
    message: string;
    authorName: string;
    timestamp: string;
  }>;
  headSha: string;
  compareUrl: string;
  totalCount: number;
}

interface ParsedIssueContent {
  kind: "issue";
  issueIndex: number;
  title: string;
  /** Only present for pull_review_dismissed (reviewer name) */
  extra?: string;
}

interface ParsedRawContent {
  kind: "raw";
  text: string;
}

/**
 * Produced by aggregateActivities() when multiple activities for the same
 * repo/day are collapsed into one.  Stored as JSON in the content field so
 * it round-trips cleanly through the Activity object without any
 * string-concatenation hacks.
 */
interface ParsedAggregatedContent {
  kind: "aggregated";
  count: number;
  /** First-line subjects collected from all aggregated activities */
  messages: string[];
}

export type ParsedContent =
  | ParsedPushContent
  | ParsedIssueContent
  | ParsedAggregatedContent
  | ParsedRawContent;

// ---------------------------------------------------------------------------
// Op-type classification
// ---------------------------------------------------------------------------

const PUSH_OP_TYPES = new Set([
  "commit_repo",
  "push_tag",
  "delete_tag",
  "delete_branch",
  "mirror_sync_push",
  "mirror_sync_create",
  "mirror_sync_delete",
]);

const ISSUE_OP_TYPES = new Set([
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
  "pull_review_dismissed",
  "pull_request_ready_for_review",
]);

// ---------------------------------------------------------------------------
// Aggregated content serialisation
// ---------------------------------------------------------------------------

const AGGREGATED_KIND = "aggregated" as const;

interface AggregatedContentJson {
  _kind: typeof AGGREGATED_KIND;
  count: number;
  messages: string[];
}

/** Serialise aggregation metadata into a content string safe to store on Activity. */
export function serializeAggregatedContent(
  count: number,
  messages: string[],
): string {
  const payload: AggregatedContentJson = {
    _kind: AGGREGATED_KIND,
    count,
    messages,
  };
  return JSON.stringify(payload);
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

function tryParseAggregated(raw: string): ParsedAggregatedContent | undefined {
  try {
    const obj = JSON.parse(raw) as Partial<AggregatedContentJson>;
    if (obj._kind === AGGREGATED_KIND && typeof obj.count === "number") {
      return {
        kind: "aggregated",
        count: obj.count,
        messages: Array.isArray(obj.messages) ? obj.messages : [],
      };
    }
  } catch {
    // not aggregated JSON — continue normal parsing
  }
  return undefined;
}

function parsePushContent(raw: string): ParsedPushContent | ParsedRawContent {
  try {
    const parsed = JSON.parse(raw) as GiteaPushCommits;

    if (!Array.isArray(parsed.Commits)) {
      return { kind: "raw", text: raw };
    }

    return {
      kind: "push",
      commits: parsed.Commits.map((c) => ({
        sha1: c.Sha1 ?? "",
        message: (c.Message ?? "").trim(),
        authorName: c.AuthorName ?? "",
        timestamp: c.Timestamp ?? "",
      })),
      headSha:
        parsed.HeadCommit?.Sha1 ??
        parsed.Commits[parsed.Commits.length - 1]?.Sha1 ??
        "",
      compareUrl: parsed.CompareURL ?? "",
      totalCount: parsed.Len ?? parsed.Commits.length,
    };
  } catch {
    return { kind: "raw", text: raw };
  }
}

function parseIssueContent(
  opType: string,
  raw: string,
): ParsedIssueContent | ParsedRawContent {
  const parts = raw.split("|");
  const issueIndex = parseInt(parts[0] ?? "", 10);

  if (isNaN(issueIndex)) {
    return { kind: "raw", text: raw };
  }

  const title = parts[1] ?? "";
  const extra = parts[2]; // only for pull_review_dismissed

  return {
    kind: "issue",
    issueIndex,
    title,
    ...(opType === "pull_review_dismissed" && extra !== undefined
      ? { extra }
      : {}),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse the content field of a Gitea Activity into a typed structure.
 * Always returns a valid ParsedContent — falls back to `{ kind: "raw" }` on
 * any parse failure.
 */
export function parseActivityContent(
  opType: string | undefined,
  content: string | undefined,
): ParsedContent {
  const raw = content ?? "";

  try {
    if (!opType || raw === "") {
      return { kind: "raw", text: raw };
    }

    // Aggregated activities are recognised before any op_type check so that
    // the display layer always gets clean structured data regardless of the
    // original op_type that triggered the aggregation.
    const aggregated = tryParseAggregated(raw);
    if (aggregated) {
      return aggregated;
    }

    if (PUSH_OP_TYPES.has(opType)) {
      return parsePushContent(raw);
    }

    if (ISSUE_OP_TYPES.has(opType)) {
      return parseIssueContent(opType, raw);
    }

    return { kind: "raw", text: raw };
  } catch {
    return { kind: "raw", text: raw };
  }
}

/**
 * Render a ParsedContent value into a short human-readable summary string.
 * Commit messages are trimmed; only the first few are shown.
 */
export function summarizeParsedContent(
  parsed: ParsedContent,
  maxCommits = 3,
): string {
  switch (parsed.kind) {
    case "aggregated": {
      if (parsed.messages.length === 0) {
        return "";
      }
      const shown = parsed.messages.slice(0, maxCommits);
      const remainder = parsed.count - shown.length;
      const suffix = remainder > 0 ? `\n+${remainder} more` : "";
      return shown.join("\n") + suffix;
    }
    case "push": {
      if (parsed.commits.length === 0) {
        return "";
      }
      const shown = parsed.commits.slice(0, maxCommits);
      const lines = shown.map((c) => c.message.split("\n")[0]).filter(Boolean);
      const remainder = parsed.totalCount - shown.length;
      const suffix = remainder > 0 ? `\n+${remainder} more commit(s)` : "";
      return lines.join("\n") + suffix;
    }
    case "issue": {
      const prefix = `#${parsed.issueIndex}`;
      const parts = [parsed.title, parsed.extra].filter(Boolean);
      if (parts.length > 0) {
        return `${prefix}: ${parts.join(" — ")}`;
      }
      return prefix;
    }
    case "raw":
      return parsed.text;
  }
}

/**
 * Reverting one commit as a single new commit (w23/m42).
 *
 * The write goes through the ledger service's `change-files` like every other
 * file write, so it lands on the default branch with one atomic commit and
 * needs no side branch (the main-only branch policy refuses one, `w23/m17`).
 * The plan is the inverse of what the commit did to each file it touched:
 * an added file is deleted, a removed file is created again from the parent,
 * a modified file is set back to its parent's contents. It is refused when a
 * later commit has touched any of those files, so a revert never silently
 * discards newer work; the check is per file, the blob sha at the commit
 * against the sha now.
 */

/** A file as the git host holds it at one revision: its blob sha and base64 content. */
export type GitBlob = { sha: string; content: string } | null;

export type CommitFile = {
  path: string;
  /** What the commit did to the file. */
  status: "added" | "modified" | "removed";
};

export type RevertOperation =
  | { operation: "create"; path: string; content: string }
  | { operation: "update"; path: string; content: string; sha: string }
  | { operation: "delete"; path: string; sha: string };

export type RevertPlan = {
  operations: RevertOperation[];
  /** One sentence per file the revert cannot restore without losing newer work. */
  conflicts: string[];
};

/** `status` as git hosts spell it, narrowed to what a revert distinguishes. */
export function revertedStatus(
  status: string | undefined,
): CommitFile["status"] {
  if (status === "added") return "added";
  if (status === "removed" || status === "deleted") return "removed";
  return "modified";
}

/**
 * The operations that undo `files`, given each file at the commit, at the
 * commit's parent and now; or the files that stand in the way.
 */
export function planRevert(
  files: readonly CommitFile[],
  blobs: Readonly<
    Record<
      string,
      {
        atCommit: GitBlob;
        atParent: GitBlob;
        /** Where the file stands now: only its sha is compared. */
        current: { sha: string } | null;
      }
    >
  >,
): RevertPlan {
  const operations: RevertOperation[] = [];
  const conflicts: string[] = [];
  for (const { path, status } of files) {
    const { atCommit, atParent, current } = blobs[path]!;
    if (status === "added") {
      if (current === null) {
        conflicts.push(
          `${path} was added by the commit and has since been removed`,
        );
      } else if (atCommit === null || current.sha !== atCommit.sha) {
        conflicts.push(`${path} has changed since the commit`);
      } else {
        operations.push({ operation: "delete", path, sha: current.sha });
      }
    } else if (status === "removed") {
      if (current !== null) {
        conflicts.push(`${path} was removed by the commit and exists again`);
      } else if (atParent === null) {
        conflicts.push(
          `${path} is not in the commit's parent, so there is nothing to restore`,
        );
      } else {
        operations.push({
          operation: "create",
          path,
          content: atParent.content,
        });
      }
    } else if (
      current === null ||
      atCommit === null ||
      current.sha !== atCommit.sha
    ) {
      conflicts.push(`${path} has changed since the commit`);
    } else if (atParent === null) {
      conflicts.push(
        `${path} is not in the commit's parent, so there is nothing to restore`,
      );
    } else {
      operations.push({
        operation: "update",
        path,
        content: atParent.content,
        sha: current.sha,
      });
    }
  }
  return { operations, conflicts };
}

/** The first line of a commit message. */
export function commitSubject(message: string | undefined): string {
  return (message ?? "").split("\n")[0]!.trim();
}

/** The revert's own message when the caller gives none, in git's wording. */
export function defaultRevertMessage(sha: string, subject: string): string {
  return `Revert "${subject}"\n\nThis reverts commit ${sha}.`;
}

/** What the revert does to each file, in the words a result reports. */
export function revertChanges(operations: readonly RevertOperation[]) {
  const word = {
    create: "created",
    update: "updated",
    delete: "deleted",
  } as const;
  return operations.map((operation) => ({
    path: operation.path,
    change: word[operation.operation],
  }));
}

/** The `commit` field of every write result, so its wording cannot drift across surfaces. */
export const COMMIT_SHA_DESCRIPTION =
  "The sha of the commit this write made; absent on a preview or a read.";

export const REVERT_SHA_DESCRIPTION =
  "The commit to undo: a sha that a write result returned or the commits read lists, or a branch name for its latest commit.";

export const REVERT_MESSAGE_DESCRIPTION =
  'The revert commit\'s message; defaults to `Revert "<subject>"` and the sha it reverts.';

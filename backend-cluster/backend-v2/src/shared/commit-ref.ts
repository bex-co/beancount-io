import { BadUserInputError } from "@/shared/errors";

const COMMIT_REF_NEWLINE_HINT =
  "Pass a single commit SHA, branch name, or git revision without newlines.";

const COMMIT_REF_SPACE_HINT =
  "Remove the space: a SHA or branch copied with a stray leading or trailing space fails this way. Git revision syntax takes a space only inside a `@{…}` or `^{…}` group or after `:/`.";

/**
 * Refuse a commit ref with a line break or with a space where git never allows
 * one, before the repository host is asked (w31/024, w31/061, w31/062).
 *
 * Line breaks (`\r`, `\n`) are refused anywhere in the ref — including inside
 * `@{…}` / `^{…}` groups and after `:/` — because the host's line-oriented git
 * ref lookup splits on `\n`, silently dropping everything from the first
 * newline onward and resolving the first line instead of refusing a malformed
 * ref.
 *
 * No branch name or commit SHA holds a space, yet the host answers such a ref
 * with a 500 rather than a 404: its object lookup reads back `<name> missing`
 * and splits that line on spaces. The 500 reached callers as a server fault
 * that told them to retry, when the fix was to drop a stray space from a
 * copied SHA.
 *
 * Git's commit-revision syntax does take a space in two places, and both
 * resolve on the host today: inside a `@{…}` or `^{…}` group (`main@{1 day
 * ago}`, `main^{/fix typo}`) and after a leading `:/` (`:/fix typo`). Bare
 * `{…}` groups and other colons (such as `<rev>:<path>`) do not name commits
 * and must still be refused when they carry a space. Other whitespace such as
 * a tab is left to the host, which answers it with NOT_FOUND (blank-only refs
 * are refused by callers).
 *
 * `parameter` is the argument's name on every surface (`sha`, `branch`,
 * `branchName`), so the refusal names what to fix.
 */
export function assertCommitRef(ref: string, parameter: string): void {
  if (/[\r\n]/.test(ref)) {
    throw new BadUserInputError(
      `${parameter} must not contain a line break: no branch name or commit SHA spans lines`,
      parameter,
      COMMIT_REF_NEWLINE_HINT,
    );
  }
  const outsideGroups = ref.replace(/[@^]\{[^}]*\}/g, "{}");
  if (!outsideGroups.startsWith(":/") && outsideGroups.includes(" ")) {
    throw new BadUserInputError(
      `${parameter} must not contain a space: no branch name or commit SHA holds one`,
      parameter,
      COMMIT_REF_SPACE_HINT,
    );
  }
}

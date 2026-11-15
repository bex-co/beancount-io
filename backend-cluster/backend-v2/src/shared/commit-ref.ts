import { BadUserInputError } from "@/shared/errors";

const COMMIT_REF_SPACE_HINT =
  "Remove the space: a SHA or branch copied with a stray leading or trailing space fails this way. Git revision syntax takes a space only inside a `@{…}` or `^{…}` group or after `:/`.";

/**
 * Refuse a commit ref with a space where git never allows one, before the
 * repository host is asked (w31/024). No branch name or commit SHA holds a
 * space, yet the host answers such a ref with a 500 rather than a 404: its
 * object lookup reads back `<name> missing` and splits that line on spaces.
 * The 500 reached callers as a server fault that told them to retry, when the
 * fix was to drop a stray space from a copied SHA.
 *
 * Git's revision syntax does take a space in two places, and both resolve on
 * the host today: inside a brace group (`main@{1 day ago}`,
 * `main^{/fix typo}`) and after a colon (`:/fix typo`). Those parts are left
 * to the host. So is other whitespace: the host already answers a tab with
 * NOT_FOUND and ignores a trailing newline.
 *
 * `parameter` is the argument's name on every surface (`sha`, `branch`,
 * `branchName`), so the refusal names what to fix.
 */
export function assertCommitRef(ref: string, parameter: string): void {
  const outsideGroups = ref.replace(/\{[^}]*\}/g, "{}");
  const colon = outsideGroups.indexOf(":");
  const name = colon === -1 ? outsideGroups : outsideGroups.slice(0, colon);
  if (name.includes(" ")) {
    throw new BadUserInputError(
      `${parameter} must not contain a space: no branch name or commit SHA holds one`,
      parameter,
      COMMIT_REF_SPACE_HINT,
    );
  }
}

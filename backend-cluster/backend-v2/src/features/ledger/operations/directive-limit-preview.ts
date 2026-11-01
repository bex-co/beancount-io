import type { FavaApiClient } from "@/foundation/fava";
import {
  evaluateDirectiveLimit,
  type DirectiveLimitGateDeps,
} from "@/features/gitea/policy/directive-limit-gate";
import type { DirectiveLimitLookupDeps } from "@/features/ledger/operations/directive-limit-lookup";
import { ResourceLimitReachedError } from "@/shared/errors";

/**
 * Asks, for a write that will not be committed, the question the commit asks.
 *
 * The directive limit is enforced where the ledger service commits, so a dry
 * run that returns before committing could promise a write the real call then
 * refuses with `RESOURCE_LIMIT_REACHED` — and an agent that previews so the
 * user can approve what will happen has asked for an approval that meant
 * nothing (w5/904).
 */
export interface DirectiveLimitPreview {
  /**
   * Refuse with the commit's own error when adding `adding` directives would
   * leave the ledger past its owner's limit and bigger than it is now.
   * Fail-open exactly as the gate is: an unlimited owner, a failed lookup or a
   * failed count all allow it.
   */
  assertRoom(params: {
    client: FavaApiClient;
    owner: string;
    repo: string;
    adding: number;
  }): Promise<void>;
}

/** The sentence the ledger service refuses a commit with, so a preview and the real call read alike. */
export function directiveLimitMessage(
  limit: number,
  projected: number,
): string {
  return (
    `This ledger has reached its free-tier limit of ${limit} directives ` +
    `(this change would bring it to approximately ${projected}). ` +
    "Deleting entries still works and is how to get back under the limit; " +
    "upgrading removes it entirely."
  );
}

export function createDirectiveLimitPreview(
  deps: DirectiveLimitLookupDeps,
): DirectiveLimitPreview {
  return {
    async assertRoom({ client, owner, repo, adding }) {
      // A write that adds nothing never grows the ledger, so it is never refused.
      if (adding <= 0) return;
      const verdict = await evaluateDirectiveLimit(
        { ...deps, ledgerClient: client } satisfies DirectiveLimitGateDeps,
        owner,
        repo,
      );
      if (verdict.decision !== "over" && verdict.decision !== "under") return;
      const projected = verdict.count + adding;
      if (projected > verdict.limit) {
        throw new ResourceLimitReachedError(
          "Directive",
          verdict.limit,
          projected,
          directiveLimitMessage(verdict.limit, projected),
          { limitOwner: "LEDGER_OWNER" },
        );
      }
    },
  };
}

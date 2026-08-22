import type { Api as GiteaApi } from "@/features/gitea/client/gitea-api";
import { logger } from "@/shared/logger";

const log = logger.child({ module: "repo-branch-policy" });

/**
 * The main-only push policy, expressed as Gitea branch protection.
 *
 * Only pushes to `refs/heads/main` are allowed; all other branches and tags
 * are rejected.
 */
/**
 * The rule shapes. A lower `priority` number wins when several rules match a
 * ref, so `main` must sort ahead of the catch-all or nothing could be pushed.
 */
const BRANCH_RULES = [
  { rule_name: "main", enable_push: true, priority: 1 },
  { rule_name: "*", enable_push: false, priority: 2 },
] as const;
const TAG_RULE = "*";

interface BranchProtectionSummary {
  rule_name?: string;
  enable_push?: boolean;
  priority?: number;
}

/**
 * Apply the main-only policy to `owner/repo`, doing nothing if it is already
 * in place. Safe to call on an empty repository: with these rules present, the
 * first commit that creates `main` still succeeds.
 */
export async function applyMainOnlyPolicy(
  client: GiteaApi<unknown>,
  owner: string,
  repo: string,
): Promise<void> {
  await applyBranchRules(client, owner, repo);
  await applyTagRule(client, owner, repo);
}

async function applyBranchRules(
  client: GiteaApi<unknown>,
  owner: string,
  repo: string,
): Promise<void> {
  const existing = await listBranchRules(client, owner, repo);
  const byName = new Map(
    existing.map((rule) => [rule.rule_name ?? "", rule] as const),
  );

  for (const rule of BRANCH_RULES) {
    const current = byName.get(rule.rule_name);
    if (
      current &&
      current.enable_push === rule.enable_push &&
      current.priority === rule.priority
    ) {
      continue;
    }
    if (current) {
      await client.repos.repoEditBranchProtection(owner, repo, rule.rule_name, {
        enable_push: rule.enable_push,
        priority: rule.priority,
      });
    } else {
      await client.repos.repoCreateBranchProtection(owner, repo, rule);
    }
  }
}

/**
 * Branch protection does not cover tags, so the tag rule is what replaces the
 * hook's rejection of `refs/tags/*`.
 *
 * Gitea refuses to create a tag rule with an empty whitelist (HTTP 400, "both
 * whitelist_usernames and whitelist_teams are empty"), and there is no value
 * meaning "nobody". Create it naming the owner to satisfy that validation, then
 * PATCH the whitelist empty — the stored list becomes `[]` and the owner is
 * rejected when pushing a tag. Passing a name that is not a collaborator also
 * happens to work today, because Gitea filters the list down to collaborators,
 * but that relies on an implementation detail; create-then-patch does not.
 */
async function applyTagRule(
  client: GiteaApi<unknown>,
  owner: string,
  repo: string,
): Promise<void> {
  const existing = await listTagRules(client, owner, repo);
  const current = existing.find((rule) => rule.name_pattern === TAG_RULE);

  if (current) {
    if ((current.whitelist_usernames ?? []).length === 0) return;
    if (current.id === undefined) return;
    await client.repos.repoEditTagProtection(owner, repo, current.id, {
      whitelist_usernames: [],
    });
    return;
  }

  const created = await client.repos.repoCreateTagProtection(owner, repo, {
    name_pattern: TAG_RULE,
    whitelist_usernames: [owner],
  });
  const id = (created.data as { id?: number } | undefined)?.id;
  if (id === undefined) {
    log.warn("tag protection created without an id; cannot empty whitelist", {
      owner,
      repo,
    });
    return;
  }
  await client.repos.repoEditTagProtection(owner, repo, id, {
    whitelist_usernames: [],
  });
}

async function listBranchRules(
  client: GiteaApi<unknown>,
  owner: string,
  repo: string,
): Promise<BranchProtectionSummary[]> {
  const res = await client.repos.repoListBranchProtection(owner, repo);
  return (res.data ?? []) as BranchProtectionSummary[];
}

async function listTagRules(
  client: GiteaApi<unknown>,
  owner: string,
  repo: string,
): Promise<Array<{ id?: number; name_pattern?: string; whitelist_usernames?: string[] }>> {
  const res = await client.repos.repoListTagProtection(owner, repo);
  return (res.data ?? []) as Array<{
    id?: number;
    name_pattern?: string;
    whitelist_usernames?: string[];
  }>;
}

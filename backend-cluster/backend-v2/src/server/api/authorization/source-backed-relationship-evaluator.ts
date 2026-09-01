import type { DbExecutor } from "@/drizzle/drizzle";
import type { IModels } from "@/foundation/models";
import type { IGiteaClientFactory } from "@/foundation/clients/gitea-client-factory";
import { parseLedgerId } from "@/shared/str";
import {
  LEDGER_RELATIONSHIPS,
  parseAuthorizationResource,
  userResource,
  USER_RELATIONSHIPS,
  type AuthorizationResource,
  type AuthorizationRelationship,
} from "./authorization-contract";

export interface RelationshipCheck {
  user: `user:${string}`;
  relation: AuthorizationRelationship;
  object: AuthorizationResource;
}

export interface IRelationshipEvaluator {
  check(input: RelationshipCheck): Promise<boolean>;
}

const USER_RELATIONSHIP_SET = new Set<AuthorizationRelationship>(
  Object.values(USER_RELATIONSHIPS),
);

const deniedGiteaStatus = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return false;
  }
  const status = (error as { status?: unknown }).status;
  return status === 403 || status === 404;
};

/**
 * Evaluates migrated relationships directly from authoritative backend facts.
 * Nothing is persisted or cached here.
 */
export class SourceBackedRelationshipEvaluator implements IRelationshipEvaluator {
  constructor(
    private readonly db: DbExecutor,
    private readonly models: Pick<IModels, "apiKey">,
    private readonly giteaClientFactory: IGiteaClientFactory,
  ) {}

  public async check(input: RelationshipCheck): Promise<boolean> {
    const resource = parseAuthorizationResource(input.object);
    if (!resource) return false;

    if (resource.type === "user") {
      if (!USER_RELATIONSHIP_SET.has(input.relation)) {
        return false;
      }
      return input.user === userResource(resource.id);
    }

    // The locator is resolved to its owner's User resource. Missing and
    // foreign ids both become the same relationship denial.
    if (resource.type === "api_key") {
      if (input.relation !== USER_RELATIONSHIPS.WRITE_CREDENTIALS) return false;
      const apiKey = await this.models.apiKey.findById(this.db, resource.id);
      return Boolean(apiKey && input.user === userResource(apiKey.userId));
    }

    if (input.relation !== LEDGER_RELATIONSHIPS.READ_CONTENTS) return false;
    const userId = input.user.slice("user:".length);
    const { ledgerOwner, ledgerName } = parseLedgerId(resource.id);
    const client = await this.giteaClientFactory.getUserApiClient(userId);
    try {
      const response = await client.repos.repoGet(ledgerOwner, ledgerName, {
        format: "json",
      });
      return Boolean(response.data);
    } catch (error) {
      if (deniedGiteaStatus(error)) return false;
      throw error;
    }
  }
}

import type { DbExecutor } from "@/drizzle/drizzle";
import type { IModels } from "@/foundation/models";
import {
  parseAuthorizationResource,
  userResource,
  USER_RELATIONSHIPS,
  type AuthorizationResource,
  type UserRelationship,
} from "./authorization-contract";

export interface RelationshipCheck {
  user: `user:${string}`;
  relation: UserRelationship;
  object: AuthorizationResource;
}

export interface IRelationshipEvaluator {
  check(input: RelationshipCheck): Promise<boolean>;
}

const USER_RELATIONSHIP_SET = new Set<UserRelationship>(
  Object.values(USER_RELATIONSHIPS),
);

/**
 * Evaluates the user domain directly from authoritative backend facts.
 * Nothing is persisted or cached here.
 */
export class SourceBackedRelationshipEvaluator implements IRelationshipEvaluator {
  constructor(
    private readonly db: DbExecutor,
    private readonly models: Pick<IModels, "apiKey">,
  ) {}

  public async check(input: RelationshipCheck): Promise<boolean> {
    if (!USER_RELATIONSHIP_SET.has(input.relation)) return false;

    const resource = parseAuthorizationResource(input.object);
    if (!resource) return false;

    if (resource.type === "user") {
      return input.user === userResource(resource.id);
    }

    // The locator is resolved to its owner's User resource. Missing and
    // foreign ids both become the same relationship denial.
    const apiKey = await this.models.apiKey.findById(this.db, resource.id);
    return Boolean(apiKey && input.user === userResource(apiKey.userId));
  }
}

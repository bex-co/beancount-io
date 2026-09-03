import type { DbExecutor } from "@/drizzle/drizzle";
import type { IModels } from "@/foundation/models";
import type { IGiteaClientFactory } from "@/foundation/clients/gitea-client-factory";
import { parseLedgerId } from "@/shared/str";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import { assertLedgerAccess } from "@/features/ledger/utils/ledger-access-check";
import { isTempAssetOwnedBy } from "@/features/s3/temp-asset-key";
import { DomainError, ErrorCategory } from "@/shared/errors";
import {
  LEDGER_RELATIONSHIPS,
  parseAuthorizationResource,
  TEMP_ASSET_RELATIONSHIPS,
  userResource,
  USER_RELATIONSHIPS,
  type AuthorizationRelationship,
  type AuthorizationResource,
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
const LEDGER_RELATIONSHIP_RANK: Readonly<
  Partial<Record<AuthorizationRelationship, number>>
> = {
  [LEDGER_RELATIONSHIPS.READ_CONTENTS]: 0,
  [LEDGER_RELATIONSHIPS.READ_ASSETS]: 0,
  [LEDGER_RELATIONSHIPS.WRITE_CONTENTS]: 1,
  [LEDGER_RELATIONSHIPS.WRITE_ASSETS]: 1,
  [LEDGER_RELATIONSHIPS.WRITE_AI]: 1,
  [LEDGER_RELATIONSHIPS.READ_BANK_CONNECTIONS]: 2,
  [LEDGER_RELATIONSHIPS.READ]: 0,
  [LEDGER_RELATIONSHIPS.WRITE]: 1,
  [LEDGER_RELATIONSHIPS.ADMIN]: 2,
};
const PERMISSION_RANK = { read: 0, write: 1, admin: 2 } as const;

const LEDGER_SOURCE_RELATIONSHIP_SET = new Set<AuthorizationRelationship>([
  LEDGER_RELATIONSHIPS.READ_ADMINISTRATION,
  LEDGER_RELATIONSHIPS.WRITE_ADMINISTRATION,
  LEDGER_RELATIONSHIPS.READ_COLLABORATORS,
  LEDGER_RELATIONSHIPS.WRITE_COLLABORATORS,
]);

const deniedGiteaStatus = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return false;
  }
  const status = (error as { status?: unknown }).status;
  return status === 403 || status === 404;
};

/**
 * Evaluates migrated domains directly from their authoritative backend facts.
 * Nothing is persisted or cached here.
 */
export class SourceBackedRelationshipEvaluator implements IRelationshipEvaluator {
  constructor(
    private readonly db: DbExecutor,
    private readonly models: Pick<IModels, "apiKey" | "user">,
    private readonly giteaClientFactory: IGiteaClientFactory,
    private readonly favaClientFactory: IFavaClientFactory,
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

    const userId = input.user.slice("user:".length);
    if (resource.type === "temp_asset") {
      return (
        input.relation === TEMP_ASSET_RELATIONSHIPS.OWNER &&
        isTempAssetOwnedBy(resource.id, userId)
      );
    }

    const requiredRank = LEDGER_RELATIONSHIP_RANK[input.relation];
    if (requiredRank !== undefined) {
      try {
        const { permission } = await assertLedgerAccess(
          resource.id,
          userId,
          {
            db: this.db,
            models: this.models,
            favaClientFactory: this.favaClientFactory,
          },
          { sourceFailures: "throw" },
        );
        return PERMISSION_RANK[permission] >= requiredRank;
      } catch (error) {
        if (
          error instanceof DomainError &&
          [
            ErrorCategory.FORBIDDEN,
            ErrorCategory.NOT_FOUND,
            ErrorCategory.UNAUTHENTICATED,
          ].includes(error.category)
        ) {
          return false;
        }
        throw error;
      }
    }

    let ledgerOwner: string;
    let ledgerName: string;
    try {
      ({ ledgerOwner, ledgerName } = parseLedgerId(resource.id));
    } catch {
      return false;
    }
    try {
      if (input.relation === LEDGER_RELATIONSHIPS.LEAVE) {
        const user = await this.models.user.getById(this.db, userId);
        if (!user || user.ledger_username === ledgerOwner) return false;
        await this.giteaClientFactory
          .getAdminApiClient()
          .repos.repoCheckCollaborator(
            ledgerOwner,
            ledgerName,
            user.ledger_username,
          );
        return true;
      }

      if (!LEDGER_SOURCE_RELATIONSHIP_SET.has(input.relation)) return false;
      const client = await this.giteaClientFactory.getUserApiClient(userId);
      const response = await client.repos.repoGet(ledgerOwner, ledgerName, {
        format: "json",
      });
      if (input.relation === LEDGER_RELATIONSHIPS.READ_CONTENTS) {
        return Boolean(response.data);
      }
      if (
        input.relation === LEDGER_RELATIONSHIPS.READ_ADMINISTRATION ||
        input.relation === LEDGER_RELATIONSHIPS.WRITE_ADMINISTRATION ||
        input.relation === LEDGER_RELATIONSHIPS.READ_COLLABORATORS ||
        input.relation === LEDGER_RELATIONSHIPS.WRITE_COLLABORATORS
      ) {
        return response.data?.permissions?.admin === true;
      }
      return false;
    } catch (error) {
      if (deniedGiteaStatus(error)) return false;
      throw error;
    }
  }
}

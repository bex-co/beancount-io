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
  parseBankConnectionResource,
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
  /** Evaluate one action's composite relationships from one fresh snapshot. */
  checkAll?(inputs: readonly RelationshipCheck[]): Promise<boolean>;
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
  LEDGER_RELATIONSHIPS.READ_CONTENTS,
  LEDGER_RELATIONSHIPS.WRITE_CONTENTS,
  LEDGER_RELATIONSHIPS.READ_ASSETS,
  LEDGER_RELATIONSHIPS.WRITE_ASSETS,
  LEDGER_RELATIONSHIPS.WRITE_AI,
  LEDGER_RELATIONSHIPS.READ_ADMINISTRATION,
  LEDGER_RELATIONSHIPS.WRITE_ADMINISTRATION,
  LEDGER_RELATIONSHIPS.READ_COLLABORATORS,
  LEDGER_RELATIONSHIPS.WRITE_COLLABORATORS,
  LEDGER_RELATIONSHIPS.READ_BANK_CONNECTIONS,
  LEDGER_RELATIONSHIPS.WRITE_BANK_CONNECTIONS,
]);

const deniedGiteaStatus = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return false;
  }
  const status = (error as { status?: unknown }).status;
  return status === 403 || status === 404;
};

/**
 * Evaluates protected domains directly from their authoritative backend facts.
 * Nothing is persisted or cached here.
 */
export class SourceBackedRelationshipEvaluator implements IRelationshipEvaluator {
  constructor(
    private readonly db: DbExecutor,
    private readonly models: Pick<IModels, "apiKey" | "user" | "plaidItem">,
    private readonly giteaClientFactory: IGiteaClientFactory,
    private readonly favaClientFactory: IFavaClientFactory,
  ) {}

  public async check(input: RelationshipCheck): Promise<boolean> {
    return this.checkAll([input]);
  }

  public async checkAll(
    inputs: readonly RelationshipCheck[],
  ): Promise<boolean> {
    const input = inputs[0];
    if (!input) return true;
    if (
      inputs.some(
        (candidate) =>
          candidate.user !== input.user || candidate.object !== input.object,
      )
    ) {
      return false;
    }
    const relations = inputs.map((candidate) => candidate.relation);
    const resource = parseAuthorizationResource(input.object);
    if (!resource) return false;

    if (resource.type === "user") {
      if (!relations.every((relation) => USER_RELATIONSHIP_SET.has(relation))) {
        return false;
      }
      return input.user === userResource(resource.id);
    }

    // The locator is resolved to its owner's User resource. Missing and
    // foreign ids both become the same relationship denial.
    if (resource.type === "api_key") {
      if (
        !relations.every(
          (relation) => relation === USER_RELATIONSHIPS.WRITE_CREDENTIALS,
        )
      ) {
        return false;
      }
      const apiKey = await this.models.apiKey.findById(this.db, resource.id);
      return Boolean(apiKey && input.user === userResource(apiKey.userId));
    }

    const userId = input.user.slice("user:".length);
    if (resource.type === "temp_asset") {
      return (
        relations.every(
          (relation) => relation === TEMP_ASSET_RELATIONSHIPS.OWNER,
        ) && isTempAssetOwnedBy(resource.id, userId)
      );
    }

    if (
      !relations.every(
        (relation) =>
          relation === LEDGER_RELATIONSHIPS.LEAVE ||
          LEDGER_SOURCE_RELATIONSHIP_SET.has(relation) ||
          LEDGER_RELATIONSHIP_RANK[relation] !== undefined,
      )
    ) {
      return false;
    }

    const requiredRanks = relations
      .map((relation) => LEDGER_RELATIONSHIP_RANK[relation])
      .filter((rank): rank is number => rank !== undefined);
    if (
      resource.type === "ledger" &&
      userId !== "anonymous" &&
      requiredRanks.length === relations.length
    ) {
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
        return requiredRanks.every(
          (requiredRank) => PERMISSION_RANK[permission] >= requiredRank,
        );
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

    const bankResource =
      resource.type === "bank_connection"
        ? parseBankConnectionResource(input.object)
        : undefined;
    if (resource.type === "bank_connection" && !bankResource) return false;
    if (resource.type !== "ledger" && resource.type !== "bank_connection") {
      return false;
    }
    const ledgerId = bankResource?.ledgerId ?? resource.id;
    let ledgerOwner: string;
    let ledgerName: string;
    try {
      ({ ledgerOwner, ledgerName } = parseLedgerId(ledgerId));
    } catch {
      return false;
    }
    try {
      if (relations.includes(LEDGER_RELATIONSHIPS.LEAVE)) {
        if (
          resource.type !== "ledger" ||
          relations.some((relation) => relation !== LEDGER_RELATIONSHIPS.LEAVE)
        ) {
          return false;
        }
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

      const anonymous = userId === "anonymous";
      const client = anonymous
        ? this.giteaClientFactory.getAdminApiClient()
        : await this.giteaClientFactory.getUserApiClient(userId);
      const response = await client.repos.repoGet(ledgerOwner, ledgerName, {
        format: "json",
      });
      const repo = response.data;
      if (!repo) return false;
      if (anonymous) {
        return (
          repo.private === false &&
          relations.every(
            (relation) =>
              relation === LEDGER_RELATIONSHIPS.READ_CONTENTS ||
              relation === LEDGER_RELATIONSHIPS.READ_ASSETS,
          )
        );
      }
      if (bankResource?.plaidItemIds.length) {
        if (repo.id === undefined) return false;
        for (const itemId of bankResource.plaidItemIds) {
          const item = await this.models.plaidItem.getById(this.db, itemId);
          if (
            !item ||
            item.userId !== userId ||
            item.ledgerRepoId !== repo.id
          ) {
            return false;
          }
        }
      }
      return relations.every((relation) => {
        switch (relation) {
          case LEDGER_RELATIONSHIPS.READ_CONTENTS:
          case LEDGER_RELATIONSHIPS.READ_ASSETS:
            return true;
          case LEDGER_RELATIONSHIPS.WRITE_CONTENTS:
          case LEDGER_RELATIONSHIPS.WRITE_ASSETS:
          case LEDGER_RELATIONSHIPS.WRITE_AI:
            return repo.permissions?.push === true;
          case LEDGER_RELATIONSHIPS.READ_ADMINISTRATION:
          case LEDGER_RELATIONSHIPS.WRITE_ADMINISTRATION:
          case LEDGER_RELATIONSHIPS.READ_COLLABORATORS:
          case LEDGER_RELATIONSHIPS.WRITE_COLLABORATORS:
          case LEDGER_RELATIONSHIPS.READ_BANK_CONNECTIONS:
          case LEDGER_RELATIONSHIPS.WRITE_BANK_CONNECTIONS:
            return repo.permissions?.admin === true;
          default:
            return false;
        }
      });
    } catch (error) {
      if (deniedGiteaStatus(error)) return false;
      throw error;
    }
  }
}

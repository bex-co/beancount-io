import {
  FavaApiError,
  LedgerCreate,
  FavaApiClient,
  favaApiErrorToDomainError,
  unwrapFavaResponse,
} from "@/foundation/fava";
import { generateGiteaUrl } from "@/shared/gitea-utils";
import type { OperationClass } from "@/server/api/identity";
import { Ledger } from "@/features/ledger/api/resolvers/ledger-resolver.types";
import { AppConfig } from "@/config/config";
import type { IModels } from "@/foundation/models";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { IStripeService } from "@/features/stripe/service/stripe-service";
import {
  FavaLedgerPublic,
  mapFavaPermission,
} from "@/features/ledger/types/fava-api.types";
import {
  getTierLimits,
  TIER_DISPLAY_NAMES,
} from "@/features/stripe/service/stripe";
import { getUserTier } from "@/features/stripe/operations/get-user-tier";
import { countOwnedLedgers } from "@/features/ledger/operations/owned-ledgers";
import {
  NotFoundError,
  ResourceLimitReachedError,
  ServiceUnavailableError,
} from "@/shared/errors";

function ledgerApiError(operation: string, cause?: unknown): Error {
  if (cause instanceof FavaApiError) {
    return favaApiErrorToDomainError(cause, operation);
  }
  return new ServiceUnavailableError("Ledger API");
}

/**
 * Params for {@link createLedger}. Deps are injected explicitly (not via
 * `IService`) so the operation is trivially testable. `favaApiClient` and
 * `stripe` are forwarded by the caller (`ctx.service.getFavaApiContext(...)`
 * and `ctx.service.stripe`) — see the service conventions in backend-v2/AGENTS.md.
 */
export type CreateLedgerParams = {
  favaApiClient: FavaApiClient;
  models: Pick<IModels, "user" | "paidCustomer">;
  postgresDb: NodePgDatabase;
  stripe: IStripeService;
  config: Pick<AppConfig, "gitea">;
  ledgerCreate: LedgerCreate;
  userId: string;
  platform?: "web" | "mobile";
  capabilities?: ReadonlySet<OperationClass>;
};

/**
 * Cross-service operation: create a ledger for a user, enforcing their
 * subscription tier's ledger limit. Composes the Fava ledger API + the tier
 * lookup (`getUserTier` + pure `getTierLimits`). Lives in `operations/` because
 * it orchestrates more than one service.
 */
export async function createLedger({
  favaApiClient,
  models,
  postgresDb,
  stripe,
  config,
  ledgerCreate,
  userId,
  platform = "web",
  capabilities,
}: CreateLedgerParams): Promise<Ledger> {
  const user = await models.user.getById(postgresDb, userId);
  if (!user) {
    throw new NotFoundError("User", userId);
  }

  // The mobile app is exempt from the ledger limit (PRFAQ005).
  if (platform !== "mobile") {
    const tier = await getUserTier({ stripe, userId });
    const { maxLedgers } = getTierLimits(tier);
    if (maxLedgers !== -1) {
      const owned = await countOwnedLedgers(
        favaApiClient,
        user.ledger_username,
        {
          stopAt: maxLedgers,
          makeError: (cause) => ledgerApiError("list ledgers", cause),
        },
      );
      if (owned >= maxLedgers) {
        throw new ResourceLimitReachedError(
          "Ledger",
          maxLedgers,
          owned,
          // A downgrade can leave more than the limit, so state the limit.
          `Your ${TIER_DISPLAY_NAMES[tier]} plan allows ${maxLedgers} ${maxLedgers === 1 ? "ledger" : "ledgers"}, and you own ${owned}. Upgrade for more, or delete one you no longer need.`,
        );
      }
    }
  }

  const data = (await unwrapFavaResponse(
    favaApiClient.ledgers.createLedger(ledgerCreate),
    "create ledger",
    (cause) => ledgerApiError("create ledger", cause),
  )) as FavaLedgerPublic;

  const giteaUrl = generateGiteaUrl(config.gitea, data.full_name);

  return {
    id: data.full_name,
    name: data.name,
    fullName: data.full_name,
    sshUrl: giteaUrl.sshUrl,
    httpUrl: giteaUrl.httpUrl,
    empty: data.empty,
    private: data.private,
    size: data.size,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    description: data.description,
    permissions: mapFavaPermission(data.permissions, capabilities),
  };
}

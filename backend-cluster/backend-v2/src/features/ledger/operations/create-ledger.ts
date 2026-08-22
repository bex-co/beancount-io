import {
  LedgerCreate,
  FavaApiClient,
  unwrapFavaResponse,
} from "@/foundation/fava";
import { generateGiteaUrl } from "@/shared/gitea-utils";
import { Ledger } from "@/features/ledger/api/resolvers/ledger-resolver.types";
import { AppConfig } from "@/config/config";
import type { IModels } from "@/foundation/models";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { IStripeService } from "@/features/stripe/service/stripe-service";
import {
  FavaLedgerPublic,
  mapFavaPermission,
} from "@/features/ledger/types/fava-api.types";
import { getTierLimits } from "@/features/stripe/service/stripe";
import { getUserTier } from "@/features/stripe/operations/get-user-tier";
import {
  NotFoundError,
  ResourceLimitReachedError,
  ServiceUnavailableError,
} from "@/shared/errors";

/**
 * Params for {@link createLedger}. Deps are injected explicitly (not via
 * `IService`) so the operation is trivially testable. `favaApiClient` and
 * `stripe` are forwarded by the caller (`ctx.service.getFavaApiContext(...)`
 * and `ctx.service.stripe`) — see the service conventions in backend-v2/CLAUDE.md.
 */
export type CreateLedgerParams = {
  favaApiClient: FavaApiClient;
  models: Pick<IModels, "user" | "paidCustomer">;
  postgresDb: NodePgDatabase;
  stripe: IStripeService;
  config: Pick<AppConfig, "gitea">;
  ledgerCreate: LedgerCreate;
  userId: string;
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
}: CreateLedgerParams): Promise<Ledger> {
  const listLedgersData = await unwrapFavaResponse(
    favaApiClient.ledgers.listLedgers({
      page: 1,
      limit: 10,
    }),
    "list ledgers",
    () => new ServiceUnavailableError("Ledger API"),
  );

  const user = await models.user.getById(postgresDb, userId);
  if (!user) {
    throw new NotFoundError("User", userId);
  }

  const userLedgers = listLedgersData.filter((ledger) =>
    ledger.full_name?.startsWith(`${user.ledger_username}/`),
  );

  // Check tier-based ledger limit
  const userTier = await getUserTier({ stripe, models, postgresDb, userId });
  const tierLimits = getTierLimits(userTier);

  if (userLedgers.length >= tierLimits.maxLedgers) {
    throw new ResourceLimitReachedError(
      "Ledger",
      tierLimits.maxLedgers,
      userLedgers.length,
    );
  }

  const data = (await unwrapFavaResponse(
    favaApiClient.ledgers.createLedger(ledgerCreate),
    "create ledger",
    () => new ServiceUnavailableError("Ledger API"),
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
    permissions: mapFavaPermission(data.permissions),
  };
}

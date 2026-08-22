import type { DbExecutor } from "@/drizzle/drizzle";
import type { IModels } from "@/foundation/models/types";
import type { IStripeService } from "@/features/stripe/service/stripe-service";
import { getUserTierLimits } from "@/features/stripe/operations/get-user-tier";
import type { CacheHelper } from "@/shared/cache";
import { NotFoundError } from "@/shared/errors";

/** Everything the lookup needs, so callers outside `AdminService` can supply it. */
export interface DirectiveLimitLookupDeps {
  models: Pick<IModels, "user" | "paidCustomer">;
  db: DbExecutor;
  stripe: IStripeService;
  cacheHelper: CacheHelper;
}

/**
 * A ledger owner's directive allowance: their tier's `maxDirectives`, or `-1`
 * for unlimited.
 *
 * Extracted from `AdminService.getLedgerDirectiveLimit` so the git proxy can ask
 * the same question in-process without an HTTP hop, and — more importantly —
 * without a second implementation. Reading `TIER_LIMITS` directly instead would
 * skip the mobile bypass ticket below and quietly start limiting mobile users
 * (ADR 0005; the two-implementations trap is the w1/m15 lesson).
 *
 * Throws `NotFoundError` when no user owns `ledgerUsername`. Enforcement points
 * fail open on that, deliberately — see `evaluateDirectiveLimit`.
 */
export async function lookupDirectiveLimit(
  deps: DirectiveLimitLookupDeps,
  ledgerUsername: string,
): Promise<{ maxDirectives: number }> {
  const user = await deps.models.user.getUserByUsername(
    deps.db,
    ledgerUsername,
  );
  if (!user) {
    throw new NotFoundError("User", ledgerUsername);
  }


  const tierLimits = await getUserTierLimits({
    stripe: deps.stripe,
    models: { paidCustomer: deps.models.paidCustomer },
    postgresDb: deps.db,
    userId: user.id,
  });

  return { maxDirectives: tierLimits.maxDirectives };
}

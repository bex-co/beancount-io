import type { IModels } from "@/foundation/models";
import type { DbExecutor } from "@/drizzle/drizzle";
import { getTierLimits } from "@/features/stripe/service/stripe";
import { getUserTier } from "@/features/stripe/operations/get-user-tier";
import {
  NotFoundError,
  ConflictError,
  InternalServerError,
} from "@/shared/errors";
import { countOwnedLedgers } from "@/features/ledger/operations/owned-ledgers";
import type Stripe from "stripe";
import { lock, LOCK_KEYS } from "@/shared/lock";
import { ReportStatus } from "@/features/auth/utils/report-status";
import { assertValidUsername } from "@/features/auth/utils/username-rule";
import type { IStripeService } from "@/features/stripe/service/stripe-service";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { IPlaidClient } from "@/features/plaid/service/plaid-client";
import { decryptToken } from "@/features/plaid/utils/encryption";
import { logger } from "@/shared/logger";
import { ValidationError } from "@/shared/errors";
import { isSupportedCurrency } from "@/features/ledger/setup";
import type { Identity } from "@/server/api/identity";
import {
  AUTHORIZATION_ACTIONS,
  type IAuthorizationService,
  userResource,
} from "@/server/api/authorization";

const accountLogger = logger.child({ module: "account-service" });

type UserLimits = {
  ledgersUsed: number;
  ledgersMax: number;
  collaboratorsPerLedgerMax: number;
  maxDirectives: number;
};

/**
 * An updateProfile request. Names are written as before, an omitted one as
 * empty, unless the request carries only `defaultCurrency`: a currency-only
 * update leaves the names alone. `defaultCurrency: null` clears it.
 */
export type ProfileUpdate = {
  firstName?: string | null;
  lastName?: string | null;
  defaultCurrency?: string | null;
};

export type UserProfile = {
  id: string;
  email: string;
  locale: string;
  firstName: string;
  lastName: string;
  /**
   * ADR026 saved currency preference, or null. A suggestion for creation
   * flows only: API creation never reads it.
   */
  defaultCurrency: string | null;
  /** Uploaded avatar, falling back to the email's Gravatar. */
  avatarUrl: string;
  emailReportStatus: ReportStatus;
  username: string;
  tier: string;
  limits: UserLimits;
  /** Whether the user has ever had a subscription (past or present). */
  hasEverSubscribed: boolean;
};

/**
 * One collaborator-search match. `email` is set only when the searcher typed
 * that email: usernames are public, so echoing the email for a username match
 * would turn any handle into its owner's private address.
 */
export type UserSearchMatch = {
  username: string;
  email: string | null;
};

export interface IAccountService {
  getUserProfile(
    identity: Identity,
    targetUserId: string,
  ): Promise<UserProfile | null>;
  updateUsername(
    identity: Identity,
    username: string,
  ): Promise<UserProfile | null>;
  updateEmail(userId: string, email: string): Promise<void>;
  updateProfile(
    identity: Identity,
    update: ProfileUpdate,
  ): Promise<UserProfile | null>;
  deleteAccount(identity: Identity): Promise<boolean>;
  findUsersByEmailOrUsername(
    identity: Identity,
    keyword: string,
    includeCurrentUser: boolean,
  ): Promise<UserSearchMatch[]>;
}

/** The ledger service's answer for a user that is already gone. */
function isAlreadyPurged(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { status?: unknown }).status === 404
  );
}

export class AccountService implements IAccountService {
  constructor(
    private readonly models: Pick<
      IModels,
      | "user"
      | "paidCustomer"
      | "jwt"
      | "oauthGrant"
      | "emailToken"
      | "plaidItem"
      | "apiKey"
    >,
    private readonly db: DbExecutor,
    private readonly stripe: IStripeService,
    private readonly favaClientFactory: IFavaClientFactory,
    private readonly plaidClient: IPlaidClient,
    private readonly authorization: IAuthorizationService,
  ) {}

  public getUserProfile = async (
    identity: Identity,
    targetUserId: string,
  ): Promise<UserProfile | null> => {
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.USER_PROFILE_READ,
      resource: userResource(targetUserId),
    });
    return this.loadUserProfile(targetUserId);
  };

  private loadUserProfile = async (
    userId: string,
  ): Promise<UserProfile | null> => {
    const user = await this.models.user.getById(this.db, userId);
    if (!user) {
      return null;
    }

    const [tier, paidCustomers, ledgersUsed] = await Promise.all([
      getUserTier({
        stripe: this.stripe,
        userId,
      }),
      // A paidCustomer row is created on checkout completion and persists after
      // cancellation, so its existence marks that the user has ever subscribed.
      this.models.paidCustomer.findByUserId(this.db, userId),
      this.favaClientFactory.getApiContext(userId).then(({ favaApiClient }) =>
        countOwnedLedgers(favaApiClient, user.ledger_username).catch(
          // A profile still loads when the ledger service cannot list.
          (error: unknown) => {
            accountLogger.warn(
              "Could not count owned ledgers for the profile",
              {
                errorType: error instanceof Error ? error.name : typeof error,
              },
            );
            return 0;
          },
        ),
      ),
    ]);
    const tierLimits = getTierLimits(tier);
    const hasEverSubscribed = paidCustomers.length > 0;

    return {
      id: user.id,
      email: user.email,
      locale: user.locale,
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      defaultCurrency: user.defaultCurrency ?? null,
      avatarUrl: user.avatarUrl,
      // Report subscription has been removed - return OFF for API compatibility
      emailReportStatus: ReportStatus.OFF,
      username: user.ledger_username ?? "",
      tier,
      limits: {
        ledgersUsed,
        ledgersMax: tierLimits.maxLedgers,
        collaboratorsPerLedgerMax: tierLimits.maxCollaboratorsPerLedger,
        maxDirectives: tierLimits.maxDirectives,
      },
      hasEverSubscribed,
    };
  };

  public updateUsername = async (
    identity: Identity,
    username: string,
  ): Promise<UserProfile | null> => {
    const { userId } = identity;
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.USER_PROFILE_UPDATE,
      resource: userResource(userId),
    });
    // Before the conflict check and the git-host rename: a name sign-up would
    // refuse was otherwise stored, or failed upstream as a generic error.
    assertValidUsername(username);
    const lockKey = LOCK_KEYS.USER.updateUsername(userId);
    await lock.acquire(lockKey, async () => {
      const user = await this.models.user.getById(this.db, userId);
      if (!user) {
        throw new NotFoundError("User", userId);
      }

      const existingUser = await this.models.user.getUserByUsername(
        this.db,
        username,
      );
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictError("Username", username);
      }

      await this.db.transaction(async (tx) => {
        await this.models.user.updateUsername(tx, userId, username);
        const favaAdminApiClient = this.favaClientFactory.getAdminClient();
        await favaAdminApiClient.admin.renameUser(user.ledger_username, {
          new_username: username,
        });
      });
    });
    return this.loadUserProfile(userId);
  };

  public updateEmail = async (userId: string, email: string): Promise<void> => {
    const normalizedEmail = email.toLowerCase().trim();
    const lockKey = LOCK_KEYS.USER.updateEmail(userId);
    await lock.acquire(lockKey, async () => {
      const user = await this.models.user.getById(this.db, userId);
      if (!user) {
        throw new NotFoundError("User", userId);
      }

      if (user.email === normalizedEmail) {
        return;
      }

      const existingUser = await this.models.user.getByMail(
        this.db,
        normalizedEmail,
      );
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictError("Email", normalizedEmail);
      }

      await this.db.transaction(async (tx) => {
        await this.models.user.updateUser(tx, userId, {
          email: normalizedEmail,
        });
        const favaAdminApiClient = this.favaClientFactory.getAdminClient();
        await favaAdminApiClient.admin.editUser(user.ledger_username, {
          login_name: user.ledger_username,
          source_id: 0,
          email: normalizedEmail,
        });
        accountLogger.info("Updated ledger account email", {
          userId,
          ledgerUsername: user.ledger_username,
          email: normalizedEmail,
        });

        const paidCustomers = await this.models.paidCustomer.findByUserId(
          tx,
          userId,
        );
        for (const paidCustomer of paidCustomers) {
          try {
            await this.stripe.updateCustomerEmail(
              paidCustomer.stripeCustomerId,
              paidCustomer.clientId,
              normalizedEmail,
            );
            await this.models.paidCustomer.updateCustomerById(
              tx,
              paidCustomer.id,
              { email: normalizedEmail },
            );
          } catch (error) {
            // If this throws, the Postgres transaction rolls back, but the
            // ledger account update above and any earlier Stripe customers
            // in this loop already took effect and cannot be rolled back.
            // Log which paid customer failed so the resulting mismatch can
            // be diagnosed and manually reconciled.
            accountLogger.error(
              "Failed to sync updated email to Stripe customer",
              {
                userId,
                paidCustomerId: paidCustomer.id,
                stripeCustomerId: paidCustomer.stripeCustomerId,
                clientId: paidCustomer.clientId,
                error,
              },
            );
            throw error;
          }
        }
      });
    });
  };

  public updateProfile = async (
    identity: Identity,
    update: ProfileUpdate,
  ): Promise<UserProfile | null> => {
    const { userId } = identity;
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.USER_PROFILE_UPDATE,
      resource: userResource(userId),
    });
    const user = await this.models.user.getById(this.db, userId);
    if (!user) {
      throw new NotFoundError("User", userId);
    }
    const { firstName, lastName, defaultCurrency } = update;
    if (
      defaultCurrency !== undefined &&
      defaultCurrency !== null &&
      !isSupportedCurrency(defaultCurrency)
    ) {
      throw new ValidationError(
        "defaultCurrency",
        `Unsupported currency "${defaultCurrency}"; use an ISO 4217 code a new ledger can take`,
      );
    }
    const currencyOnly =
      defaultCurrency !== undefined &&
      firstName === undefined &&
      lastName === undefined;
    // One statement, so a profile change lands whole.
    await this.models.user.updateUser(this.db, userId, {
      ...(currencyOnly
        ? {}
        : { firstName: firstName ?? "", lastName: lastName ?? "" }),
      ...(defaultCurrency !== undefined ? { defaultCurrency } : {}),
    });
    return this.loadUserProfile(userId);
  };

  public deleteAccount = async (identity: Identity): Promise<boolean> => {
    const { userId } = identity;
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.USER_DELETE,
      resource: userResource(userId),
    });
    const user = await this.models.user.getById(this.db, userId);
    if (!user) {
      throw new NotFoundError("User", userId);
    }

    // The ledger purge goes first: it is the step most likely to fail, and
    // Stripe and Plaid below cannot be undone. Run after them, a failed purge
    // rolled the deletion back with the subscription already cancelled and
    // the banks unlinked (w21/157). A user already purged (a retry after a
    // lost response) answers 404, which is done, not a failure.
    if (user.ledger_username) {
      try {
        await this.favaClientFactory
          .getAdminClient()
          .admin.deleteUser(user.ledger_username);
      } catch (error) {
        if (!isAlreadyPurged(error)) throw error;
      }
    }

    const paidCustomers = await this.models.paidCustomer.findByUserId(
      this.db,
      userId,
    );

    if (paidCustomers.length > 0) {
      const subscriptions = await this.stripe.listSubscriptions(userId);

      type SubscriptionWithClient = Stripe.Subscription & {
        id: string;
        clientId: string;
        status?: string;
      };

      const endedStatuses = new Set(["canceled", "incomplete_expired"]);
      const cancellableSubscriptions = subscriptions.filter(
        (subscription): subscription is SubscriptionWithClient => {
          if (typeof subscription.id !== "string") return false;
          if (typeof subscription.clientId !== "string") return false;
          const { status } = subscription;
          if (typeof status === "string" && endedStatuses.has(status))
            return false;
          return true;
        },
      );

      if (cancellableSubscriptions.length > 0) {
        const cancellationResults = await Promise.all(
          cancellableSubscriptions.map((subscription: SubscriptionWithClient) =>
            this.stripe
              .deleteSubscription(
                subscription.id,
                userId,
                subscription.clientId,
              )
              .then((result: { success: boolean; message?: string }) => ({
                subscriptionId: subscription.id,
                clientId: subscription.clientId,
                result,
              })),
          ),
        );

        const failedCancellation = cancellationResults.find(
          (cancellation) => !cancellation.result.success,
        );

        if (failedCancellation) {
          throw new InternalServerError(
            failedCancellation.result.message ??
              `Failed to cancel subscription ${failedCancellation.subscriptionId} for client ${failedCancellation.clientId}`,
          );
        }
      }
    }

    const plaidItems = await this.models.plaidItem.getByUserId(this.db, userId);
    if (plaidItems.length > 0) {
      await Promise.allSettled(
        plaidItems.map(async (item) => {
          try {
            await this.plaidClient.removeItem(decryptToken(item.accessToken));
          } catch (error) {
            accountLogger.warn(
              "Failed to remove Plaid Item during account deletion (may already be removed)",
              { userId, itemId: item.id, error },
            );
          }
        }),
      );
    }

    await this.db.transaction(async (tx) => {
      await this.models.plaidItem.deleteByUserId(tx, userId);
      await this.models.paidCustomer.deleteByUserId(tx, userId);
      await this.models.jwt.deleteByUserId(tx, userId);
      // Sessions and OAuth grants alike: the provider would otherwise keep
      // minting access tokens from a deleted account's refresh token (w0/054).
      await this.models.oauthGrant.revokeAllForUser(tx, userId);
      // API keys too: `api_keys` has no foreign key to cascade from, and a
      // surviving key still resolved to the deleted identity (w21/156).
      await this.models.apiKey.deleteByUserId(tx, userId);
      await this.models.user.deleteByUserId(tx, userId);
    });

    // Delete Redis data (separate storage, outside transaction)
    await this.models.emailToken.deleteByUserId(userId);
    return true;
  };

  public findUsersByEmailOrUsername = async (
    identity: Identity,
    keyword: string,
    includeCurrentUser: boolean,
  ): Promise<UserSearchMatch[]> => {
    const { userId } = identity;
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.USER_PROFILE_SEARCH,
      resource: userResource(userId),
    });
    const users = await this.models.user.findUserByEmailOrUsername(
      this.db,
      keyword,
    );
    const normalizedKeyword = keyword.toLowerCase();
    return users
      .filter((u) => includeCurrentUser || u.id !== userId)
      .map((u) => ({
        username: u.ledger_username,
        // Mirrors the model's case-insensitive email match.
        email: u.email.toLowerCase() === normalizedKeyword ? u.email : null,
      }));
  };
}

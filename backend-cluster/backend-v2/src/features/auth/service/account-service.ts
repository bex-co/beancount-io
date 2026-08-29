import type { IModels } from "@/foundation/models";
import type { DbExecutor } from "@/drizzle/drizzle";
import { getTierLimits } from "@/features/stripe/service/stripe";
import { getUserTier } from "@/features/stripe/operations/get-user-tier";
import {
  NotFoundError,
  ConflictError,
  InternalServerError,
} from "@/shared/errors";
import type Stripe from "stripe";
import { lock, LOCK_KEYS } from "@/shared/lock";
import { ReportStatus } from "@/features/auth/utils/report-status";
import type { User } from "@/features/auth/data/user-model";
import type { IStripeService } from "@/features/stripe/service/stripe-service";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { IPlaidClient } from "@/features/plaid/service/plaid-client";
import { decryptToken } from "@/features/plaid/utils/encryption";
import { logger } from "@/shared/logger";
import {
  assertAccountDeletionIdentity,
  type Identity,
} from "@/server/api/identity";

const accountLogger = logger.child({ module: "account-service" });

type UserLimits = {
  ledgersUsed: number;
  ledgersMax: number;
  collaboratorsPerLedgerMax: number;
  maxDirectives: number;
};

type UserProfile = {
  id: string;
  email: string;
  locale: string;
  firstName: string;
  lastName: string;
  emailReportStatus: ReportStatus;
  username: string;
  tier: string;
  limits: UserLimits;
  /** Whether the user has ever had a subscription (past or present). */
  hasEverSubscribed: boolean;
};

export interface IAccountService {
  getUserProfile(userId: string): Promise<UserProfile | null>;
  updateUsername(userId: string, username: string): Promise<void>;
  updateEmail(userId: string, email: string): Promise<void>;
  updateProfile(
    userId: string,
    firstName: string,
    lastName: string,
  ): Promise<boolean>;
  deleteAccount(identity: Identity): Promise<boolean>;
  findUsersByEmailOrUsername(
    keyword: string,
    excludeUserId?: string,
  ): Promise<User[]>;
}

export class AccountService implements IAccountService {
  constructor(
    private readonly models: Pick<
      IModels,
      "user" | "paidCustomer" | "jwt" | "emailToken" | "plaidItem"
    >,
    private readonly db: DbExecutor,
    private readonly stripe: IStripeService,
    private readonly favaClientFactory: IFavaClientFactory,
    private readonly plaidClient: IPlaidClient,
  ) {}

  public getUserProfile = async (
    userId: string,
  ): Promise<UserProfile | null> => {
    const user = await this.models.user.getById(this.db, userId);
    if (!user) {
      return null;
    }

    const [tier, paidCustomers] = await Promise.all([
      getUserTier({
        stripe: this.stripe,
        models: this.models,
        postgresDb: this.db,
        userId,
      }),
      // A paidCustomer row is created on checkout completion and persists after
      // cancellation, so its existence marks that the user has ever subscribed.
      this.models.paidCustomer.findByUserId(this.db, userId),
    ]);
    const tierLimits = getTierLimits(tier);
    const hasEverSubscribed = paidCustomers.length > 0;

    const { favaApiClient } =
      await this.favaClientFactory.getApiContext(userId);
    const listLedgersResponse = await favaApiClient.ledgers.listLedgers({
      page: 1,
      limit: 100,
    });
    const ledgersUsed =
      listLedgersResponse.data?.success && listLedgersResponse.data?.data
        ? listLedgersResponse.data.data.filter((ledger) =>
            ledger.full_name?.startsWith(`${user.ledger_username}/`),
          ).length
        : 0;

    return {
      id: user.id,
      email: user.email,
      locale: user.locale,
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
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
    userId: string,
    username: string,
  ): Promise<void> => {
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
    userId: string,
    firstName: string,
    lastName: string,
  ): Promise<boolean> => {
    const user = await this.models.user.getById(this.db, userId);
    if (!user) {
      throw new NotFoundError("User", userId);
    }
    await this.models.user.updateFirstName(this.db, userId, firstName);
    await this.models.user.updateLastName(this.db, userId, lastName);
    return true;
  };

  public deleteAccount = async (identity: Identity): Promise<boolean> => {
    assertAccountDeletionIdentity(identity);
    const { userId } = identity;
    const user = await this.models.user.getById(this.db, userId);
    if (!user) {
      throw new NotFoundError("User", userId);
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
      await this.models.user.deleteByUserId(tx, userId);
      const favaAdminApiClient = this.favaClientFactory.getAdminClient();
      if (user?.ledger_username) {
        await favaAdminApiClient.admin.deleteUser(user.ledger_username);
      }
    });

    // Delete Redis data (separate storage, outside transaction)
    await this.models.emailToken.deleteByUserId(userId);
    return true;
  };

  public findUsersByEmailOrUsername = async (
    keyword: string,
    excludeUserId?: string,
  ): Promise<User[]> => {
    const users = await this.models.user.findUserByEmailOrUsername(
      this.db,
      keyword,
    );
    if (!excludeUserId) return users;
    return users.filter((u) => u.id !== excludeUserId);
  };
}

import path from "path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { IModels } from "@/foundation/models/types";
import type { DbExecutor } from "@/drizzle/drizzle";
import type { AppConfig } from "@/config/config";
import type { IAccountService } from "@/features/auth/service/account-service";
import type { IStripeService } from "@/features/stripe/service/stripe-service";
import type { ILedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { lookupDirectiveLimit } from "@/features/ledger/operations/directive-limit-lookup";
import type { CacheHelper } from "@/shared/cache";
import {
  NotFoundError,
  BadUserInputError,
  OperationNotAllowedError,
} from "@/shared/errors";

// Gmail ignores dots in the local part (p.an@gmail.com === pan@gmail.com)
function normalizeGmailDots(email: string): string {
  const [localPart, domainPart] = email.split("@");
  if (domainPart === "gmail.com" || domainPart === "googlemail.com") {
    return `${localPart.replace(/\./g, "")}@${domainPart}`;
  }
  return email;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username: string;
  isBlocked: boolean;
  lastSeenAt?: string;
  createAt?: string;
}

export interface AdminPaidUser extends AdminUser {
  stripeCustomerId: string;
  currentPeriodEnd: string;
}

interface AdminPaidCustomerDetail {
  clientId: string;
  stripeCustomerId: string;
  email?: string;
  name?: string;
  phone?: string;
  currentPeriodEnd?: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminSubscriptionItemDetail {
  id: string;
  priceId: string;
  productId?: string;
  quantity: number;
  unitAmount?: number;
  currency: string;
  interval: string;
}

interface AdminSubscriptionDetail {
  id: string;
  clientId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelAt?: string;
  canceledAt?: string;
  items: AdminSubscriptionItemDetail[];
}

export interface UserDetailFromAdminPerspective {
  user: AdminUser & { avatarUrl: string; locale: string };
  paidCustomers: AdminPaidCustomerDetail[];
  subscriptions: AdminSubscriptionDetail[];
}

export interface AdminUserLedger {
  id: string;
  name: string;
  fullName: string;
  private: boolean;
  empty: boolean;
  size: number;
  createdAt: string;
  updatedAt: string;
  // null means the per-ledger directive count fetch failed.
  directiveCount: number | null;
}

export interface IAdminService {
  getSignupOtp(email: string): Promise<{ otp: string; expireAt: string }>;
  listRecentUsers(params: {
    limit: number;
    offset: number;
    sinceHours: number;
  }): Promise<{
    users: AdminUser[];
    pagination: { limit: number; offset: number; count: number };
  }>;
  listActivePaidUsers(params: {
    limit: number;
    offset: number;
    clientId: string;
  }): Promise<{
    users: AdminPaidUser[];
    pagination: { limit: number; offset: number; total: number };
  }>;
  getStats(): Promise<{ totalUsers: number; activePaidUsers: number }>;
  loginAs(email: string): Promise<{ redirectUrl: string }>;
  runMigrations(): Promise<void>;
  unblockUser(email: string): Promise<{ message: string }>;
  fixUserEmail(
    email: string,
    expectedEmail: string,
  ): Promise<{ message: string }>;
  getUserDetail(email: string): Promise<UserDetailFromAdminPerspective>;
  getLedgerDirectiveLimit(
    ledgerUsername: string,
  ): Promise<{ maxDirectives: number }>;
  getUserLedgers(email: string): Promise<{ ledgers: AdminUserLedger[] }>;
}

export class AdminService implements IAdminService {
  constructor(
    private readonly models: Pick<
      IModels,
      "user" | "signupOtpSession" | "magicLinkToken" | "paidCustomer"
    >,
    private readonly db: DbExecutor,
    private readonly config: Pick<AppConfig, "dashboard">,
    private readonly accountService: IAccountService,
    private readonly stripe: IStripeService,
    private readonly ledgerWorkflow: ILedgerWorkflow,
    private readonly cacheHelper: CacheHelper,
  ) {}

  async getSignupOtp(
    email: string,
  ): Promise<{ otp: string; expireAt: string }> {
    const session = await this.models.signupOtpSession.getSessionByEmail(email);
    if (!session) {
      throw new NotFoundError("Signup session", email);
    }
    return { otp: session.otp, expireAt: session.expireAt };
  }

  async listRecentUsers(params: {
    limit: number;
    offset: number;
    sinceHours: number;
  }): Promise<{
    users: AdminUser[];
    pagination: { limit: number; offset: number; count: number };
  }> {
    const { limit, offset, sinceHours } = params;
    const { users, total } = await this.models.user.getRecentlySeenUsers(
      this.db,
      { sinceHours, limit, offset },
    );
    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        username: u.ledger_username,
        isBlocked: u.isBlocked,
        lastSeenAt: u.lastSeenAt?.toISOString(),
        createAt: u.createAt?.toISOString(),
      })),
      pagination: { limit, offset, count: total },
    };
  }

  async listActivePaidUsers(params: {
    limit: number;
    offset: number;
    clientId: string;
  }): Promise<{
    users: AdminPaidUser[];
    pagination: { limit: number; offset: number; total: number };
  }> {
    const { limit, offset, clientId } = params;
    const { users, total } =
      await this.models.paidCustomer.listWithActivePeriod(this.db, {
        limit,
        offset,
        clientId,
      });
    return {
      users: users.map((u) => ({
        id: u.userId,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        username: u.ledgerUsername,
        isBlocked: u.isBlocked,
        lastSeenAt: u.lastSeenAt?.toISOString(),
        createAt: u.createAt?.toISOString(),
        stripeCustomerId: u.stripeCustomerId,
        currentPeriodEnd: u.currentPeriodEnd.toISOString(),
      })),
      pagination: { limit, offset, total },
    };
  }

  async getStats(): Promise<{ totalUsers: number; activePaidUsers: number }> {
    const [totalUsers, activePaidUsers] = await Promise.all([
      this.models.user.countUsers(this.db),
      this.models.paidCustomer.countWithActivePeriod(this.db),
    ]);
    return { totalUsers, activePaidUsers };
  }

  async loginAs(email: string): Promise<{ redirectUrl: string }> {
    const user = await this.models.user.getByMail(this.db, email);
    if (!user) {
      throw new NotFoundError("User", email);
    }
    if (user.isBlocked) {
      throw new OperationNotAllowedError(
        "login-as",
        `User ${email} is blocked`,
      );
    }
    const oneTimeToken = await this.models.magicLinkToken.regenerateToken(
      user.id,
    );
    return {
      redirectUrl: `${this.config.dashboard.url}/auth/callback?oneTimeToken=${oneTimeToken.id}`,
    };
  }

  async runMigrations(): Promise<void> {
    const migrationsFolder = path.resolve(
      __dirname,
      "../../../drizzle/migrations",
    );
    await migrate(this.db, { migrationsFolder });
  }

  async unblockUser(email: string): Promise<{ message: string }> {
    const user = await this.models.user.getByMail(this.db, email);
    if (!user) {
      throw new NotFoundError("User", email);
    }
    if (!user.isBlocked) {
      return { message: `User ${email} is already unblocked` };
    }
    await this.models.user.updateUser(this.db, user.id, { isBlocked: false });
    return { message: `User ${email} unblocked successfully` };
  }

  async fixUserEmail(
    email: string,
    expectedEmail: string,
  ): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedExpectedEmail = expectedEmail.toLowerCase().trim();

    if (
      normalizeGmailDots(normalizedExpectedEmail) !==
      normalizeGmailDots(normalizedEmail)
    ) {
      throw new BadUserInputError(
        "expectedEmail must be the same Gmail address as email, differing only by dots",
      );
    }

    const user = await this.models.user.getByMail(this.db, normalizedEmail);
    if (!user) {
      throw new NotFoundError("User", normalizedEmail);
    }

    if (user.email === normalizedExpectedEmail) {
      return { message: `User ${normalizedEmail} email is already correct` };
    }

    await this.accountService.updateEmail(user.id, normalizedExpectedEmail);

    return {
      message: `User email updated from ${normalizedEmail} to ${normalizedExpectedEmail}`,
    };
  }

  async getUserDetail(email: string): Promise<UserDetailFromAdminPerspective> {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.models.user.getByMail(this.db, normalizedEmail);
    if (!user) {
      throw new NotFoundError("User", normalizedEmail);
    }

    const [paidCustomers, stripeSubscriptions] = await Promise.all([
      this.models.paidCustomer.findByUserId(this.db, user.id),
      this.stripe.listSubscriptions(user.id),
    ]);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.ledger_username,
        isBlocked: user.isBlocked,
        lastSeenAt: user.lastSeenAt?.toISOString(),
        createAt: user.createAt?.toISOString(),
        avatarUrl: user.avatarUrl,
        locale: user.locale,
      },
      paidCustomers: paidCustomers.map((pc) => ({
        clientId: pc.clientId,
        stripeCustomerId: pc.stripeCustomerId,
        email: pc.email,
        name: pc.name,
        phone: pc.phone,
        currentPeriodEnd: pc.currentPeriodEnd?.toISOString(),
        createdAt: pc.createdAt.toISOString(),
        updatedAt: pc.updatedAt.toISOString(),
      })),
      subscriptions: stripeSubscriptions.map((sub) => {
        const firstItem = sub.items.data[0];
        return {
          id: sub.id,
          clientId: sub.clientId,
          status: sub.status,
          currentPeriodStart: new Date(
            (firstItem?.current_period_start ?? sub.start_date) * 1000,
          ).toISOString(),
          currentPeriodEnd: new Date(
            (firstItem?.current_period_end ?? 0) * 1000,
          ).toISOString(),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          cancelAt: sub.cancel_at
            ? new Date(sub.cancel_at * 1000).toISOString()
            : undefined,
          canceledAt: sub.canceled_at
            ? new Date(sub.canceled_at * 1000).toISOString()
            : undefined,
          items: sub.items.data.map((item) => ({
            id: item.id,
            priceId: item.price.id,
            productId:
              typeof item.price.product === "string"
                ? item.price.product
                : item.price.product?.id,
            quantity: item.quantity ?? 1,
            unitAmount: item.price.unit_amount ?? undefined,
            currency: item.price.currency,
            interval: item.price.recurring?.interval ?? "month",
          })),
        };
      }),
    };
  }

  async getLedgerDirectiveLimit(
    ledgerUsername: string,
  ): Promise<{ maxDirectives: number }> {
    // Delegates so the git proxy can answer the same question in-process
    // without a second implementation drifting from this one (ADR 0005).
    return lookupDirectiveLimit(
      {
        models: this.models,
        db: this.db,
        stripe: this.stripe,
        cacheHelper: this.cacheHelper,
      },
      ledgerUsername,
    );
  }

  async getUserLedgers(email: string): Promise<{ ledgers: AdminUserLedger[] }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.models.user.getByMail(this.db, normalizedEmail);
    if (!user) {
      throw new NotFoundError("User", normalizedEmail);
    }

    const ledgers =
      await this.ledgerWorkflow.listUserOwnedLedgersWithDirectiveCounts({
        userId: user.id,
      });

    return {
      ledgers: ledgers.map((ledger) => ({
        id: ledger.id,
        name: ledger.name,
        fullName: ledger.fullName,
        private: ledger.private,
        empty: ledger.empty,
        size: ledger.size,
        createdAt: ledger.createdAt,
        updatedAt: ledger.updatedAt,
        directiveCount: ledger.directiveCount,
      })),
    };
  }
}

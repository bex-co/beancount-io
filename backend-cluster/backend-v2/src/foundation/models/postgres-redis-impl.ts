import { type NodePgDatabase } from "drizzle-orm/node-postgres";
import { type Cache } from "cache-manager";
import { AppConfig } from "@/config/config";
import { PaidCustomerPostgresModel } from "@/features/stripe/data/paid-customer-model";
import { ApiKeyPostgresModel } from "@/features/apikeys/data/api-key-model";
import { AuditEventPostgresModel } from "@/features/audit/data/audit-event-model";
import { JwtPostgresModel } from "@/features/auth/data/jwt-model";
import { EmailTokenRedisModel } from "@/features/auth/data/email-token-model";
import { MagicLinkTokenRedisModel } from "@/features/auth/data/magic-link-token-model";
import { SignupOtpSessionRedisModel } from "@/features/auth/data/signup-otp-session-model";
import { UserPostgresModel } from "@/features/auth/data/user-model";
import { PlaidItemPostgresModel } from "@/features/plaid/data/plaid-item-model";
import { PlaidAccountPostgresModel } from "@/features/plaid/data/plaid-account-model";
import { PlaidTransactionPostgresModel } from "@/features/plaid/data/plaid-transaction-model";
import { PlaidSyncLogPostgresModel } from "@/features/plaid/data/plaid-sync-log-model";
import { FeatureUsagePostgresModel } from "@/features/feature-usage/data/feature-usage-model";
import { CliAuthSessionRedisModel } from "@/features/auth/data/cli-auth-session-model";
import { IModels } from "./types";

export class PostgresRedisImpl implements IModels {
  public paidCustomer: PaidCustomerPostgresModel;
  public apiKey: ApiKeyPostgresModel;
  public auditEvent: AuditEventPostgresModel;

  public jwt: JwtPostgresModel;

  public emailToken: EmailTokenRedisModel;

  public magicLinkToken: MagicLinkTokenRedisModel;

  public signupOtpSession: SignupOtpSessionRedisModel;

  public user: UserPostgresModel;

  public plaidItem: PlaidItemPostgresModel;

  public plaidAccount: PlaidAccountPostgresModel;

  public plaidTransaction: PlaidTransactionPostgresModel;

  public plaidSyncLog: PlaidSyncLogPostgresModel;

  public featureUsage: FeatureUsagePostgresModel;

  public cliAuthSession: CliAuthSessionRedisModel;

  constructor(
    public postgres: NodePgDatabase,
    public cache: Cache,
    public config: AppConfig,
  ) {
    this.plaidItem = new PlaidItemPostgresModel();
    this.plaidAccount = new PlaidAccountPostgresModel();
    this.plaidTransaction = new PlaidTransactionPostgresModel();
    this.plaidSyncLog = new PlaidSyncLogPostgresModel();
    this.featureUsage = new FeatureUsagePostgresModel();

    this.user = new UserPostgresModel();
    this.paidCustomer = new PaidCustomerPostgresModel();
    this.apiKey = new ApiKeyPostgresModel();
    this.auditEvent = new AuditEventPostgresModel();

    this.jwt = new JwtPostgresModel({
      secret: this.config.jwt.secret,
      expMins: this.config.jwt.expMins,
    });

    // Initialize Redis models
    this.emailToken = new EmailTokenRedisModel({
      cache: this.cache,
      expMins: 5, // 5 mins
    });
    this.magicLinkToken = new MagicLinkTokenRedisModel({ cache: this.cache });
    this.signupOtpSession = new SignupOtpSessionRedisModel({
      cache: this.cache,
    });
    this.cliAuthSession = new CliAuthSessionRedisModel({ cache: this.cache });
  }
}

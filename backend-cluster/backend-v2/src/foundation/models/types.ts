import { IPaidCustomerModel } from "@/features/stripe/data/paid-customer-model";
import type { IApiKeyModel } from "@/features/apikeys/data/api-key-model";
import type { IAuditEventModel } from "@/features/audit/data/audit-event-model";
import { IJwtModel } from "@/features/auth/data/jwt-model";
import { IEmailTokenModel } from "@/features/auth/data/email-token-model";
import { IMagicLinkTokenModel } from "@/features/auth/data/magic-link-token-model";
import { ISignupOtpSessionModel } from "@/features/auth/data/signup-otp-session-model";
import { IUserModel } from "@/features/auth/data/user-model";
import { IPlaidItemModel } from "@/features/plaid/data/plaid-item-model";
import { IPlaidAccountModel } from "@/features/plaid/data/plaid-account-model";
import { IPlaidTransactionModel } from "@/features/plaid/data/plaid-transaction-model";
import { IPlaidSyncLogModel } from "@/features/plaid/data/plaid-sync-log-model";
import { IFeatureUsageModel } from "@/features/feature-usage/data/feature-usage-model";
import { ICliAuthSessionModel } from "@/features/auth/data/cli-auth-session-model";

/**
 * Database-agnostic models container interface.
 *
 * This interface provides access to all data models used in the application.
 * All model properties are typed as interfaces (not concrete classes) to support
 * dependency inversion and allow for different implementations.
 */
export interface IModels {
  paidCustomer: IPaidCustomerModel;
  apiKey: IApiKeyModel;
  auditEvent: IAuditEventModel;
  cliAuthSession: ICliAuthSessionModel;
  jwt: IJwtModel;
  emailToken: IEmailTokenModel;
  magicLinkToken: IMagicLinkTokenModel;
  signupOtpSession: ISignupOtpSessionModel;
  user: IUserModel;
  plaidItem: IPlaidItemModel;
  plaidAccount: IPlaidAccountModel;
  plaidTransaction: IPlaidTransactionModel;
  plaidSyncLog: IPlaidSyncLogModel;
  featureUsage: IFeatureUsageModel;
}

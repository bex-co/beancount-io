/**
 * Common types for the Plaid feature
 * This file centralizes type definitions used across the Plaid integration
 */

// ============================================================================
// Domain Types
// ============================================================================

/**
 * Plaid item status
 */
export type PlaidItemStatus = "active" | "requires_reauth" | "disabled";

/**
 * Plaid sync type
 */
export type PlaidSyncType = "manual" | "webhook" | "scheduled";

/**
 * Plaid sync status
 */
export type PlaidSyncStatus = "success" | "partial" | "failed";

// ============================================================================
// PlaidClient Return Types
// ============================================================================

/**
 * Result of exchanging a public token for an access token
 */
export interface PlaidTokenExchangeResult {
  accessToken: string;
  itemId: string;
}

/**
 * Error information from Plaid
 */
export interface PlaidError {
  errorCode: string;
  errorMessage: string;
}

/**
 * Result of getting item details
 */
export interface PlaidItemDetails {
  itemId: string;
  institutionId: string | null;
  error: PlaidError | null;
}

/**
 * Account information from Plaid
 */
export interface PlaidAccountInfo {
  accountId: string;
  name: string;
  type: string;
  subtype: string | null;
  mask: string | null;
}

/**
 * Transaction from Plaid API
 */
export interface PlaidApiTransaction {
  transactionId: string;
  accountId: string;
  amount: number;
  date: string;
  name: string;
  merchantName: string | null;
  category: string[] | null;
  isPending: boolean;
  pendingTransactionId: string | null;
}

/**
 * Result of transaction sync operation
 */
export interface PlaidTransactionsSyncResult {
  added: PlaidApiTransaction[];
  modified: PlaidApiTransaction[];
  removed: Array<{ transactionId: string }>;
  nextCursor: string;
  hasMore: boolean;
}

/**
 * Institution details from Plaid
 */
export interface PlaidInstitutionDetails {
  name: string;
}

// ============================================================================
// Re-export Data Model Types for Convenience
// ============================================================================

export type {
  PlaidItem,
  CreatePlaidItemInput,
  UpdatePlaidItemInput,
} from "./data/plaid-item-model/types";

export type {
  PlaidAccount,
  CreatePlaidAccountInput,
  UpdatePlaidAccountInput,
} from "./data/plaid-account-model/types";

export type {
  PlaidTransaction,
  CreatePlaidTransactionInput,
  UpdatePlaidTransactionInput,
} from "./data/plaid-transaction-model/types";

export type {
  PlaidSyncLog,
  CreatePlaidSyncLogInput,
} from "./data/plaid-sync-log-model/types";

// ============================================================================
// Mapper Types
// ============================================================================

/**
 * Beancount transaction format
 */
export interface BeancountTransaction {
  date: string;
  flag: string;
  payee?: string;
  narration?: string;
  postings: Array<{
    units: { number: string; currency: string };
    account: string;
    price?: { number: string; currency: string } | null;
    flag?: string;
  }>;
  tags?: string[];
  links?: string[];
}

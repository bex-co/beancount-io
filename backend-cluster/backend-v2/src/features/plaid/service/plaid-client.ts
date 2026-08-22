import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  type LinkTokenCreateRequest,
  type ItemPublicTokenExchangeRequest,
  type ItemGetRequest,
  type AccountsGetRequest,
  type TransactionsSyncRequest,
  type ItemRemoveRequest,
  type InstitutionsGetByIdRequest,
  type WebhookVerificationKeyGetRequest,
} from "plaid";
import type { PlaidConfig } from "@/config/config";
import { logger } from "@/shared/logger";
import type {
  PlaidTokenExchangeResult,
  PlaidItemDetails,
  PlaidAccountInfo,
  PlaidTransactionsSyncResult,
  PlaidInstitutionDetails,
} from "../types";
import { PLAID_COUNTRY_CODES } from "../utils/plaid-constants";

const plaidLogger = logger.child({ module: "plaid-client" });

export interface IPlaidClient {
  createLinkToken(userId: string): Promise<string>;
  createUpdateModeLinkToken(
    userId: string,
    accessToken: string,
    options?: { accountSelectionEnabled?: boolean },
  ): Promise<string>;
  exchangePublicToken(publicToken: string): Promise<PlaidTokenExchangeResult>;
  getItem(accessToken: string): Promise<PlaidItemDetails>;
  getAccounts(accessToken: string): Promise<PlaidAccountInfo[]>;
  transactionsSync(
    accessToken: string,
    cursor?: string,
  ): Promise<PlaidTransactionsSyncResult>;
  getInstitution(institutionId: string): Promise<PlaidInstitutionDetails>;
  removeItem(accessToken: string): Promise<void>;
  getWebhookVerificationKey(keyId: string): Promise<Record<string, unknown>>;
}

export class PlaidClient implements IPlaidClient {
  private client: PlaidApi;
  private plaidConfig: PlaidConfig;

  constructor(plaidConfig: PlaidConfig) {
    this.plaidConfig = plaidConfig;
    const configuration = new Configuration({
      basePath: PlaidEnvironments[plaidConfig.environment],
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": plaidConfig.clientId,
          "PLAID-SECRET": plaidConfig.secret,
          "Plaid-Version": "2020-09-14",
        },
        timeout: 5000, // 5 seconds
      },
    });

    this.client = new PlaidApi(configuration);
    plaidLogger.debug("Plaid client initialized", {
      environment: plaidConfig.environment,
    });
  }

  /**
   * Create a Link token for the frontend to initialize Plaid Link
   */
  async createLinkToken(userId: string): Promise<string> {
    const request: LinkTokenCreateRequest = {
      user: { client_user_id: userId },
      client_name: "Beancount.io",
      products: [Products.Transactions],
      country_codes: PLAID_COUNTRY_CODES,
      language: "en",
    };
    if (this.plaidConfig.webhookUrl) {
      request.webhook = this.plaidConfig.webhookUrl;
    }
    const response = await this.client.linkTokenCreate(request);
    plaidLogger.debug("Link token created", { userId });
    return response.data.link_token;
  }

  /**
   * Create a Link token in update mode.
   *
   * Two use cases share this token shape:
   * - Reauthentication, when an Item's status is "requires_reauth".
   * - Account Select, when the user wants to add or remove accounts under an
   *   already-linked institution (pass `accountSelectionEnabled`).
   */
  async createUpdateModeLinkToken(
    userId: string,
    accessToken: string,
    options?: { accountSelectionEnabled?: boolean },
  ): Promise<string> {
    const request: LinkTokenCreateRequest = {
      user: { client_user_id: userId },
      client_name: "Beancount.io",
      access_token: accessToken,
      country_codes: PLAID_COUNTRY_CODES,
      language: "en",
      // `products` is deliberately omitted — Plaid requires it to be absent
      // when `access_token` is set.
    };
    if (this.plaidConfig.webhookUrl) {
      request.webhook = this.plaidConfig.webhookUrl;
    }
    if (options?.accountSelectionEnabled) {
      // Only load-bearing for US/CA institutions that either do not use OAuth
      // or lack their own account selection pane. Most OAuth institutions show
      // Account Select in update mode regardless of this flag.
      request.update = { account_selection_enabled: true };
    }

    const response = await this.client.linkTokenCreate(request);
    plaidLogger.debug("Update mode link token created", {
      userId,
      accountSelectionEnabled: !!options?.accountSelectionEnabled,
    });
    return response.data.link_token;
  }

  /**
   * Exchange a public token from Plaid Link for an access token
   */
  async exchangePublicToken(
    publicToken: string,
  ): Promise<PlaidTokenExchangeResult> {
    const request: ItemPublicTokenExchangeRequest = {
      public_token: publicToken,
    };

    const response = await this.client.itemPublicTokenExchange(request);
    plaidLogger.debug("Public token exchanged", {
      itemId: response.data.item_id,
    });
    return {
      accessToken: response.data.access_token,
      itemId: response.data.item_id,
    };
  }

  /**
   * Get Item details (status, institution info, etc.)
   */
  async getItem(accessToken: string): Promise<PlaidItemDetails> {
    const request: ItemGetRequest = {
      access_token: accessToken,
    };

    const response = await this.client.itemGet(request);
    const item = response.data.item;

    return {
      itemId: item.item_id,
      institutionId: item.institution_id ?? null,
      error: item.error
        ? {
            errorCode: item.error.error_code,
            errorMessage: item.error.error_message,
          }
        : null,
    };
  }

  /**
   * Get accounts for an Item
   */
  async getAccounts(accessToken: string): Promise<PlaidAccountInfo[]> {
    const request: AccountsGetRequest = {
      access_token: accessToken,
    };

    const response = await this.client.accountsGet(request);

    return response.data.accounts.map((account) => ({
      accountId: account.account_id,
      name: account.name,
      type: account.type,
      subtype: account.subtype ?? null,
      mask: account.mask ?? null,
    }));
  }

  /**
   * Sync transactions using cursor-based pagination
   * Returns added, modified, removed transactions and next cursor
   */
  async transactionsSync(
    accessToken: string,
    cursor?: string,
  ): Promise<PlaidTransactionsSyncResult> {
    const request: TransactionsSyncRequest = {
      access_token: accessToken,
      cursor: cursor,
    };

    const response = await this.client.transactionsSync(request);

    plaidLogger.debug("Transactions synced", {
      added: response.data.added.length,
      modified: response.data.modified.length,
      removed: response.data.removed.length,
      hasMore: response.data.has_more,
    });

    return {
      added: response.data.added.map((tx) => ({
        transactionId: tx.transaction_id,
        accountId: tx.account_id,
        amount: tx.amount,
        date: tx.date,
        name: tx.name,
        merchantName: tx.merchant_name ?? null,
        category: tx.category ?? null,
        isPending: tx.pending,
        pendingTransactionId: tx.pending_transaction_id ?? null,
      })),
      modified: response.data.modified.map((tx) => ({
        transactionId: tx.transaction_id,
        accountId: tx.account_id,
        amount: tx.amount,
        date: tx.date,
        name: tx.name,
        merchantName: tx.merchant_name ?? null,
        category: tx.category ?? null,
        isPending: tx.pending,
        pendingTransactionId: tx.pending_transaction_id ?? null,
      })),
      removed: response.data.removed.map((tx) => ({
        transactionId: tx.transaction_id,
      })),
      nextCursor: response.data.next_cursor,
      hasMore: response.data.has_more,
    };
  }

  /**
   * Get institution details by ID
   */
  async getInstitution(
    institutionId: string,
  ): Promise<PlaidInstitutionDetails> {
    const request: InstitutionsGetByIdRequest = {
      institution_id: institutionId,
      country_codes: PLAID_COUNTRY_CODES,
    };

    const response = await this.client.institutionsGetById(request);
    return {
      name: response.data.institution.name,
    };
  }

  /**
   * Remove (unlink) an Item from Plaid
   */
  async removeItem(accessToken: string): Promise<void> {
    const request: ItemRemoveRequest = {
      access_token: accessToken,
    };

    await this.client.itemRemove(request);
    plaidLogger.info("Item removed from Plaid");
  }

  /**
   * Get webhook verification key (JWK) for signature verification
   * Used to verify the Plaid-Verification JWT header in webhook requests
   *
   * @param keyId - The kid (key ID) from the JWT header
   * @returns JWK public key for signature verification
   */
  async getWebhookVerificationKey(
    keyId: string,
  ): Promise<Record<string, unknown>> {
    const request: WebhookVerificationKeyGetRequest = {
      key_id: keyId,
    };

    const response = await this.client.webhookVerificationKeyGet(request);
    plaidLogger.debug("Webhook verification key retrieved", { keyId });

    // Convert JWKPublicKey to a plain object
    return response.data.key as unknown as Record<string, unknown>;
  }
}

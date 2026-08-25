import { logger } from "@/shared/logger";
import { systemIdentity } from "@/server/api/identity";
import type { DbExecutor } from "@/drizzle/drizzle";
import type { IModels } from "@/foundation/models";
import type { PlaidWebhookRequest } from "../api/rest/plaid-webhook-schemas";
import type { IPlaidSyncService } from "./plaid-sync-service";

const webhookLogger = logger.child({ module: "plaid-webhook-service" });

/**
 * Plaid's webhook payloads carry more fields than we parse into columns; the
 * untouched JSON is kept in `rawBody`. Everything read out of it is optional,
 * so a malformed body yields null rather than throwing.
 */
function parseRawBody(rawBody?: string): Record<string, unknown> | null {
  if (!rawBody) return null;
  try {
    const parsed: unknown = JSON.parse(rawBody);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function readStringField(
  rawBody: string | undefined,
  field: string,
): string | undefined {
  const value = parseRawBody(rawBody)?.[field];
  return typeof value === "string" && value ? value : undefined;
}

export interface IPlaidWebhookService {
  handleEvent(event: PlaidWebhookRequest): Promise<void>;
}

export class PlaidWebhookService implements IPlaidWebhookService {
  constructor(
    private readonly models: Pick<IModels, "plaidItem" | "plaidAccount">,
    private readonly db: DbExecutor,
    private readonly plaidSyncService: IPlaidSyncService,
  ) {}

  async handleEvent(event: PlaidWebhookRequest): Promise<void> {
    const { webhook_type, webhook_code, item_id } = event;

    webhookLogger.info("Processing Plaid webhook event", {
      webhook_type,
      webhook_code,
      item_id,
    });

    switch (webhook_type) {
      case "TRANSACTIONS":
        await this.handleTransactionsWebhook(event);
        break;
      case "ITEM":
        await this.handleItemWebhook(event);
        break;
      default:
        webhookLogger.warn("Unhandled webhook type", {
          webhook_type,
          webhook_code,
          item_id,
        });
    }
  }

  private async handleTransactionsWebhook(
    event: PlaidWebhookRequest,
  ): Promise<void> {
    const { webhook_code, item_id } = event;

    const item = await this.models.plaidItem.getByItemId(this.db, item_id);
    if (!item) {
      webhookLogger.warn("TRANSACTIONS webhook for unknown Item", { item_id });
      return;
    }

    const { id: itemDbId, userId } = item;

    switch (webhook_code) {
      case "SYNC_UPDATES_AVAILABLE":
      case "DEFAULT_UPDATE":
      case "INITIAL_UPDATE":
      case "HISTORICAL_UPDATE": {
        webhookLogger.info("Transaction updates available, triggering sync", {
          item_id,
          userId,
          webhook_code,
        });

        this.plaidSyncService
          .syncItemTransactions(systemIdentity(userId), itemDbId, "webhook")
          .then(() => {
            webhookLogger.info("Webhook-triggered sync completed", { item_id });
          })
          .catch((err) => {
            webhookLogger.error("Webhook-triggered sync failed", {
              item_id,
              error: err,
            });
          });
        break;
      }

      case "TRANSACTIONS_REMOVED": {
        webhookLogger.info("Transactions removed webhook received", {
          item_id,
        });
        this.plaidSyncService
          .syncItemTransactions(systemIdentity(userId), itemDbId, "webhook")
          .catch((err) => {
            webhookLogger.error("Sync failed after transactions removed", {
              item_id,
              error: err,
            });
          });
        break;
      }

      default:
        webhookLogger.warn("Unhandled TRANSACTIONS webhook code", {
          webhook_code,
          item_id,
        });
    }
  }

  private async handleItemWebhook(event: PlaidWebhookRequest): Promise<void> {
    const { webhook_code, item_id } = event;

    const item = await this.models.plaidItem.getByItemId(this.db, item_id);
    if (!item) {
      webhookLogger.warn("ITEM webhook for unknown Item", { item_id });
      return;
    }

    const itemDbId = item.id;

    switch (webhook_code) {
      case "ERROR": {
        const parsed = parseRawBody(event.rawBody);
        const error = parsed?.error as
          | { error_code: string; error_message: string }
          | undefined;

        if (error) {
          webhookLogger.warn("Item error reported", { item_id, error });
          await this.models.plaidItem.update(this.db, itemDbId, {
            status: "requires_reauth",
            errorCode: error.error_code,
            errorMessage: error.error_message,
          });
        }
        break;
      }

      case "ITEM_LOGIN_REQUIRED":
      case "PENDING_DISCONNECT":
      case "PENDING_EXPIRATION": {
        webhookLogger.warn("Item pending expiration", { item_id });
        await this.models.plaidItem.update(this.db, itemDbId, {
          status: "requires_reauth",
        });
        break;
      }

      case "LOGIN_REPAIRED": {
        webhookLogger.info("Item login repaired", { item_id });
        await this.models.plaidItem.update(this.db, itemDbId, {
          status: "active",
          errorCode: null,
          errorMessage: null,
        });
        break;
      }

      // Item-level: the user revoked access to the whole Item, so the entire
      // connection goes. Do NOT merge USER_ACCOUNT_REVOKED into this branch —
      // that one is account-scoped and carries its own account_id.
      case "USER_PERMISSION_REVOKED":
        webhookLogger.warn("User permission revoked for Item", { item_id });
        await this.models.plaidItem.delete(this.db, itemDbId);
        break;

      // Account-level: the user revoked one account at their bank's portal.
      // Deleting the Item here would destroy every other account under the same
      // bank along with all of their transactions.
      case "USER_ACCOUNT_REVOKED": {
        const accountId = readStringField(event.rawBody, "account_id");
        if (!accountId) {
          // Without an account_id there is nothing safe to do. Never fall back
          // to deleting the Item.
          webhookLogger.error(
            "USER_ACCOUNT_REVOKED without account_id; leaving Item untouched",
            { item_id },
          );
          break;
        }

        const account = await this.models.plaidAccount.getByAccountId(
          this.db,
          accountId,
        );
        if (!account) {
          // Already gone (e.g. removed by a reconcile) — nothing to do.
          webhookLogger.info("USER_ACCOUNT_REVOKED for unknown account", {
            item_id,
            accountId,
          });
          break;
        }

        if (account.plaidItemId !== itemDbId) {
          webhookLogger.error(
            "USER_ACCOUNT_REVOKED account belongs to a different Item",
            { item_id, accountId, accountItemId: account.plaidItemId },
          );
          break;
        }

        // The delete cascades to this account's transactions and cannot be
        // undone, so leave a trail.
        webhookLogger.warn("Deleting revoked Plaid account", {
          item_id,
          id: account.id,
          accountId: account.accountId,
          accountName: account.accountName,
          mask: account.mask,
          ledgerAccount: account.ledgerAccount,
        });
        await this.models.plaidAccount.delete(this.db, account.id);
        break;
      }

      default:
        webhookLogger.warn("Unhandled ITEM webhook code", {
          webhook_code,
          item_id,
        });
    }
  }
}

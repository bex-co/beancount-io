import DataLoader from "dataloader";
import { type IModels } from "@/foundation/models";
import { type DbExecutor } from "@/drizzle/drizzle";
import { PlaidSyncLog } from "@/features/plaid/data/plaid-sync-log-model/types";

export interface GraphQLLoaders {
  plaidSyncLogsByItemId: DataLoader<string, PlaidSyncLog[], string>;
}

/**
 * Create all DataLoader instances for GraphQL context
 */
export function createLoaders(
  db: DbExecutor,
  models: Pick<IModels, "plaidSyncLog">,
): GraphQLLoaders {
  return {
    plaidSyncLogsByItemId: new DataLoader<string, PlaidSyncLog[], string>(
      async (itemIds: readonly string[]) => {
        const itemIdsArray = Array.from(itemIds);

        // Fetch latest sync log for all item IDs in a single query
        // DISTINCT ON returns exactly one (latest) log per item
        const syncLogsMap = await models.plaidSyncLog.getLatestByItemIds(
          db,
          itemIdsArray,
        );

        // Return results in the same order as input keys
        return itemIdsArray.map((itemId) => {
          const logs = syncLogsMap.get(itemId);
          return logs ?? [];
        });
      },
      {
        // Cache results for the duration of a single request
        cache: true,
      },
    ),
  };
}

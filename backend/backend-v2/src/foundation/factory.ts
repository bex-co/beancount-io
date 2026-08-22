import { SendGrid, ConsoleSendGrid } from "@/foundation/sendgrid";
import { type AppConfig } from "@/config/config";
import { createDatabaseConnection } from "@/drizzle/drizzle";
import { createRedisCache } from "@/foundation/redis/redis-utils";
import { createCacheHelper } from "@/shared/cache";
import { PostgresRedisImpl } from "./models/postgres-redis-impl";
import { PlaidClient } from "@/features/plaid/service/plaid-client";
import { FavaClientFactory } from "@/foundation/clients/fava-client-factory";
import { GiteaClientFactory } from "@/foundation/clients/gitea-client-factory";
import {
  buildServiceLayer,
  buildWorkflowLayer,
  type AppLayers,
  type DatabaseLayer,
  type ClientFactoryLayer,
} from "./composition";

/** Connects to all external services and returns fully initialized AppLayers. */
export async function buildAppLayers(config: AppConfig): Promise<AppLayers> {
  const postgresDb = await createDatabaseConnection(config.postgres.uri);
  const redisCache = await createRedisCache(config.redis.uri);
  const models = new PostgresRedisImpl(postgresDb, redisCache, config);

  const database: DatabaseLayer = { db: postgresDb, models };

  const sendGridOpts = {
    apiKey: config.sendGrid.apiKey,
    retryLimit: 2,
    defaultFrom: "Beancount.io <noreply@mail.beancount.io>",
  };
  const clients: ClientFactoryLayer = {
    favaClientFactory: new FavaClientFactory(models, postgresDb, config),
    giteaClientFactory: new GiteaClientFactory(models, postgresDb, config),
    plaidClient: new PlaidClient(config.plaid),
    sendgrid:
      config.env === "production"
        ? new SendGrid(sendGridOpts)
        : new ConsoleSendGrid(sendGridOpts),
    cacheHelper: createCacheHelper(redisCache),
  };

  const services = buildServiceLayer({ database, clients, config });
  const workflows = buildWorkflowLayer({ database, clients, services, config });
  return { database, clients, services, workflows };
}

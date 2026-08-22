import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { type AppConfig } from "@/config/config";
import { IModels } from "@/foundation/models";
import {
  createFavaApi,
  createAPIKeyFavaApi,
  FavaApiClient,
} from "@/foundation/fava";
import { FavaApiContext } from "@/foundation/types";
import { parseLedgerId } from "@/shared/str";
import { lock, LOCK_KEYS } from "@/shared/lock";
import {
  UnauthenticatedError,
  NotFoundError,
  InternalServerError,
  ForbiddenError,
} from "@/shared/errors";

/**
 * Provisions per-user / per-ledger Fava API clients. Extracted from
 * `ServerContainer` so workflows and services can depend on this narrow factory
 * without reaching for the full `IService` container. See
 * backend-v2/CLAUDE.md "Composition root".
 */
export interface IFavaClientFactory {
  getApiContext(userId: string): Promise<FavaApiContext>;
  getPublicApiClient(ledgerId: string, userId?: string): Promise<FavaApiClient>;
  /** Returns a Fava API client with admin credentials. Use with caution. */
  getAdminClient(): FavaApiClient;
}

export class FavaClientFactory implements IFavaClientFactory {
  constructor(
    private readonly models: Pick<IModels, "user">,
    private readonly db: NodePgDatabase,
    private readonly config: Pick<AppConfig, "favaApi">,
  ) {}

  /**
   * Gets the Fava API context (client + credentials) for a specific user.
   */
  public async getApiContext(userId: string): Promise<FavaApiContext> {
    const user = await this.models.user.getById(this.db, userId);
    if (!user) {
      throw new UnauthenticatedError("User not found");
    }

    const favaApiClient = createFavaApi(
      this.config.favaApi.baseUrl,
      user.ledger_username,
      user.ledger_password,
    );

    const favaUser = {
      username: user.ledger_username,
      password: user.ledger_password,
    };

    return { favaApiClient, favaUser };
  }

  /**
   * Gets a public Fava API client for a specific ledger. Handles both
   * authenticated users and public access to non-private ledgers.
   */
  public async getPublicApiClient(
    ledgerId: string,
    userId?: string,
  ): Promise<FavaApiClient> {
    if (userId) {
      const user = await this.models.user.getById(this.db, userId);
      if (!user) {
        throw new UnauthenticatedError("User not found");
      }
      return createFavaApi(
        this.config.favaApi.baseUrl,
        user.ledger_username,
        user.ledger_password,
      );
    }

    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const adminApiClient = createFavaApi(
      this.config.favaApi.baseUrl,
      this.config.favaApi.adminUser,
      this.config.favaApi.adminPassword,
    );
    const response = await adminApiClient.ledgers.getLedger(
      ledgerOwner,
      ledgerName,
    );
    if (!response.data?.success) {
      throw new NotFoundError("Invalid ledger ID");
    }
    if (response.data.data.private) {
      throw new ForbiddenError("Ledger is private");
    }
    const user = await this.models.user.getUserByUsername(this.db, ledgerOwner);
    if (!user) {
      throw new NotFoundError("Invalid ledger ID");
    }
    if (user.ledger_api_token) {
      return createAPIKeyFavaApi(
        this.config.favaApi.baseUrl,
        user.ledger_api_token,
      );
    }
    const lockKey = LOCK_KEYS.API_KEY.create(user.id);
    return lock.acquire(lockKey, async () => {
      const ledgerUser = await this.models.user.getUserByUsername(
        this.db,
        ledgerOwner,
      );
      if (!ledgerUser) {
        throw new NotFoundError("Invalid ledger ID");
      }
      if (ledgerUser.ledger_api_token) {
        return createAPIKeyFavaApi(
          this.config.favaApi.baseUrl,
          ledgerUser.ledger_api_token,
        );
      }

      const favaApiClient = createFavaApi(
        this.config.favaApi.baseUrl,
        ledgerUser.ledger_username,
        ledgerUser.ledger_password,
      );

      const response = await favaApiClient.tokens.createUserToken(
        ledgerUser.ledger_username,
        {
          name: "read:repository",
          scopes: ["read:repository"],
        },
      );
      if (!response.data?.success || !response.data.data.sha1) {
        throw new InternalServerError("Failed to create API key");
      }
      await this.models.user.updateUser(this.db, ledgerUser.id, {
        ledger_api_token: response.data.data.sha1,
      });
      return createAPIKeyFavaApi(
        this.config.favaApi.baseUrl,
        response.data.data.sha1,
      );
    });
  }

  public getAdminClient(): FavaApiClient {
    return createFavaApi(
      this.config.favaApi.baseUrl,
      this.config.favaApi.adminUser,
      this.config.favaApi.adminPassword,
    );
  }
}

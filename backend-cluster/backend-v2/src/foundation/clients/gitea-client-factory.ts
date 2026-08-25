import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { type AppConfig } from "@/config/config";
import { IModels } from "@/foundation/models";
import { Api as GiteaApi } from "@/features/gitea/client/gitea-api";
import {
  createGiteaClient,
  createAnonymousGiteaClient,
} from "@/features/gitea/service/gitea-client-factory";
import { parseLedgerId } from "@/shared/str";
import {
  UnauthenticatedError,
  NotFoundError,
  ForbiddenError,
} from "@/shared/errors";

/**
 * Provisions per-user and admin Gitea API clients. Extracted from
 * `ServerContainer` so workflows/services can depend on this narrow factory
 * instead of the full `IService` container. See backend-v2/CLAUDE.md
 * "Composition root".
 */
export interface IGiteaClientFactory {
  getPublicApiClient(
    ledgerId: string,
    userId?: string,
  ): Promise<GiteaApi<unknown>>;
  getUserApiClient(userId: string): Promise<GiteaApi<unknown>>;
  /** Returns a Gitea API client without authentication for public endpoints. */
  getAnonymousApiClient(): GiteaApi<unknown>;
  /** Returns a Gitea API client with admin credentials. Use with caution. */
  getAdminApiClient(): GiteaApi<unknown>;
}

export class GiteaClientFactory implements IGiteaClientFactory {
  constructor(
    private readonly models: Pick<IModels, "user">,
    private readonly db: NodePgDatabase,
    private readonly config: Pick<AppConfig, "favaApi">,
  ) {}

  public async getPublicApiClient(
    ledgerId: string,
    userId?: string,
  ): Promise<GiteaApi<unknown>> {
    if (userId) {
      return this.getUserApiClient(userId);
    }

    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const adminClient = this.getAdminApiClient();
    const repoResponse = await adminClient.repos.repoGet(
      ledgerOwner,
      ledgerName,
      { format: "json" },
    );

    if (!repoResponse.data) {
      throw new NotFoundError("Invalid ledger ID");
    }

    if (repoResponse.data.private) {
      throw new ForbiddenError("Ledger is private");
    }

    return createAnonymousGiteaClient();
  }

  public async getUserApiClient(userId: string): Promise<GiteaApi<unknown>> {
    const user = await this.models.user.getById(this.db, userId);
    if (!user) {
      throw new UnauthenticatedError("User not found");
    }

    return createGiteaClient(user.ledger_username, user.ledger_password);
  }

  public getAnonymousApiClient(): GiteaApi<unknown> {
    return createAnonymousGiteaClient();
  }

  public getAdminApiClient(): GiteaApi<unknown> {
    return createGiteaClient(
      this.config.favaApi.adminUser,
      this.config.favaApi.adminPassword,
    );
  }
}

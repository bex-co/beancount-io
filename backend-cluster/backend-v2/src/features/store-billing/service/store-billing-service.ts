import type { DbExecutor } from "@/drizzle/drizzle";
import type { IModels } from "@/foundation/models/types";
import {
  AUTHORIZATION_ACTIONS,
  type IAuthorizationService,
  userResource,
} from "@/server/api/authorization";
import type { Identity } from "@/server/api/identity";

/** What the app attaches to a purchase so the store evidence names the account. */
export interface StoreBillingIdentityView {
  appleAppAccountToken: string;
  googleObfuscatedAccountId: string;
}

export interface IStoreBillingService {
  /** The caller's identifiers, created on first read (ADR 001 D4). */
  storeBillingIdentity(identity: Identity): Promise<StoreBillingIdentityView>;
}

export class StoreBillingService implements IStoreBillingService {
  constructor(
    private readonly models: Pick<IModels, "billingIdentity">,
    private readonly db: DbExecutor,
    private readonly authorization: Pick<
      IAuthorizationService,
      "authorizeOrThrow"
    >,
  ) {}

  public async storeBillingIdentity(
    identity: Identity,
  ): Promise<StoreBillingIdentityView> {
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.USER_BILLING_STORE_IDENTITY_READ,
      resource: userResource(identity.userId),
    });
    const { appleAppAccountToken, googleObfuscatedAccountId } =
      await this.models.billingIdentity.findOrCreate(this.db, identity.userId);
    return { appleAppAccountToken, googleObfuscatedAccountId };
  }
}

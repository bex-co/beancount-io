import { unwrapFavaResponse } from "@/foundation/fava";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { Identity } from "@/server/api/identity";
import {
  AUTHORIZATION_ACTIONS,
  type IAuthorizationService,
  userResource,
} from "@/server/api/authorization";
import { BadUserInputError } from "@/shared/errors";

export type PublicKeyData = {
  id: number;
  fingerprint: string;
  key: string;
  lastUsedAt: string | undefined;
  title: string;
  createdAt: string;
};

export interface ILedgerPublicKeyService {
  listPublicKeys(
    identity: Identity,
    opts?: { page?: number; limit?: number },
  ): Promise<PublicKeyData[]>;

  getPublicKey(identity: Identity, keyId: number): Promise<PublicKeyData>;

  createPublicKey(
    identity: Identity,
    input: { key: string; title: string; readOnly?: boolean },
  ): Promise<PublicKeyData>;

  deletePublicKey(identity: Identity, keyId: number): Promise<{ id: number }>;
}

// GraphQL types keyId as a Float, so the adapters' schemas cannot be the only
// guard: a fractional id is truncated downstream and deletes another key.
function assertKeyId(keyId: number): void {
  if (!Number.isSafeInteger(keyId) || keyId <= 0) {
    throw new BadUserInputError("keyId must be a positive integer", "keyId");
  }
}

export class LedgerPublicKeyService implements ILedgerPublicKeyService {
  constructor(
    private readonly favaClientFactory: IFavaClientFactory,
    private readonly authorization: IAuthorizationService,
  ) {}

  async listPublicKeys(
    identity: Identity,
    opts?: { page?: number; limit?: number },
  ): Promise<PublicKeyData[]> {
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.USER_PUBLIC_KEYS_LIST,
      resource: userResource(identity.userId),
    });
    const { favaApiClient } = await this.favaClientFactory.getApiContext(
      identity.userId,
    );
    const data = await unwrapFavaResponse(
      favaApiClient.keys.listPublicKeys({
        page: opts?.page,
        limit: opts?.limit,
      }),
      "list public keys",
    );
    return data.map((key) => ({
      id: key.id,
      fingerprint: key.fingerprint,
      key: key.key,
      lastUsedAt: key.last_used_at || undefined,
      title: key.title,
      createdAt: key.created_at,
    }));
  }

  async getPublicKey(
    identity: Identity,
    keyId: number,
  ): Promise<PublicKeyData> {
    assertKeyId(keyId);
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.USER_PUBLIC_KEYS_READ,
      resource: userResource(identity.userId),
    });
    const { favaApiClient } = await this.favaClientFactory.getApiContext(
      identity.userId,
    );
    const data = await unwrapFavaResponse(
      favaApiClient.keys.getPublicKey(keyId),
      "get public key",
    );
    return {
      id: data.id,
      fingerprint: data.fingerprint,
      key: data.key,
      lastUsedAt: data.last_used_at || undefined,
      title: data.title,
      createdAt: data.created_at,
    };
  }

  async createPublicKey(
    identity: Identity,
    input: { key: string; title: string; readOnly?: boolean },
  ): Promise<PublicKeyData> {
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.USER_PUBLIC_KEYS_CREATE,
      resource: userResource(identity.userId),
    });
    const { favaApiClient } = await this.favaClientFactory.getApiContext(
      identity.userId,
    );
    const data = await unwrapFavaResponse(
      favaApiClient.keys.createPublicKey({
        key: input.key,
        title: input.title,
        read_only: input.readOnly,
      }),
      "create public key",
    );

    return {
      id: data.id,
      fingerprint: data.fingerprint,
      key: data.key,
      lastUsedAt: data.last_used_at || undefined,
      title: data.title,
      createdAt: data.created_at,
    };
  }

  async deletePublicKey(
    identity: Identity,
    keyId: number,
  ): Promise<{ id: number }> {
    assertKeyId(keyId);
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.USER_PUBLIC_KEYS_DELETE,
      resource: userResource(identity.userId),
    });
    const { favaApiClient } = await this.favaClientFactory.getApiContext(
      identity.userId,
    );
    await unwrapFavaResponse(
      favaApiClient.keys.deletePublicKey(keyId),
      "delete public key",
    );

    return { id: keyId };
  }
}

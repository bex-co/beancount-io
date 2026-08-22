import { unwrapFavaResponse } from "@/foundation/fava";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";

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
    userId: string,
    opts?: { page?: number; limit?: number },
  ): Promise<PublicKeyData[]>;

  getPublicKey(userId: string, keyId: number): Promise<PublicKeyData>;

  createPublicKey(
    userId: string,
    input: { key: string; title: string; readOnly?: boolean },
  ): Promise<PublicKeyData>;

  deletePublicKey(userId: string, keyId: number): Promise<{ id: number }>;
}

export class LedgerPublicKeyService implements ILedgerPublicKeyService {
  constructor(
    private readonly favaClientFactory: IFavaClientFactory,
  ) {}

  async listPublicKeys(
    userId: string,
    opts?: { page?: number; limit?: number },
  ): Promise<PublicKeyData[]> {
    const { favaApiClient } =
      await this.favaClientFactory.getApiContext(userId);
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

  async getPublicKey(userId: string, keyId: number): Promise<PublicKeyData> {
    const { favaApiClient } =
      await this.favaClientFactory.getApiContext(userId);
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
    userId: string,
    input: { key: string; title: string; readOnly?: boolean },
  ): Promise<PublicKeyData> {
    const { favaApiClient } =
      await this.favaClientFactory.getApiContext(userId);
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
    userId: string,
    keyId: number,
  ): Promise<{ id: number }> {
    const { favaApiClient } =
      await this.favaClientFactory.getApiContext(userId);
    await unwrapFavaResponse(
      favaApiClient.keys.deletePublicKey(keyId),
      "delete public key",
    );

    return { id: keyId };
  }
}

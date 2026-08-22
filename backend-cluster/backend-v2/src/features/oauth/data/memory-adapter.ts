import type { Adapter, AdapterPayload } from "oidc-provider";

const storage = new Map<
  string,
  Map<string, { payload: AdapterPayload; expiresAt?: number }>
>();

function getStore(
  model: string,
): Map<string, { payload: AdapterPayload; expiresAt?: number }> {
  let store = storage.get(model);
  if (!store) {
    store = new Map();
    storage.set(model, store);
  }
  return store;
}

export class MemoryAdapter implements Adapter {
  model: string;

  constructor(model: string) {
    this.model = model;
  }

  async upsert(
    id: string,
    payload: AdapterPayload,
    expiresIn: number,
  ): Promise<void> {
    getStore(this.model).set(id, {
      payload,
      ...(expiresIn ? { expiresAt: Date.now() + expiresIn * 1000 } : {}),
    });
  }

  async find(id: string): Promise<AdapterPayload | undefined> {
    const entry = getStore(this.model).get(id);
    if (!entry) return undefined;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      getStore(this.model).delete(id);
      return undefined;
    }
    return entry.payload;
  }

  async findByUserCode(userCode: string): Promise<AdapterPayload | undefined> {
    for (const entry of getStore(this.model).values()) {
      if (entry.payload.userCode !== userCode) continue;
      if (entry.expiresAt && entry.expiresAt < Date.now()) continue;
      return entry.payload;
    }
    return undefined;
  }

  async findByUid(uid: string): Promise<AdapterPayload | undefined> {
    for (const entry of getStore(this.model).values()) {
      if (entry.payload.uid !== uid) continue;
      if (entry.expiresAt && entry.expiresAt < Date.now()) continue;
      return entry.payload;
    }
    return undefined;
  }

  async consume(id: string): Promise<void> {
    const entry = getStore(this.model).get(id);
    if (entry) {
      entry.payload.consumed = Math.floor(Date.now() / 1000);
    }
  }

  async destroy(id: string): Promise<void> {
    getStore(this.model).delete(id);
  }

  async revokeByGrantId(grantId: string): Promise<void> {
    const store = getStore(this.model);
    for (const [id, entry] of store) {
      if (entry.payload.grantId === grantId) store.delete(id);
    }
  }
}

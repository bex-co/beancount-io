import type { Adapter, AdapterFactory, AdapterPayload } from "oidc-provider";
import { OAUTH_CONFIG, isMobileOAuthClient } from "./config";

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

/**
 * Whether a consumed refresh token is still inside its reuse grace window
 * (ADR 019 D5): the native app's rotated token, presented again within a few
 * seconds because the response carrying its successor never arrived.
 */
export function isWithinRefreshReuseGrace(
  payload: AdapterPayload,
  now: number = nowSeconds(),
): boolean {
  return (
    typeof payload.consumed === "number" &&
    isMobileOAuthClient(payload.clientId) &&
    now - payload.consumed <= OAUTH_CONFIG.refreshRotation.reuseGraceSeconds
  );
}

class RefreshReuseGraceAdapter implements Adapter {
  constructor(private readonly inner: Adapter) {}

  upsert(id: string, payload: AdapterPayload, expiresIn: number) {
    return this.inner.upsert(id, payload, expiresIn);
  }

  // oidc-provider revokes the grant when it finds `consumed` on a presented
  // refresh token. Inside the window the token reads as unconsumed, so the
  // exchange rotates again and hands the app a fresh successor; after the
  // window the stored `consumed` stands and reuse revokes the grant as before.
  async find(id: string): Promise<AdapterPayload | undefined> {
    const payload = await this.inner.find(id);
    if (!payload) return undefined;
    if (!isWithinRefreshReuseGrace(payload)) return payload;
    const { consumed: _consumed, ...unconsumed } = payload;
    return unconsumed;
  }

  findByUserCode(userCode: string) {
    return this.inner.findByUserCode(userCode);
  }

  findByUid(uid: string) {
    return this.inner.findByUid(uid);
  }

  // The first consumption fixes the window's start: a replay inside it must
  // not move `consumed` forward, or repeated replays would extend the window.
  async consume(id: string): Promise<void> {
    const stored = await this.inner.find(id);
    if (stored?.consumed !== undefined) return;
    await this.inner.consume(id);
  }

  destroy(id: string) {
    return this.inner.destroy(id);
  }

  revokeByGrantId(grantId: string) {
    return this.inner.revokeByGrantId(grantId);
  }
}

/** Gives the `RefreshToken` model the reuse grace window; others pass through. */
export function withRefreshReuseGrace(factory: AdapterFactory): AdapterFactory {
  return (name: string) => {
    const adapter = factory(name);
    return name === "RefreshToken"
      ? new RefreshReuseGraceAdapter(adapter)
      : adapter;
  };
}

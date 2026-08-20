/**
 * Sign-out / unauthenticated teardown: clear the session var and wipe both the
 * persisted Apollo cache and the in-memory store. Kept free of `@/` imports so
 * jest-lite can require it and prove the purge fires.
 */
export async function teardownSessionCaches(opts: {
  clearSession: () => void;
  purgePersistedCache: () => Promise<void>;
  clearInMemoryStore: () => Promise<unknown>;
}): Promise<void> {
  opts.clearSession();
  await Promise.all([
    opts.purgePersistedCache().catch(() => {}),
    opts.clearInMemoryStore().catch(() => {}),
  ]);
}

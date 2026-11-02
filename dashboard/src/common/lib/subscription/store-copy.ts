/**
 * Each store's words, keyed by the provider a billing summary or refusal
 * names. Anything that is not Google Play reads as the App Store, so every
 * screen falls back the same way.
 */
const STORE_COPY = {
  APP_STORE: {
    billedBy: "userSettings.billedByAppStore",
    upgradeIn: "common.upgradeInIosApp",
    billedTwice: "common.billedTwiceAppStore",
    deferredStart: "userSettings.deferredStartAppStore",
    overlap: "userSettings.overlapAppStore",
    refusal: "common.errors.billedByAppStore",
  },
  GOOGLE_PLAY: {
    billedBy: "userSettings.billedByGooglePlay",
    upgradeIn: "common.upgradeInAndroidApp",
    billedTwice: "common.billedTwiceGooglePlay",
    deferredStart: "userSettings.deferredStartGooglePlay",
    overlap: "userSettings.overlapGooglePlay",
    refusal: "common.errors.billedByGooglePlay",
  },
} as const;

export type StoreCopy = (typeof STORE_COPY)[keyof typeof STORE_COPY];

export const storeCopy = (provider: unknown): StoreCopy =>
  provider === "GOOGLE_PLAY" ? STORE_COPY.GOOGLE_PLAY : STORE_COPY.APP_STORE;

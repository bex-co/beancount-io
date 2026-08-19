export const config = {
  project: require("../package.json").name,
  sentryDsn: "", // TODO
  analytics: {
    googleTid: "UA-143353833-1",
    mixpanelProjectToken: "", // TODO
  },
  serverUrl: process.env.EXPO_PUBLIC_SERVER_URL || "https://beancount.io/",
  // Brand logos on transaction rows are proxied + cached through our
  // opengraph-image service, so the app has no direct third-party (logo.dev)
  // dependency and logo.dev is hit at most once per brand across all users.
  // Override per-env with EXPO_PUBLIC_LOGO_PROXY_URL. Empty disables logos
  // (rows fall back to glyphs).
  logoProxyUrl:
    process.env.EXPO_PUBLIC_LOGO_PROXY_URL ||
    "https://opengraph-image.blockeden.xyz/api/logo",

  features: {
    /**
     * "Ask Beancount.io", the agent chat (`w1/m32`).
     *
     * **Off.** Flip this constant to `true` to work on the feature; it gates
     * both the Home entry card and the `/agent` route itself, so with it off
     * the screen is unreachable even through a `beancount:///(app)/agent` deep
     * link.
     *
     * Deliberately a plain constant and not an environment variable: the switch
     * is visible in the diff of whoever changes it, and there is no way for a
     * build to end up with the feature on because of what was in someone's
     * shell. Turning it on is a code change and reviewed like one.
     */
    agentChat: false,
  },
};

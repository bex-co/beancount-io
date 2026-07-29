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
};

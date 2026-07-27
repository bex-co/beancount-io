export const config = {
  project: require("../package.json").name,
  sentryDsn: "", // TODO
  analytics: {
    googleTid: "UA-143353833-1",
    mixpanelProjectToken: "", // TODO
  },
  serverUrl: process.env.EXPO_PUBLIC_SERVER_URL || "https://beancount.io/",
  // logo.dev publishable token for brand logos on transaction rows. It's a
  // publishable (pk_) key, safe to ship in the client; override per-env with
  // EXPO_PUBLIC_LOGO_DEV_TOKEN. Empty disables logos (rows fall back to glyphs).
  logoDevToken:
    process.env.EXPO_PUBLIC_LOGO_DEV_TOKEN || "pk_a_7xXp04RRy-a518vXGlfw",
};

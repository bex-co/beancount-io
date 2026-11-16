import { deliversEmail, type AppConfig } from "@/config/config";
import { isSelfHost } from "@/config/self-host";

/**
 * What a deployment says and links to as its own (ADR029 Decision 1): a
 * self-hosted stack never names beancount.io's support channel or dashboard as
 * if they were its operator's.
 */

const MANAGED_SUPPORT_URL = "https://beancount.io/tg";

/** Told to a blocked account once its credential is verified. */
export function bannedUserMessage(selfHost = isSelfHost()): string {
  return selfHost
    ? "User is banned. If you need help, please contact the person who runs this server."
    : `User is banned. If you need help, please contact ${MANAGED_SUPPORT_URL}.`;
}

export interface WelcomeMailLinks {
  dashboardUrl: string;
  mobileAppUrl: string;
  helpCenterUrl: string;
}

type WelcomeMailConfig = Pick<AppConfig, "dashboard"> &
  Partial<Pick<AppConfig, "env" | "sendGrid">>;

/**
 * The links of the welcome mail, or null when none should be sent. The managed
 * service always sends it, to its own dashboard. A self-hosted stack sends it
 * only when it can deliver mail, and its dashboard link is the deployment's
 * own address; the app-store and help-centre links are public pages, the same
 * for every deployment.
 */
export function welcomeMailLinks(
  config: WelcomeMailConfig,
  selfHost = isSelfHost(),
): WelcomeMailLinks | null {
  const shared = {
    mobileAppUrl: "http://onelink.to/v3rz2v",
    helpCenterUrl: "https://beancount.io/docs/help-center",
  };
  if (!selfHost) {
    return { dashboardUrl: "https://beancount.io/ledger", ...shared };
  }
  if (
    !config.env ||
    !config.sendGrid ||
    !deliversEmail({ env: config.env, sendGrid: config.sendGrid })
  ) {
    return null;
  }
  return {
    dashboardUrl: `${config.dashboard.url.replace(/\/+$/, "")}/ledger`,
    ...shared,
  };
}

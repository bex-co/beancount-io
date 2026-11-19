import { config, deliversEmail, type AppConfig } from "@/config/config";

/** Static public configuration shared by GraphQL, REST, and MCP. */
export const readHealth = async (): Promise<string> => "OK";

/**
 * `emailDelivery` tells a signed-out client whether mail can arrive at all, so
 * the forgot-password page can tell the truth on a stack without a mail
 * provider (ADR029 Decision 4).
 *
 * `selfHost` tells a client that has no browser page to read it from (`bea`)
 * whether the operator runs this stack for their own users. `bea cloud git
 * setup` signs Git in over HTTPS only there (w22/m12).
 */
export const readFeatureFlags = async (
  c: Pick<AppConfig, "env" | "sendGrid" | "selfHost"> = config,
): Promise<Record<string, boolean>> => ({
  spendingReportSubscription: false,
  emailDelivery: deliversEmail(c),
  selfHost: c.selfHost,
});

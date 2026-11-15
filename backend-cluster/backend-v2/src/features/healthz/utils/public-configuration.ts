import { config, deliversEmail, type AppConfig } from "@/config/config";

/** Static public configuration shared by GraphQL, REST, and MCP. */
export const readHealth = async (): Promise<string> => "OK";

/**
 * `emailDelivery` tells a signed-out client whether mail can arrive at all, so
 * the forgot-password page can tell the truth on a stack without a mail
 * provider (ADR029 Decision 4).
 */
export const readFeatureFlags = async (
  c: Pick<AppConfig, "env" | "sendGrid"> = config,
): Promise<Record<string, boolean>> => ({
  spendingReportSubscription: false,
  emailDelivery: deliversEmail(c),
});

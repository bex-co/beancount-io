/** Static public configuration shared by GraphQL, REST, and MCP. */
export const readHealth = async (): Promise<string> => "OK";
export const readFeatureFlags = async (): Promise<Record<string, boolean>> => ({
  spendingReportSubscription: false,
});

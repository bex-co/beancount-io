/**
 * The mobile app is free independently of the account's web subscription.
 * x-app-id is a client-supplied product hint, not proof of a native client.
 * Use it only for the documented plan exemptions, never for authorization,
 * credential scopes, asset ownership, or request-rate budgets.
 */
export function requestPlatform(
  headers: Record<string, string | string[] | undefined>,
): "web" | "mobile" {
  const appId = headers["x-app-id"];
  return appId === "beancount-mobile" || appId === "mobile-beancount"
    ? "mobile"
    : "web";
}

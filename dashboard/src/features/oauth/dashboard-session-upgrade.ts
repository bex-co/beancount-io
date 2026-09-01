import { createIsomorphicFn } from "@tanstack/react-start";
import { legacyDashboardSessionUpgradeHref } from "./dashboard-oauth.server";

export const getLegacyDashboardSessionUpgradeHref = createIsomorphicFn()
  .client(() => undefined)
  .server(legacyDashboardSessionUpgradeHref);

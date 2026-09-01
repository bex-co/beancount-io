import { createServerFn } from "@tanstack/react-start";
import { dashboardOAuthInteractionIsBound } from "./dashboard-oauth.server";

export const isDashboardOAuthInteractionBound = createServerFn({
  method: "GET",
})
  .inputValidator((input: { uid: string }) => input)
  .handler(({ data }) => dashboardOAuthInteractionIsBound(data.uid));

import { dashboardOAuthLogoutHref } from "@/features/oauth/dashboard-oauth";

export function redirectToLoginAfterLogout(
  location: Pick<Location, "replace"> = window.location,
): void {
  location.replace(dashboardOAuthLogoutHref());
}

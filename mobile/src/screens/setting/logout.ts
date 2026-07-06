import { analytics } from "@/common/analytics";
import { getEndpoint, headers } from "@/common/request";
import { sessionVar } from "@/common/vars";

export async function actionLogout(authToken: string) {
  sessionVar(null);
  try {
    await fetch(getEndpoint("logout"), {
      method: "GET",
      headers: {
        ...headers,
        authorization: `Bearer ${authToken}`,
      },
    });
    analytics.track("logged_out", {});
    analytics.peopleDeleteUser();
  } catch (err) {
    // it is fine not to handle the server-side token invalidation
    console.log(`failed to request logout: ${err}`);
  }
}

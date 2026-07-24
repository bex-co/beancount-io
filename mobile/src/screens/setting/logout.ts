import { analytics } from "@/common/analytics";
import { sessionVar } from "@/common/vars";
import { apolloClient } from "@/common/apollo/client";
import { LogoutDocument } from "@/generated-graphql/graphql";

export async function actionLogout(authToken: string) {
  try {
    await apolloClient.mutate({
      mutation: LogoutDocument,
      context: { headers: { authorization: `Bearer ${authToken}` } },
    });
    analytics.track("logged_out", {});
    analytics.peopleDeleteUser();
  } catch (err) {
    console.log(`failed to request logout: ${err}`);
  } finally {
    sessionVar(null);
    apolloClient.clearStore().catch(() => {});
  }
}

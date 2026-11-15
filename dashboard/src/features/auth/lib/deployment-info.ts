import type { getClient } from "@/common/apollo/client";
import {
  DeploymentInfoDocument,
  type DeploymentInfoQuery,
} from "@/graphql/definitions";

export type DeploymentInfo = DeploymentInfoQuery["deploymentInfo"];

/**
 * What the managed service is, and what the pages assume until told otherwise:
 * not self-hosted, sign-up open. A probe that fails must land here, because
 * the pages then show what they always showed and the API still refuses what
 * it must; hiding sign-up on a failed probe would lock people out of a
 * working deployment.
 */
export const MANAGED_DEPLOYMENT: DeploymentInfo = {
  __typename: "DeploymentInfoResponse",
  selfHost: false,
  signUpOpen: true,
};

/**
 * Ask the API whether this deployment is self-hosted and still takes sign-ups,
 * and leave the answer in the Apollo cache the router dehydrates, so the page
 * renders the same on the server and in the browser. Never throws.
 */
export async function fetchDeploymentInfo(
  client: ReturnType<typeof getClient>,
): Promise<DeploymentInfo> {
  try {
    const result = await client.query({
      query: DeploymentInfoDocument,
      // A sign-up that just closed the door must not be remembered as open.
      fetchPolicy: "network-only",
    });
    return result.data?.deploymentInfo ?? MANAGED_DEPLOYMENT;
  } catch {
    return MANAGED_DEPLOYMENT;
  }
}

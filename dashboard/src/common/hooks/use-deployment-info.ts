import { useQuery } from "@apollo/client/react";
import { DeploymentInfoDocument } from "@/graphql/definitions";
import {
  MANAGED_DEPLOYMENT,
  type DeploymentInfo,
} from "@/common/lib/deployment-info";

/**
 * The deployment's answer, read from the cache the route's `beforeLoad` filled
 * (see `fetchDeploymentInfo`). Falls back to the managed service's behavior
 * while there is none, and on failure.
 */
export function useDeploymentInfo(): DeploymentInfo {
  const { data } = useQuery(DeploymentInfoDocument);
  return data?.deploymentInfo ?? MANAGED_DEPLOYMENT;
}

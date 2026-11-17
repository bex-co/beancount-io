import { describe, expect, it, vi } from "vitest";
import { DeploymentInfoDocument } from "@/graphql/definitions";
import type { getClient } from "@/common/apollo/client";
import { fetchDeploymentInfo, MANAGED_DEPLOYMENT } from "../deployment-info";

type Client = ReturnType<typeof getClient>;

const clientAnswering = (query: ReturnType<typeof vi.fn>) =>
  ({ query }) as unknown as Client;

describe("fetchDeploymentInfo", () => {
  it("returns what the deployment says, read fresh from the network", async () => {
    const answer = {
      __typename: "DeploymentInfoResponse" as const,
      selfHost: true,
      signUpOpen: false,
    };
    const query = vi
      .fn()
      .mockResolvedValue({ data: { deploymentInfo: answer } });

    expect(await fetchDeploymentInfo(clientAnswering(query))).toEqual(answer);
    expect(query).toHaveBeenCalledWith({
      query: DeploymentInfoDocument,
      fetchPolicy: "network-only",
    });
  });

  it("behaves as the managed service when the probe fails", async () => {
    const query = vi.fn().mockRejectedValue(new Error("network down"));
    expect(await fetchDeploymentInfo(clientAnswering(query))).toEqual(
      MANAGED_DEPLOYMENT,
    );
  });

  it("behaves as the managed service when the answer is empty", async () => {
    const query = vi.fn().mockResolvedValue({ data: undefined });
    expect(await fetchDeploymentInfo(clientAnswering(query))).toEqual(
      MANAGED_DEPLOYMENT,
    );
  });

  it("never throws, even without a client", async () => {
    expect(await fetchDeploymentInfo(undefined as unknown as Client)).toEqual(
      MANAGED_DEPLOYMENT,
    );
  });

  it("assumes sign-up is open and the deployment is not self-hosted", () => {
    expect(MANAGED_DEPLOYMENT).toMatchObject({
      selfHost: false,
      signUpOpen: true,
    });
  });
});

import { isRedirect } from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";
import { DeploymentInfoDocument } from "@/graphql/definitions";
import type { RouterContext } from "@/common/types/router-context";
import { loginBeforeLoad } from "../loader";

type Input = Parameters<typeof loginBeforeLoad>[0];

const run = (context: Partial<RouterContext> & Record<string, unknown>) =>
  loginBeforeLoad({ context, search: {} } as unknown as Input);

describe("login beforeLoad and the deployment", () => {
  it("leaves the deployment's answer in the cache for the page", async () => {
    const query = vi.fn().mockResolvedValue({
      data: {
        deploymentInfo: {
          __typename: "DeploymentInfoResponse",
          selfHost: true,
          signUpOpen: false,
        },
      },
    });

    await run({ client: { query }, userProfile: null });

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toMatchObject({
      query: DeploymentInfoDocument,
    });
  });

  it("does not fail the page when the probe does", async () => {
    const query = vi.fn().mockRejectedValue(new Error("down"));
    await expect(
      run({ client: { query }, userProfile: null }),
    ).resolves.toBeUndefined();
  });

  it("sends a signed-in visitor on without asking the deployment", async () => {
    const query = vi.fn();
    const outcome = run({ client: { query }, userProfile: { id: "u" } });

    await expect(outcome).rejects.toSatisfy(isRedirect);
    expect(query).not.toHaveBeenCalled();
  });
});

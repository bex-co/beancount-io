import { isRedirect } from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";
import type { RouterContext } from "@/common/types/router-context";
import { registerBeforeLoad } from "../loader";

/**
 * A self-hosted deployment that already has an account takes no more sign-ups:
 * the sign-up page is not shown, and a visitor who arrives anyway is sent to
 * sign in, carrying where they were headed.
 */

type Input = Parameters<typeof registerBeforeLoad>[0];
type Redirect = { to?: string; href?: string; search?: { next?: string } };

function clientSaying(signUpOpen: boolean) {
  return {
    query: vi.fn().mockResolvedValue({
      data: {
        deploymentInfo: {
          __typename: "DeploymentInfoResponse",
          selfHost: !signUpOpen,
          signUpOpen,
        },
      },
    }),
  };
}

async function run(
  client: { query: ReturnType<typeof vi.fn> },
  options: { signedIn?: boolean; next?: string } = {},
): Promise<Redirect | null> {
  try {
    await registerBeforeLoad({
      context: {
        client,
        userProfile: options.signedIn ? { id: "u" } : null,
      } as unknown as RouterContext,
      search: { next: options.next },
    } as Input);
    return null;
  } catch (thrown) {
    expect(isRedirect(thrown)).toBe(true);
    return (thrown as { options: Redirect }).options;
  }
}

describe("sign-up beforeLoad and the deployment", () => {
  it("sends a visitor to sign in when the deployment takes no more sign-ups", async () => {
    const redirect = await run(clientSaying(false));
    expect(redirect).toMatchObject({ to: "/auth/login" });
  });

  it("carries the destination the visitor was headed for", async () => {
    const redirect = await run(clientSaying(false), { next: "/dashboard" });
    expect(redirect).toMatchObject({
      to: "/auth/login",
      search: { next: "/dashboard" },
    });
  });

  it("shows the form while sign-up is open", async () => {
    expect(await run(clientSaying(true))).toBeNull();
  });

  it("shows the form when the probe fails, since the API still decides", async () => {
    const client = { query: vi.fn().mockRejectedValue(new Error("down")) };
    expect(await run(client)).toBeNull();
  });

  it("sends a signed-in visitor on without asking the deployment", async () => {
    const client = clientSaying(false);
    const redirect = await run(client, { signedIn: true });
    expect(redirect).toMatchObject({ to: "/auth/welcome" });
    expect(client.query).not.toHaveBeenCalled();
  });
});

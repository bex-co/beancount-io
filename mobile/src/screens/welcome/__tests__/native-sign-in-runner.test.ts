import { OAuthAuthorizationError } from "../../../common/oauth/authorization-result";
import { OAuthDiscoveryError } from "../../../common/oauth/discovery";
import { runNativeSignIn } from "../native-sign-in-runner";

describe("runNativeSignIn", () => {
  it("passes the tapped flow through and reports a finished exchange", async () => {
    const flows: string[] = [];
    const outcome = await runNativeSignIn("sign_up", async (flow) => {
      flows.push(flow);
    });
    expect(outcome).toBe("completed");
    expect(flows).toEqual(["sign_up"]);
  });

  it("treats a closed browser as a cancellation, not a failure", async () => {
    const outcome = await runNativeSignIn("sign_up", async () => {
      throw new OAuthAuthorizationError("access_denied", true);
    });
    expect(outcome).toBe("cancelled");
  });

  it("reports a real authorization error as a rejection", async () => {
    const outcome = await runNativeSignIn("sign_in", async () => {
      throw new OAuthAuthorizationError("server_error");
    });
    expect(outcome).toBe("rejected");
  });

  it("names a server that cannot be reached or is not a Beancount.io server", async () => {
    expect(
      await runNativeSignIn("sign_in", async () => {
        throw new OAuthDiscoveryError("unreachable", "fetch failed");
      }),
    ).toBe("unreachable");
    expect(
      await runNativeSignIn("sign_up", async () => {
        throw new OAuthDiscoveryError(
          "incompatible",
          "S256 PKCE is unsupported",
        );
      }),
    ).toBe("incompatible");
  });

  it("counts an unexpected exception as a rejection", async () => {
    const outcome = await runNativeSignIn("sign_in", async () => {
      throw new TypeError("something else entirely");
    });
    expect(outcome).toBe("rejected");
  });
});

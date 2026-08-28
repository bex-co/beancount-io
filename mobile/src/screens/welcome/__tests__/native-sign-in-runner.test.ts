import { OAuthAuthorizationError } from "../../../common/oauth/authorization-result";
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

  it("reports a real authorization error as a failure", async () => {
    const outcome = await runNativeSignIn("sign_in", async () => {
      throw new OAuthAuthorizationError("server_error");
    });
    expect(outcome).toBe("failed");
  });

  it("counts an unexpected exception as a failure too", async () => {
    const outcome = await runNativeSignIn("sign_in", async () => {
      throw new TypeError("Network request failed");
    });
    expect(outcome).toBe("failed");
  });
});

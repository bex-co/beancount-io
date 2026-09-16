import { describe, expect, it } from "vitest";
import { buildAgentLoginNextUrl } from "../agent-login-next-url";

describe("buildAgentLoginNextUrl", () => {
  it("removes q while preserving other search params", () => {
    expect(
      buildAgentLoginNextUrl(
        "/ledger/alice/book/agent",
        "?q=hello&lang=fr&mode=sandbox",
      ),
    ).toBe("/ledger/alice/book/agent?lang=fr&mode=sandbox");
  });

  it("returns pathname only when q was the sole param", () => {
    expect(buildAgentLoginNextUrl("/ledger/alice/book/agent", "?q=hello")).toBe(
      "/ledger/alice/book/agent",
    );
  });

  it("leaves the URL unchanged when q is absent", () => {
    expect(
      buildAgentLoginNextUrl(
        "/ledger/alice/book/agent",
        "?lang=fr&mode=sandbox",
      ),
    ).toBe("/ledger/alice/book/agent?lang=fr&mode=sandbox");
  });
});

import { describe, expect, it, vi } from "vitest";
import { redirectToLoginAfterLogout } from "../redirect-to-login";

describe("redirectToLoginAfterLogout", () => {
  it("replaces the page with the server-side OAuth logout endpoint", () => {
    const replace = vi.fn();

    redirectToLoginAfterLogout({ replace });

    expect(replace).toHaveBeenCalledWith("/oauth/dashboard/logout");
  });
});

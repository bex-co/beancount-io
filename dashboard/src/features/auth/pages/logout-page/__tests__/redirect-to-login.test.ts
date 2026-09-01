import { describe, expect, it, vi } from "vitest";
import { redirectToLoginAfterLogout } from "../redirect-to-login";

describe("redirectToLoginAfterLogout", () => {
  it("replaces the logout URL with the plain login URL", () => {
    const replace = vi.fn();

    redirectToLoginAfterLogout({ replace });

    expect(replace).toHaveBeenCalledWith("/auth/login");
  });
});

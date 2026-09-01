import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DashboardInteractionError,
  restartExpiredDashboardInteraction,
  submitDashboardInteraction,
} from "../dashboard-interaction-client";

afterEach(() => vi.unstubAllGlobals());

describe("Dashboard interaction client", () => {
  it("posts credentials only to the bound OAuth interaction", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ sessionId: "signup-session" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await submitDashboardInteraction("dashboard_uid", {
      action: "signup",
      email: "person@example.test",
      password: "correct horse battery staple",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/oauth/dashboard-consent?uid=dashboard_uid",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
      }),
    );
    const init = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(init?.body))).toEqual({
      action: "signup",
      email: "person@example.test",
      password: "correct horse battery staple",
    });
    expect(JSON.stringify(init)).not.toContain("legacy");
    expect(JSON.stringify(init)).not.toContain("accessToken");
  });

  it("rejects copied or malformed interaction ids before sending credentials", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      submitDashboardInteraction("../../session", {
        action: "password",
      }),
    ).rejects.toEqual(
      expect.objectContaining<DashboardInteractionError>({
        status: 400,
      }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("recognizes a server-validated expired interaction and restarts it", async () => {
    const assign = vi.fn();
    vi.stubGlobal("window", {
      location: {
        origin: "https://books.example.test",
        assign,
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { error: "oauth_interaction_expired" },
          {
            status: 410,
            headers: {
              location:
                "/oauth/dashboard/start?next=%2Fledger&reason=interaction_expired",
            },
          },
        ),
      ),
    );

    let error: unknown;
    try {
      await submitDashboardInteraction("dashboard_uid", {
        action: "password",
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toMatchObject({
      status: 410,
      code: "oauth_interaction_expired",
    });
    expect(restartExpiredDashboardInteraction(error)).toBe(true);
    expect(assign).toHaveBeenCalledWith(
      "/oauth/dashboard/start?next=%2Fledger&reason=interaction_expired",
    );
  });

  it("does not follow an off-origin or unclassified restart", () => {
    const assign = vi.fn();
    vi.stubGlobal("window", {
      location: {
        origin: "https://books.example.test",
        assign,
      },
    });

    expect(
      restartExpiredDashboardInteraction(
        new DashboardInteractionError(
          410,
          "oauth_interaction_expired",
          "https://attacker.example/oauth/dashboard/start?reason=interaction_expired",
        ),
      ),
    ).toBe(false);
    expect(assign).not.toHaveBeenCalled();
  });
});

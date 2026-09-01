import { DASHBOARD_OAUTH_INTERACTION_EXPIRED_REASON } from "./dashboard-oauth";

const INTERACTION_UID = /^[A-Za-z0-9_-]{8,200}$/;
const INTERACTION_EXPIRED = "oauth_interaction_expired";

interface DashboardInteractionOptions {
  next?: string;
  screenHint?: "signup";
}

export class DashboardInteractionError extends Error {
  constructor(
    public readonly status: number,
    public readonly code?: string,
    public readonly restartUrl?: string,
  ) {
    super("Dashboard OAuth interaction failed");
  }
}

export async function submitDashboardInteraction(
  uid: string,
  body: Record<string, unknown>,
  options: DashboardInteractionOptions = {},
): Promise<Response> {
  if (!INTERACTION_UID.test(uid)) throw new DashboardInteractionError(400);
  const interaction = new URL(
    "/oauth/dashboard-consent",
    window.location.origin,
  );
  interaction.searchParams.set("uid", uid);
  if (options.next) interaction.searchParams.set("next", options.next);
  if (options.screenHint) {
    interaction.searchParams.set("screen_hint", options.screenHint);
  }
  const response = await fetch(interaction.pathname + interaction.search, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let code: string | undefined;
    try {
      const body = (await response.clone().json()) as { error?: unknown };
      if (typeof body.error === "string") code = body.error;
    } catch {
      // Error bodies are optional. The status still reaches the normal error UI.
    }
    throw new DashboardInteractionError(
      response.status,
      code,
      response.headers.get("location") ?? undefined,
    );
  }
  return response;
}

export function restartExpiredDashboardInteraction(error: unknown): boolean {
  if (
    !(error instanceof DashboardInteractionError) ||
    error.status !== 410 ||
    error.code !== INTERACTION_EXPIRED ||
    !error.restartUrl
  ) {
    return false;
  }
  let restart: URL;
  try {
    restart = new URL(error.restartUrl, window.location.origin);
  } catch {
    return false;
  }
  if (
    restart.origin !== window.location.origin ||
    restart.searchParams.get("reason") !==
      DASHBOARD_OAUTH_INTERACTION_EXPIRED_REASON
  ) {
    return false;
  }
  window.location.assign(`${restart.pathname}${restart.search}`);
  return true;
}

export function continueDashboardOAuth(response: Response): void {
  if (!response.redirected) throw new DashboardInteractionError(502);
  window.location.assign(response.url);
}

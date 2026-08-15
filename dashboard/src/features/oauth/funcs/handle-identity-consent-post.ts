import { proxyOauthInteractionLogin } from "@/common/lib/oauth/forward-to-backend";

export async function handleIdentityConsentPost({
  request,
}: {
  request: Request;
}): Promise<Response> {
  const uid = new URL(request.url).searchParams.get("uid") ?? "";
  // Identity and MCP logins share one oidc-provider instance/route namespace
  // (backend-v2's oidc-route.ts) — the interaction/login endpoint branches
  // internally on which client the uid belongs to.
  return proxyOauthInteractionLogin(
    request,
    `/api-gateway/oauth/interaction/${uid}/login`,
  );
}

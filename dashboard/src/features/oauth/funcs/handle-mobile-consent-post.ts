import { proxyOauthInteractionLogin } from "@/common/lib/oauth/forward-to-backend";

export async function handleMobileConsentPost({
  request,
}: {
  request: Request;
}): Promise<Response> {
  const uid = new URL(request.url).searchParams.get("uid") ?? "";
  return proxyOauthInteractionLogin(
    request,
    `/api-gateway/oauth/interaction/${uid}/login`,
  );
}

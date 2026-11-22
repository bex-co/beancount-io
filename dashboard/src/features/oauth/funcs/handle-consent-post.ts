import { proxyOauthInteractionLogin } from "@/common/lib/oauth/forward-to-backend";

export async function handleConsentPost({
  request,
}: {
  request: Request;
}): Promise<Response> {
  return proxyOauthInteractionLogin(request);
}

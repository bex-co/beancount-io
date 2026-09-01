import { proxyOAuthProviderRequest } from "@/common/lib/oauth/forward-to-backend";

export function handleOAuthProviderProxy({
  request,
}: {
  request: Request;
}): Promise<Response> {
  return proxyOAuthProviderRequest(request);
}

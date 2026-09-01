import { proxyApiGatewayRequest } from "@/common/lib/oauth/forward-to-backend";

export function handleApiGatewayProxy({
  request,
}: {
  request: Request;
}): Promise<Response> {
  return proxyApiGatewayRequest(request);
}

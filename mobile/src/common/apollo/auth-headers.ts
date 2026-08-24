export function buildAuthHeaders(
  headers: Record<string, string>,
  token: string | undefined,
): Record<string, string> {
  return {
    ...headers,
    "x-app-id": "beancount-mobile",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

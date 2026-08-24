// Utility functions used by the control-plane worker entry point.

// Helper to create a JSON response with CORS headers.
export function jsonResponse(
  data: unknown,
  options: { status?: number } = {},
): Response {
  return new Response(JSON.stringify(data), {
    status: options.status || 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/**
 * Validate the x-admin-token header against the expected token.
 */
export function validateAdminToken(
  request: Request,
  expectedToken: string,
): boolean {
  const providedToken = request.headers.get('x-admin-token');
  if (!providedToken) return false;
  if (providedToken !== expectedToken) return false;
  return true;
}

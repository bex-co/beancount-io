/**
 * Rebuild the authorization response URL from the route params Expo Router
 * parsed out of the deep link.
 *
 * On a cold launch — or when the redirect arrives while the browser sheet is
 * still up — Expo Router owns the incoming URL and `Linking.useURL()` stays
 * null, so the callback route has only the parsed params. The completer
 * validates a full URL against the pending request (exact redirect URI, one
 * `state`, one `iss`, no tokens in the query), so the params are put back on
 * the registered redirect URI verbatim: a repeated param stays repeated so the
 * single-value checks still fail closed.
 */
export function callbackUrlFromParams(
  redirectUri: string,
  params: Record<string, string | string[] | undefined>,
): string | null {
  const url = new URL(redirectUri);
  let any = false;
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    for (const one of Array.isArray(value) ? value : [value]) {
      url.searchParams.append(key, one);
      any = true;
    }
  }
  return any ? url.toString() : null;
}

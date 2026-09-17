/**
 * Which `include` URLs the ledger service treats as managed price feeds
 * (ADR 015 section 2). A target is a managed price include only when its
 * origin is allowlisted, its path is exactly `/prices/<ALIAS>`, and it carries
 * no user info, query string, or fragment. Everything else keeps the existing
 * "not a repository path" behavior, so the allowlist is the only way a remote
 * host can ever be fetched.
 */

const PRICES_PATH_RE = /^\/prices\/([A-Za-z0-9._-]{1,64})$/u;

type ManagedPriceUrlDecision =
  | { allowed: true; url: string; alias: string }
  | { allowed: false; detail: string };

/** Decide whether an include target is an allowed managed price URL. */
export function parseManagedPriceUrl(
  target: string,
  origins: readonly string[],
): ManagedPriceUrlDecision {
  if (origins.length === 0) {
    return {
      allowed: false,
      detail: "managed price includes are disabled on this server",
    };
  }
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return { allowed: false, detail: "not a valid URL" };
  }
  if (url.username !== "" || url.password !== "") {
    return {
      allowed: false,
      detail: "a managed price URL must not carry credentials",
    };
  }
  if (!origins.includes(url.origin)) {
    // `URL.origin` is the opaque string "null" for non-http schemes such as
    // `s3://`; name what the user wrote instead.
    return {
      allowed: false,
      detail: `origin ${url.protocol}//${url.host} is not an allowed managed price source`,
    };
  }
  if (url.search !== "" || url.hash !== "") {
    return {
      allowed: false,
      detail: "a managed price URL must not carry a query string or fragment",
    };
  }
  const match = PRICES_PATH_RE.exec(url.pathname);
  if (!match) {
    return {
      allowed: false,
      detail: "the path must be /prices/<ALIAS> (letters, digits, . _ -)",
    };
  }
  return { allowed: true, url: `${url.origin}${url.pathname}`, alias: match[1] };
}

/**
 * The `Cookie` header for a feed request, or null to send none.
 *
 * The value is the caller's own token, relayed from backend-v2 through the
 * forwarded-context envelope (ADR 016 §7) — this service holds no credential of
 * its own and mints nothing. Whatever kind of credential the caller presented
 * is passed through unchanged: beancount.io resolves an OAuth token, a `bcio_`
 * API key, and a session JWT from this one cookie alike, so narrowing by shape
 * here would only break the cases that work.
 *
 * The path half reuses `PRICES_PATH_RE`, so the cookie decision and the "is
 * this a managed price URL" decision cannot drift apart. The host half is
 * matched on `hostname`, deliberately looser than the origin allowlist above:
 * the include is written `https://` but the gate redirects to `http://`, so
 * both schemes must qualify. Redirects are still never followed, so the
 * credential cannot travel to another host. Outside a request — a background
 * refresh with no caller — there is no token and the fetch goes out anonymous.
 *
 * The scheme, credential, and query checks restate `parseManagedPriceUrl`'s,
 * which today every caller has already passed. That is deliberate rather than
 * redundant: this function decides whether to hand out a live credential, and
 * a decision of that kind should not rest on a caller two layers up having
 * checked first. Attaching the cookie is refused here for anything it cannot
 * verify itself.
 */
export function managedPriceCookieFor(
  url: string,
  sessionToken: string | undefined,
  gate: { host: string; cookieName: string },
): string | null {
  if (!sessionToken || gate.host === "") return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const gated =
    (parsed.protocol === "https:" || parsed.protocol === "http:") &&
    parsed.username === "" &&
    parsed.password === "" &&
    parsed.search === "" &&
    parsed.hash === "" &&
    parsed.hostname === gate.host &&
    PRICES_PATH_RE.test(parsed.pathname);
  return gated ? `${gate.cookieName}=${sessionToken}` : null;
}

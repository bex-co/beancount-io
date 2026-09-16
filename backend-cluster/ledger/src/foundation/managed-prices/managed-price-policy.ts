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

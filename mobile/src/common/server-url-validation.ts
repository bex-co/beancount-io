export type ServerUrlErrorCode =
  "empty" | "invalid" | "credentials" | "query" | "insecure";

export type ServerUrlValidation =
  { ok: true; url: string } | { ok: false; code: ServerUrlErrorCode };

type ServerUrlOptions = {
  allowInsecureLocalhost?: boolean;
};

const localhostNames = new Set(["localhost", "127.0.0.1", "::1"]);

export function allowsInsecureLocalhost(): boolean {
  return typeof __DEV__ !== "undefined" && __DEV__;
}

function isLocalhost(hostname: string): boolean {
  return localhostNames.has(hostname.toLowerCase());
}

/** Validate a base URL while preserving a reverse-proxy path prefix. */
export function validateServerUrl(
  input: string,
  options: ServerUrlOptions = {},
): ServerUrlValidation {
  const candidate = input.trim();
  if (!candidate) return { ok: false, code: "empty" };

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, code: "invalid" };
  }
  if (
    !parsed.hostname ||
    (parsed.protocol !== "https:" && parsed.protocol !== "http:")
  ) {
    return { ok: false, code: "invalid" };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, code: "credentials" };
  }
  if (parsed.search || parsed.hash) return { ok: false, code: "query" };

  const allowHttp = options.allowInsecureLocalhost ?? allowsInsecureLocalhost();
  if (
    parsed.protocol === "http:" &&
    !(allowHttp && isLocalhost(parsed.hostname))
  ) {
    return { ok: false, code: "insecure" };
  }

  parsed.pathname = `${parsed.pathname.replace(/\/+$/, "")}/`;
  return { ok: true, url: parsed.toString() };
}

export function endpointFor(serverUrl: string, path: string): string {
  return new URL(path.replace(/^\/+/, ""), serverUrl).toString();
}

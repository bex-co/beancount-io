/**
 * The parity primitive: issue ONE request to BOTH services, normalize both
 * responses (see normalize.ts + README allowlist), and require deep equality
 * of status + envelope. Error responses are compared the same way — a 404
 * with a different message is a parity failure, not a skip.
 */
import { inspect } from "node:util";
import { maskFields, normalizeForParity, type ShadowJson } from "./normalize";
import { PARITY_USER, PARITY_PASSWORD } from "./seed";

export const PYTHON_URL =
  process.env.PARITY_PYTHON_URL || "http://localhost:18001";
export const V2_URL = process.env.PARITY_V2_URL || "http://localhost:18002";
export const GITEA_URL =
  process.env.PARITY_GITEA_URL || "http://localhost:13801";

export type ParityAuth = "user" | "none" | { header: string };

export interface ParityRequest {
  /** operationId from the pinned OpenAPI spec — selects normalization rules. */
  operation: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  /** Path under the service root, e.g. `/ledgers/parityuser/book`. */
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  /** Default "user" — the seeded parity user's Basic credentials. */
  auth?: ParityAuth;
  body?: unknown;
  /**
   * Per-target template vars for MUTATING ops: both services share one Gitea,
   * so identical write requests would collide. `{{key}}` placeholders in
   * `path`/`body` resolve per target; after normalization, each target's value
   * is substituted back to `{{key}}` in its payload so the comparison ignores
   * the deliberate difference (e.g. repo names `x-py` vs `x-v2`).
   */
  vars?: Record<string, { python: string; v2: string }>;
  /** Fully-divergent request bodies (e.g. per-target hash lists); overrides `body`. */
  bodyPerTarget?: { python: unknown; v2: unknown };
  /** Extra volatile fields masked for this request (e.g. id/timestamps of two independently-created repos). */
  volatileFields?: string[];
}

type Target = "python" | "v2";

function substituteTemplate(
  value: string,
  req: ParityRequest,
  target: Target,
): string {
  let out = value;
  for (const [key, targets] of Object.entries(req.vars ?? {})) {
    out = out.split(`{{${key}}}`).join(targets[target]);
  }
  return out;
}

function deepMapStrings(
  value: ShadowJson,
  fn: (s: string) => string,
): ShadowJson {
  if (typeof value === "string") return fn(value);
  if (Array.isArray(value)) return value.map((v) => deepMapStrings(v, fn));
  if (value !== null && typeof value === "object") {
    const out: Record<string, ShadowJson> = {};
    for (const [k, v] of Object.entries(value)) out[k] = deepMapStrings(v, fn);
    return out;
  }
  return value;
}

function untargetize(
  value: ShadowJson,
  req: ParityRequest,
  target: Target,
): ShadowJson {
  if (!req.vars) return value;
  return deepMapStrings(value, (s) => {
    let out = s;
    for (const [key, targets] of Object.entries(req.vars ?? {})) {
      out = out.split(targets[target]).join(`{{${key}}}`);
    }
    return out;
  });
}

export interface TargetResponse {
  status: number;
  json: ShadowJson;
}

export interface ParityResult {
  status: number;
  /** Normalized payloads (identical when parity holds). */
  normalized: ShadowJson;
  raw: { python: TargetResponse; v2: TargetResponse };
}

export function userBasicAuthHeader(): string {
  return `Basic ${Buffer.from(`${PARITY_USER}:${PARITY_PASSWORD}`).toString("base64")}`;
}

function authHeader(auth: ParityAuth | undefined): string | undefined {
  if (auth === "none") return undefined;
  if (auth && typeof auth === "object") return auth.header;
  return userBasicAuthHeader();
}

function buildUrl(base: string, req: ParityRequest): string {
  const url = new URL(base + req.path);
  for (const [k, v] of Object.entries(req.query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  return url.toString();
}

async function callTarget(
  base: string,
  req: ParityRequest,
  target: Target,
): Promise<TargetResponse> {
  const headers: Record<string, string> = {};
  const auth = authHeader(req.auth);
  if (auth) headers.Authorization = auth;
  if (req.body !== undefined || req.bodyPerTarget !== undefined)
    headers["Content-Type"] = "application/json";

  const resolved: ParityRequest = {
    ...req,
    path: substituteTemplate(req.path, req, target),
  };
  const effectiveBody = req.bodyPerTarget
    ? req.bodyPerTarget[target]
    : req.body;
  const bodyText =
    effectiveBody === undefined
      ? undefined
      : substituteTemplate(JSON.stringify(effectiveBody), req, target);
  const res = await fetch(buildUrl(base, resolved), {
    method: req.method ?? "GET",
    headers,
    body: bodyText,
  });
  const text = await res.text();
  let json: ShadowJson;
  try {
    json = text ? (JSON.parse(text) as ShadowJson) : null;
  } catch {
    json = text; // non-JSON bodies compared as raw text
  }
  return { status: res.status, json };
}

/** First path where two normalized payloads diverge, for readable failures. */
export function firstDifference(
  a: ShadowJson,
  b: ShadowJson,
  path = "$",
): string | null {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length)
      return `${path}: array length ${a.length} vs ${b.length}`;
    for (let i = 0; i < a.length; i++) {
      const d = firstDifference(a[i], b[i], `${path}[${i}]`);
      if (d) return d;
    }
    return null;
  }
  if (
    a !== null &&
    b !== null &&
    typeof a === "object" &&
    typeof b === "object" &&
    !Array.isArray(a) &&
    !Array.isArray(b)
  ) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      const inA = key in a;
      const inB = key in b;
      if (!inA || !inB) {
        return `${path}.${key}: ${inA ? "present in python, missing in v2" : "missing in python, present in v2"}`;
      }
      const d = firstDifference(a[key], b[key], `${path}.${key}`);
      if (d) return d;
    }
    return null;
  }
  if (a !== b || typeof a !== typeof b) {
    return `${path}: python=${inspect(a)} v2=${inspect(b)}`;
  }
  return null;
}

export class ParityMismatchError extends Error {
  constructor(req: ParityRequest, detail: string) {
    super(
      `Parity mismatch for ${req.operation} (${req.method ?? "GET"} ${req.path}): ${detail}`,
    );
    this.name = "ParityMismatchError";
  }
}

/**
 * Issue the request to both services and throw a ParityMismatchError on any
 * non-allowlisted difference. Returns both payloads for follow-up assertions.
 */
export async function expectParity(req: ParityRequest): Promise<ParityResult> {
  const [python, v2] = await Promise.all([
    callTarget(PYTHON_URL, req, "python"),
    callTarget(V2_URL, req, "v2"),
  ]);

  if (python.status !== v2.status) {
    throw new ParityMismatchError(
      req,
      `status python=${python.status} v2=${v2.status}\n` +
        `python body: ${inspect(python.json, { depth: 4 })}\n` +
        `v2 body:     ${inspect(v2.json, { depth: 4 })}`,
    );
  }

  let pythonNorm = untargetize(
    normalizeForParity(req.operation, python.json),
    req,
    "python",
  );
  let v2Norm = untargetize(
    normalizeForParity(req.operation, v2.json),
    req,
    "v2",
  );
  if (req.volatileFields?.length) {
    pythonNorm = maskFields(pythonNorm, req.volatileFields);
    v2Norm = maskFields(v2Norm, req.volatileFields);
  }
  const diff = firstDifference(pythonNorm, v2Norm);
  if (diff) {
    throw new ParityMismatchError(req, `body diverges at ${diff}`);
  }

  return { status: python.status, normalized: pythonNorm, raw: { python, v2 } };
}

/**
 * Write-suite helper: byte-compare the FILE CONTENTS of two repos (the
 * per-target fixture copies) after a pair of writes. Compares tree paths and
 * base64 blob contents — never commit SHAs (committer/timestamps differ).
 */
export async function compareRepoFiles(
  repoA: string,
  repoB: string,
): Promise<void> {
  const auth = userBasicAuthHeader();
  const tree = async (repo: string): Promise<Map<string, string>> => {
    const res = await fetch(
      `${GITEA_URL}/api/v1/repos/${PARITY_USER}/${repo}/git/trees/main?recursive=true`,
      { headers: { Authorization: auth } },
    );
    if (!res.ok) {
      throw new Error(
        `tree(${repo}) failed: ${res.status} ${await res.text()}`,
      );
    }
    const body = (await res.json()) as {
      tree?: Array<{ path: string; type: string; sha: string }>;
    };
    const files = new Map<string, string>();
    for (const entry of body.tree ?? []) {
      if (entry.type === "blob") files.set(entry.path, entry.sha);
    }
    return files;
  };
  const blob = async (repo: string, path: string): Promise<string> => {
    const res = await fetch(
      `${GITEA_URL}/api/v1/repos/${PARITY_USER}/${repo}/contents/${path}`,
      { headers: { Authorization: auth } },
    );
    if (!res.ok) {
      throw new Error(
        `contents(${repo}, ${path}) failed: ${res.status} ${await res.text()}`,
      );
    }
    const body = (await res.json()) as { content?: string };
    return body.content ?? "";
  };

  const [a, b] = await Promise.all([tree(repoA), tree(repoB)]);
  const paths = new Set([...a.keys(), ...b.keys()]);
  for (const path of paths) {
    if (!a.has(path) || !b.has(path)) {
      throw new Error(
        `write parity: ${path} ${a.has(path) ? `only in ${repoA}` : `only in ${repoB}`}`,
      );
    }
    // blob SHAs are content-addressed — equal SHAs prove equal bytes
    if (a.get(path) !== b.get(path)) {
      const [contentA, contentB] = await Promise.all([
        blob(repoA, path),
        blob(repoB, path),
      ]);
      if (contentA !== contentB) {
        const textA = Buffer.from(contentA, "base64").toString("utf8");
        const textB = Buffer.from(contentB, "base64").toString("utf8");
        throw new Error(
          `write parity: ${path} differs between ${repoA} and ${repoB}\n--- ${repoA}\n${textA}\n--- ${repoB}\n${textB}`,
        );
      }
    }
  }
}

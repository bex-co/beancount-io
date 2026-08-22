import { config } from "@/config";
import { logger } from "@/shared/logger";

const log = logger.child({ module: "backend-v2-limits" });

/**
 * Python `BackendV2Client.get_max_directives`: resolve the ledger owner's
 * tier `maxDirectives` from backend-v2's admin endpoint. null = unknown —
 * every caller treats that as "skip the check" (fail open).
 */
export async function getMaxDirectives(
  ledgerUsername: string,
): Promise<number | null> {
  const { hostName, httpPort, adminToken } = config.backendV2;
  if (!adminToken) {
    log.warn(
      "BACKEND_V2_ADMIN_TOKEN not configured; skipping directive limit check",
    );
    return null;
  }
  try {
    const res = await fetch(
      `http://${hostName}:${httpPort}/api/admin/ledger-limits/${encodeURIComponent(ledgerUsername)}`,
      { headers: { "x-admin-token": adminToken } },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { maxDirectives?: number };
    return typeof body.maxDirectives === "number" ? body.maxDirectives : null;
  } catch (err) {
    log.warn("ledger-limits lookup failed; skipping check", { err });
    return null;
  }
}

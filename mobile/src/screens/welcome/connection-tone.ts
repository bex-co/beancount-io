import type { ServerConnectionResult } from "../../common/server-url";

/**
 * How a connection test reads. A server older than the app answered: that is a
 * warning to update it, and the address can still be saved, so it takes
 * neither a failure's red nor the "when the server is available" advisory
 * under one (w21/717).
 */
export function connectionTone(
  result: ServerConnectionResult,
): "success" | "warning" | "error" {
  if (result.kind === "connected") return "success";
  return result.kind === "older" ? "warning" : "error";
}

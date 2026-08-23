import { createPersistentVar } from "@/common/apollo/persistent-var";
import {
  defaultRuntimeServerUrl,
  validateServerUrl,
} from "@/common/server-url";

/**
 * `null` means “use this build's default.” Keeping the override nullable lets
 * Restore default follow a future branded/environment default instead of
 * freezing today's value in storage.
 */
export const [serverUrlOverrideVar, loadServerUrlOverride, flushServerUrl] =
  createPersistentVar<string | null>(
    "serverUrlOverride",
    null,
    undefined,
    (stored) => {
      const value = JSON.parse(stored) as unknown;
      if (value === null) {
        return null;
      }
      if (typeof value !== "string") {
        throw new Error("Stored server URL is not a string");
      }
      const validation = validateServerUrl(value);
      if (!validation.ok) {
        throw new Error("Stored server URL is invalid");
      }
      return validation.url;
    },
  );

export function getServerUrl(): string {
  return serverUrlOverrideVar() ?? defaultRuntimeServerUrl();
}

export function setServerUrl(url: string): void {
  const validation = validateServerUrl(url);
  if (!validation.ok) {
    throw new Error(`Invalid server URL: ${validation.code}`);
  }
  serverUrlOverrideVar(validation.url);
}

export function resetServerUrl(): void {
  serverUrlOverrideVar(null);
}

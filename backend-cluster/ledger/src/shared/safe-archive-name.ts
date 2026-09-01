import { BadUserInputError } from "@/shared/errors";

/**
 * Archive names are one URL-path segment. Starting with an alphanumeric
 * character excludes the special `.` and `..` segments; the remaining grammar
 * covers the formats the API supports (`zip`, `tar.gz`, `gitea-main.zip`).
 */
const SAFE_ARCHIVE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/;

export function assertSafeArchiveName(
  archive: unknown,
): asserts archive is string {
  if (typeof archive !== "string" || !SAFE_ARCHIVE_NAME_PATTERN.test(archive)) {
    throw new BadUserInputError("Invalid archive name", "archive");
  }
}

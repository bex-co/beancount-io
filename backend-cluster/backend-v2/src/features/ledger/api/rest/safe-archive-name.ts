import { BadUserInputError } from "@/shared/errors";

/** One safe URL-path segment covering every supported archive format. */
export const SAFE_ARCHIVE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/;

export function assertSafeArchiveName(
  archive: unknown,
): asserts archive is string {
  if (typeof archive !== "string" || !SAFE_ARCHIVE_NAME_PATTERN.test(archive)) {
    throw new BadUserInputError("Invalid archive name", "archive");
  }
}

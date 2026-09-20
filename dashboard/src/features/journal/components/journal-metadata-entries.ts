import type { JournalDirectiveType } from "@/common/types/journal";

/**
 * The metadata entries the journal will actually show. Internal keys are
 * excluded, so a directive whose metadata holds only those has nothing to
 * display — which the row wrapping that content has to know before it renders
 * a row at all. Shared so the wrapper and the content cannot disagree.
 */
export function displayableMetadataEntries(
  directive: JournalDirectiveType,
): Array<[string, unknown]> {
  if (!directive.meta) return [];
  return Object.entries(directive.meta).filter(
    ([key]) =>
      !key.startsWith("__") &&
      !key.startsWith("filename") &&
      !key.startsWith("lineno"),
  );
}

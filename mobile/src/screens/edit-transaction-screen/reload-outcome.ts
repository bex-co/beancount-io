import { isOtherSlice } from "../transaction-detail-screen/selectors/select-shown-checksum";

/**
 * What a Reload after a save conflict may do with the slice it re-reads. A
 * conflict means the text under the entry's ID changed, and the editor cannot
 * tell the entry itself changed in a way that keeps its ID (metadata, a
 * comment) from a twin entry that moved onto the ID after it was deleted
 * elsewhere. Adopting the twin's slice would let the next Save replace it, so
 * any slice other than the one the editor loaded reads as changed or removed,
 * as on the detail screen (w21/693, w21/672).
 */
export function reloadOutcome(
  loadedChecksum: string | undefined,
  readChecksum: string,
): "adopt" | "changed-or-removed" {
  return isOtherSlice(loadedChecksum, readChecksum)
    ? "changed-or-removed"
    : "adopt";
}

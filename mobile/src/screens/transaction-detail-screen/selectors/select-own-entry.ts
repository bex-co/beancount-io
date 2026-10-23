import type { JournalTransaction } from "../../transactions-screen/types";
import { mayBeGenerated } from "./select-transaction-detail";

/**
 * The possibly generated entry (a padding transaction, say) this screen has
 * been shown. The stash holds only the transaction tapped last, so opening
 * another one from a screen above overwrote it and this screen, still in the
 * stack, asked the server for a context it cannot give (it has no source
 * directive) and read the NOT_FOUND as "changed or removed" (w21/444). Its
 * context is still read, since an entry written with such a flag has one
 * (w21/745), and the held copy is what shows when it does not. An entry with
 * an ordinary flag is not held: its context is the fresher copy.
 */
export function holdGeneratedEntry(
  held: JournalTransaction | null,
  stashed: JournalTransaction | null,
): JournalTransaction | null {
  return stashed !== null && mayBeGenerated(stashed) ? stashed : held;
}

/** The entry this route shows without a context read: its stash, else the generated entry it held. */
export function selectOwnEntry(
  stashed: JournalTransaction | null,
  held: JournalTransaction | null,
  entryHash: string,
): JournalTransaction | null {
  if (stashed !== null) return stashed;
  return held !== null && held.entry_hash === entryHash ? held : null;
}

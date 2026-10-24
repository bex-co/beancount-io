/**
 * A screen holding unsaved edits that something other than navigation could
 * throw away. An app link to another ledger switches `ledgerVar` before it
 * navigates, which remounts the file editor clean, so its `beforeRemove`
 * guard never saw the draft it discarded (w21/090). The editor registers a
 * check here while it is dirty; the link asks it first.
 *
 * Free of `@/` value imports so the jest-lite runner can require it.
 */
type UnsavedEditsCheck = () => Promise<boolean>;

// Every dirty screen in the stack, the newest last: a form pushed over another
// (Open Account over New Transaction) left the screen below with nothing
// registered once the top one went, and a link then switched ledgers under its
// draft without asking (w21/923).
const active: UnsavedEditsCheck[] = [];

/**
 * Register `check`, which asks the user and resolves true to discard the
 * edits and go on, false to stay. Returns the unregister function, which
 * removes this check and no other.
 */
export function registerUnsavedEditsGuard(
  check: UnsavedEditsCheck,
): () => void {
  active.push(check);
  return () => {
    const at = active.lastIndexOf(check);
    if (at >= 0) active.splice(at, 1);
  };
}

/**
 * Whether it is fine to throw away every screen's unsaved edits: each is asked,
 * the newest first, and one that says stay stops the rest.
 */
export async function confirmDiscardUnsavedEdits(): Promise<boolean> {
  for (const check of [...active].reverse()) {
    if (!(await check())) return false;
  }
  return true;
}

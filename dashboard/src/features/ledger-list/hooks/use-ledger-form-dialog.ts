import { useState } from "react";
import { useDiscardDraftGuard } from "@/common/components/discard-draft-guard";

/**
 * Binds a `LedgerForm` to the dialog around it. Close, Escape, an outside
 * click or Cancel ask before discarding what was typed, and an untouched form
 * closes at once (w2/134, after w2/123). While a save is in flight the dialog
 * holds all of them, so a late completion closes only the draft it was sent
 * from. A successful save closes the dialog directly through `close`.
 *
 * Spread `formProps` onto the `LedgerForm`, pass `busy` to `DialogContent`,
 * and render `confirmation` inside it.
 */
export function useLedgerFormDialog(close: () => void) {
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const { requestLeave, confirmation } = useDiscardDraftGuard(dirty);
  const leave = () => requestLeave(close);

  return {
    onOpenChange: (open: boolean) => {
      if (!open) leave();
    },
    busy: pending,
    formProps: {
      onCancel: leave,
      onDirtyChange: setDirty,
      onPendingChange: setPending,
    },
    confirmation,
  };
}

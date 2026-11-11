import { useRef, useState } from "react";
import { Button } from "@/common/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { useTranslations } from "@/common/hooks/use-translations";

/**
 * Leaving a dialog that holds a typed draft asks first; an untouched one
 * leaves at once. `requestLeave` takes the leave action from Close, Escape,
 * an outside click or a Cancel button; render `confirmation` inside the
 * dialog it guards. Keep editing hands focus back to the field that had it.
 * Entry Context asks the same way (w3/565); New Entry and Add Budget closed
 * on one stray click (w2/123).
 */
export function useDiscardDraftGuard(dirty: boolean) {
  const { t } = useTranslations();
  const [pending, setPending] = useState<{ leave: () => void } | null>(null);
  // Where focus was when leaving was asked for, for Keep editing to return to.
  const origin = useRef<HTMLElement | null>(null);
  const keeping = useRef(false);

  const requestLeave = (leave: () => void) => {
    if (!dirty) {
      leave();
      return;
    }
    // Read before the confirmation moves focus into itself.
    const active = document.activeElement;
    origin.current = active instanceof HTMLElement ? active : null;
    setPending({ leave });
  };

  const keep = () => {
    keeping.current = true;
    setPending(null);
  };

  const confirmation = (
    <Dialog open={pending !== null} onOpenChange={(next) => !next && keep()}>
      <DialogContent
        className="sm:max-w-md"
        onCloseAutoFocus={(event) => {
          if (!keeping.current) return;
          keeping.current = false;
          if (origin.current?.isConnected) {
            event.preventDefault();
            origin.current.focus();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{t("common.discardDraftTitle")}</DialogTitle>
          <DialogDescription>
            {t("common.discardDraftDescription")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={keep}>
            {t("common.keepEditing")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              const leave = pending?.leave;
              setPending(null);
              leave?.();
            }}
          >
            {t("common.discardDraft")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { requestLeave, confirmation };
}

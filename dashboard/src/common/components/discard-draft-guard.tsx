import { useCallback, useEffect, useRef, useState } from "react";
import { DraftNavigationGuard } from "@/common/components/draft-navigation-guard";
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
 * dialog it guards. Pass `navigation` while a dialog is open to guard browser
 * exits too. Keep editing hands focus back to the field that had it.
 * Entry Context asks the same way (w3/565); New Entry and Add Budget closed
 * on one stray click (w2/123).
 */
export function useDiscardDraftGuard(
  dirty: boolean,
  navigation?: { writing: boolean },
) {
  const { t } = useTranslations();
  const writing = navigation?.writing;
  const [pending, setPending] = useState<{
    leave: () => void;
    stay?: () => void;
  } | null>(null);
  // Where focus was when leaving was asked for, for Keep editing to return to.
  const origin = useRef<HTMLElement | null>(null);
  const keeping = useRef(false);
  const cancelNavigation = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelNavigation.current?.(), []);

  const requestLeave = (leave: () => void) => {
    if (writing || cancelNavigation.current) return;
    if (!dirty) {
      leave();
      return;
    }
    setPending({ leave });
  };

  const confirmNavigation = useCallback(() => {
    // Keep the first pending destination until the reader answers.
    if (cancelNavigation.current) return true;
    return new Promise<boolean>((resolve) => {
      const answer = (blocked: boolean) => {
        cancelNavigation.current = null;
        resolve(blocked);
      };
      const stay = () => answer(true);
      cancelNavigation.current = stay;
      setPending({ leave: () => answer(false), stay });
    });
  }, []);

  const keep = () => {
    keeping.current = true;
    pending?.stay?.();
    setPending(null);
  };

  const confirmation = (
    <>
      {writing !== undefined && (dirty || writing) && (
        <DraftNavigationGuard writing={writing} confirm={confirmNavigation} />
      )}
      <Dialog open={pending !== null} onOpenChange={(next) => !next && keep()}>
        <DialogContent
          className="sm:max-w-md"
          onOpenAutoFocus={() => {
            const active = document.activeElement;
            origin.current = active instanceof HTMLElement ? active : null;
          }}
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
    </>
  );

  return { requestLeave, confirmation };
}

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocalization } from "@/i18n/context";
import { persistLanguage } from "@/i18n/funcs";
import type { SupportedLanguage } from "@/i18n/config";

/** Keep the current UI usable until the chosen locale is ready. */
export function useChangeLanguage() {
  const localization = useLocalization();
  const [isChangingLanguage, setChangingLanguage] = useState(false);
  const latest = useRef(0);
  const changeLanguage = useCallback(
    async function select(language: SupportedLanguage): Promise<boolean> {
      const request = ++latest.current;
      setChangingLanguage(true);
      try {
        const changed = await localization.changeLanguage(language);
        if (changed) persistLanguage(language);
        return changed;
      } catch {
        if (request === latest.current) {
          toast.error(localization.i18n.t("common.errorOccurred"), {
            action: {
              label: localization.i18n.t("common.tryAgain"),
              onClick: () => {
                // Browsers can cache failed module imports. A document reload
                // lets SSR supply this locale even after a stale chunk URL.
                const url = new URL(window.location.href);
                url.searchParams.set("lang", language);
                window.location.assign(url);
              },
            },
          });
        }
        return false;
      } finally {
        if (request === latest.current) setChangingLanguage(false);
      }
    },
    [localization],
  );
  return { changeLanguage, isChangingLanguage };
}

import { I18nextProvider } from "react-i18next";
import { DirectionProvider } from "@radix-ui/react-direction";
import { useTranslation } from "react-i18next";
import type { Localization } from "./init";

import { LocalizationContext } from "./context";

/**
 * Hands Radix the document's reading direction.
 *
 * `useDirection()` falls back to "ltr" whenever no DirectionProvider is above
 * it, so every Radix primitive assumed left-to-right regardless of what the
 * document said — and, since Radix writes that back onto its own root, a tab
 * list rendered left-to-right inside a right-to-left page and its arrow keys
 * followed suit. Supplying it once here keeps direction to a single source of
 * truth rather than a `dir` prop at every call site.
 */
function RadixDirection({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  return <DirectionProvider dir={i18n.dir()}>{children}</DirectionProvider>;
}

export function LocalizationProvider({
  localization,
  children,
}: {
  localization: Localization;
  children: React.ReactNode;
}) {
  return (
    <LocalizationContext.Provider value={localization}>
      <I18nextProvider i18n={localization.i18n}>
        <RadixDirection>{children}</RadixDirection>
      </I18nextProvider>
    </LocalizationContext.Provider>
  );
}

import { I18nextProvider } from "react-i18next";
import type { Localization } from "./init";

import { LocalizationContext } from "./context";

export function LocalizationProvider({
  localization,
  children,
}: {
  localization: Localization;
  children: React.ReactNode;
}) {
  return (
    <LocalizationContext.Provider value={localization}>
      <I18nextProvider i18n={localization.i18n}>{children}</I18nextProvider>
    </LocalizationContext.Provider>
  );
}

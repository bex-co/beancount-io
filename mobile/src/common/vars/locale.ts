import { createPersistentVar } from "@/common/apollo/persistent-var";

export const [localeVar, loadLocale, flushLocale] = createPersistentVar<string>(
  "locale",
  "en",
);

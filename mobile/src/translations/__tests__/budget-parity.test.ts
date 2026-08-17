import { expectLocaleParity } from "./locale-parity";

expectLocaleParity("budget", {
  except: [
    // Predate the feature (they label the journal's directive filter) and are
    // translated in their own right.
    "budget",
    "budgetEntries",
    // A literal Beancount account name — the same text in every language.
    "budgetAccountPlaceholder",
  ],
  minKeys: 21,
});

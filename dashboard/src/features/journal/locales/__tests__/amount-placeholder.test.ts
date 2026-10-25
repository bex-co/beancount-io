import { describe, expect, it } from "vitest";
import { parseDecimalNumber } from "@/common/lib/beancount/decimal-number";
import bg from "../bg";
import ca from "../ca";
import de from "../de";
import en from "../en";
import es from "../es";
import fa from "../fa";
import fr from "../fr";
import ja from "../ja";
import ko from "../ko";
import nl from "../nl";
import pt from "../pt";
import ru from "../ru";
import sk from "../sk";
import uk from "../uk";
import zh from "../zh";

const CATALOGS = { bg, ca, de, en, es, fa, fr, ja, ko, nl, pt, ru, sk, uk, zh };

describe("journal.amountPlaceholder example (w4/1057)", () => {
  it.each(Object.entries(CATALOGS))(
    "%s advertises an example the amount field accepts as 100",
    (_locale, catalog) => {
      const message = catalog["journal.amountPlaceholder"].message;
      const example = message.match(/[\d۰-۹]+(?:[.,][\d۰-۹]+)?/)?.[0];
      expect(example).toBe("100.00");
      expect(parseDecimalNumber(example ?? "")).toBe("100.00");
    },
  );
});

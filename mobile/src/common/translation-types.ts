import type { en } from "../translations/en";

/**
 * A plural value: `other` always, plus whichever CLDR categories the locale
 * distinguishes (see `plural.ts`). English's `{ one, other }` shape is not
 * every language's — Russian needs `few` and `many`, Chinese only `other`.
 */
export type PluralForms = Partial<
  Record<"zero" | "one" | "two" | "few" | "many", string>
> & { other: string };

/** A locale catalog: English's keys, with plural values in any locale's shape. */
export type Translations = {
  [K in keyof typeof en]: (typeof en)[K] extends string ? string : PluralForms;
};

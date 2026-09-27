/**
 * Compile-time checks for `useTranslations().t`, run by `tsc -b` in
 * `yarn lint` (the app tsconfig includes `*.test-d.ts`). Nothing here runs.
 */
import type { useTranslations } from "../use-translations";

declare const t: ReturnType<typeof useTranslations>["t"];
declare const runtimeKey: string;

export function pluralKeysRequireCount(): void {
  t("page.overview.pricesNotUpdated", { count: 6, date: "Sep 8, 2017" });
  t("importer.configure.importButton", { count: 2 });

  // @ts-expect-error a plural key without params
  t("page.overview.pricesNotUpdated");
  // @ts-expect-error a plural key whose params lack `count`
  t("page.overview.notInTotalCount", { date: "Sep 8, 2017" });
  // @ts-expect-error `count` must be a number
  t("page.overview.atCostCount", { count: "2" });

  // Plain keys, and keys built at runtime, keep optional params.
  t("common.netWorth");
  t("common.netWorth", { name: "x" });
  t(runtimeKey);
}

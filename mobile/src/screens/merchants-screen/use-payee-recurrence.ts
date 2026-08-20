import { useMemo } from "react";
import { useQueryShellQuery } from "@/generated-graphql/graphql";
import { getFormatDate } from "@/common/format-util";
import { detectRecurrence } from "./selectors/detect-recurrence";
import {
  buildPayeeSeriesBql,
  mapPayeeSeries,
  payeeSeriesCutoff,
} from "./selectors/payee-series";

/**
 * Shared windowed series fetch + per-payee detection for the merchants
 * directory and merchant detail. One `queryShell` round trip; `today` is
 * captured once per mount so overdue doesn't flicker mid-session.
 */
export function usePayeeRecurrence(ledgerId: string | null | undefined) {
  const today = useMemo(() => getFormatDate(new Date()), []);
  const seriesCutoff = useMemo(() => payeeSeriesCutoff(today), [today]);
  const seriesBql = useMemo(
    () => (seriesCutoff ? buildPayeeSeriesBql(seriesCutoff) : null),
    [seriesCutoff],
  );

  const query = useQueryShellQuery({
    variables: {
      ledgerId: ledgerId!,
      query: seriesBql ?? "",
    },
    skip: !ledgerId || !seriesBql,
  });

  const detections = useMemo(() => {
    const seriesByPayee = mapPayeeSeries(query.data?.queryShell?.table ?? null);
    const map = new Map<string, ReturnType<typeof detectRecurrence>>();
    for (const [payee, series] of seriesByPayee) {
      map.set(payee, detectRecurrence(series, today));
    }
    return map;
  }, [query.data?.queryShell?.table, today]);

  return { ...query, today, detections, seriesBql };
}

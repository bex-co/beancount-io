import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { isOneOfViews } from "@/common/lib/navigation/view-search";

/**
 * Reads and writes a page's selected view from `?view=` (or another `param`,
 * such as a chart's bar mode, `?mode=`).
 *
 * Writes replace the history entry, so Back leaves the page rather than
 * walking through every view visited, and an unchanged value is never written,
 * so a rerender cannot add a history entry. The value is re-checked here
 * because the router still surfaces raw URL values next to the validated ones,
 * so an injected `?view=` shape can reach the page. Returning to the default
 * drops the param, unless `writeFallback` keeps it spelled out (Holdings).
 */
export function useUrlView<T extends string>(
  from: string,
  views: readonly T[],
  fallback: T,
  param = "view",
  { writeFallback = false }: { writeFallback?: boolean } = {},
): [T, (next: string) => void] {
  const search = useSearch({ from: from as never }) as Record<string, unknown>;
  const navigate = useNavigate({ from: from as never });

  const value = search[param];
  const settled = isOneOfViews(views, value) ? value : fallback;

  // A choice whose navigation has not finished is the reader's latest intent,
  // so the controls show it and the next choice is compared with it: A, then
  // B while it loads, then A again must go back to A, not be dropped as the
  // view already rendered (w4/1008). It ends when its navigation settles,
  // whether or not it landed, so it can never stick.
  const [choice, setChoice] = useState<{ view: T } | null>(null);
  const selected = choice?.view ?? settled;

  const select = (next: string) => {
    if (!isOneOfViews(views, next) || next === selected) return;
    const mine = { view: next };
    const settle = () =>
      setChoice((current) => (current === mine ? null : current));
    setChoice(mine);
    void Promise.resolve(
      navigate({
        to: ".",
        search: (previous: Record<string, unknown>) => ({
          ...previous,
          [param]: next === fallback && !writeFallback ? undefined : next,
        }),
        replace: true,
      } as never),
    ).then(settle, settle);
  };

  return [selected, select];
}

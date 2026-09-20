import { useNavigate, useSearch } from "@tanstack/react-router";
import { isOneOfViews } from "@/common/lib/navigation/view-search";

/**
 * Reads and writes a page's selected view from `?view=`.
 *
 * Writes replace the history entry, so Back leaves the page rather than
 * walking through every view visited, and an unchanged value is never written,
 * so a rerender cannot add a history entry. The value is re-checked here
 * because the router still surfaces raw URL values next to the validated ones,
 * so an injected `?view=` shape can reach the page.
 */
export function useUrlView<T extends string>(
  from: string,
  views: readonly T[],
  fallback: T,
): [T, (next: string) => void] {
  const search = useSearch({ from: from as never }) as { view?: unknown };
  const navigate = useNavigate({ from: from as never });

  const selected = isOneOfViews(views, search.view) ? search.view : fallback;

  const select = (next: string) => {
    if (!isOneOfViews(views, next) || next === selected) return;
    void navigate({
      to: ".",
      // Returning to the default drops the param rather than spelling it out.
      search: (previous: Record<string, unknown>) => ({
        ...previous,
        view: next === fallback ? undefined : next,
      }),
      replace: true,
    } as never);
  };

  return [selected, select];
}

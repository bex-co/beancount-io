import { cn } from "@/common/lib/utils/utils";

/**
 * Pressed styling for a filter button.
 *
 * Forced colors drops the shadow and maps both states' text and border onto
 * the same system colours, so fill-plus-shadow stopped telling a pressed
 * filter from an unpressed neighbour — the reader could not see which filters
 * had emptied the result. System colour keywords are honoured in that mode, so
 * a pressed button claims Highlight while the rest sink into Canvas. The two
 * branches are mutually exclusive rather than layered, since same-specificity
 * utilities would otherwise resolve in an order this file does not control.
 * Focus gets its own outline, because the shared Button's ring is a shadow.
 */
export function filterButtonState(active: boolean) {
  return cn(
    active
      ? cn(
          "border-border shadow-xs",
          "forced-colors:border-[Highlight] forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
          // The shared Button lightens its background on hover, which would
          // put HighlightText on a near-Canvas fill; hold the pressed colours.
          "forced-colors:hover:bg-[Highlight] forced-colors:hover:text-[HighlightText]",
        )
      : cn(
          "border-transparent text-muted-foreground",
          "forced-colors:border-[Canvas]",
        ),
    "forced-colors:focus-visible:[outline-style:solid] forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-offset-2 forced-colors:focus-visible:outline-[CanvasText]",
  );
}

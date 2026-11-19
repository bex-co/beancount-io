import { cn } from "@/common/lib/utils/utils";

/**
 * Pressed styling for a filter button.
 *
 * Forced colors drops the shadow and maps both states' text and border
 * onto the same system colours, so fill-plus-shadow stopped telling a pressed
 * filter from an unpressed neighbour — the reader could not see which filters
 * had emptied the result. System colour keywords are honoured in that mode, so
 * a pressed button claims Highlight, with a readable label (w4/m43), while the
 * rest sink into Canvas. The two
 * branches are mutually exclusive rather than layered, since same-specificity
 * utilities would otherwise resolve in an order this file does not control.
 * Focus gets its own outline, because the shared Button's ring is a shadow.
 */
export function filterButtonState(active: boolean) {
  return cn(
    // Pressed reads at a glance: the brand colour's edge (over 3:1 against
    // the card) and a tint, not a fill one shade off the toolbar's; the
    // label stays in the text colour, which the tint keeps above 4.5:1.
    // Unpressed keeps a quiet outline, so it still reads as a choice.
    active
      ? "border-primary/80 bg-primary/10 font-medium text-foreground hover:bg-primary/15 shadow-xs forced-selected"
      : cn(
          "border-border/70 bg-background text-muted-foreground hover:text-foreground",
          "forced-colors:border-[Canvas]",
        ),
    "forced-colors:focus-visible:[outline-style:solid] forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-offset-2 forced-colors:focus-visible:outline-[CanvasText]",
  );
}

/**
 * One shape for every on/off filter on the ledger pages — the Journal's
 * types, flags, what rows show and their layout, the Accounts types — so a
 * choice looks the same wherever it is made: a pill, 32px (a finger's 44px
 * on touch), its label at the size of the list's small print.
 */
export function filterChip(active: boolean, { iconOnly = false } = {}) {
  return cn(
    "h-8 shrink-0 gap-1.5 rounded-full border text-xs font-normal motion-reduce:transition-none aria-pressed:forced-selected pointer-coarse:h-11",
    iconOnly ? "w-8 px-0 pointer-coarse:w-11" : "px-3 pointer-coarse:px-4",
    filterButtonState(active),
  );
}

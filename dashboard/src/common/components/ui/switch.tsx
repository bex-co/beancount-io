import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/common/lib/utils/utils.ts";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
        // Forced colors maps both track colours to Canvas and drops the
        // thumb's shadow, so on and off looked the same (w4/261). Fill the
        // checked track with Highlight and draw the thumb in a contrasting
        // system colour, so fill and thumb position both show the state.
        "forced-colors:border-[CanvasText] forced-colors:data-[state=unchecked]:bg-[Canvas] forced-colors:data-[state=checked]:border-[Highlight] forced-colors:data-[state=checked]:bg-[Highlight]",
        "forced-colors:focus-visible:[outline-style:solid] forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-offset-2 forced-colors:focus-visible:outline-[CanvasText]",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
          "forced-colors:bg-[CanvasText] forced-colors:data-[state=checked]:bg-[HighlightText]",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };

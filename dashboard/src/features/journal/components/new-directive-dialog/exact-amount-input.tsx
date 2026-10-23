import {
  useEffect,
  useRef,
  type ComponentProps,
  type KeyboardEvent,
} from "react";
import { Input } from "@/common/components/ui/input";
import {
  parseDecimalNumber,
  sumDecimalNumbers,
} from "@/common/lib/beancount/decimal-number";
import { cn } from "@/common/lib/utils/utils";

const setInputValue = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  "value",
)?.set;

/**
 * A number field for an exact ledger amount.
 *
 * The browser steps a number input through a double, so one ArrowUp turned
 * 9007199254740993.01 into 9.00719925474099e+15, 3.01 less (w4/1017). Here
 * ArrowUp/ArrowDown step by one in exact decimal arithmetic, the spin buttons
 * are hidden, and the wheel cannot step a focused amount. Typing, exponent
 * input and the browser's own validity are unchanged.
 */
export function ExactAmountInput({
  className,
  onKeyDown,
  ref,
  ...props
}: Omit<ComponentProps<typeof Input>, "type" | "step">) {
  const input = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const node = input.current;
    if (!node) return;
    const holdWheel = (event: WheelEvent) => {
      if (document.activeElement === node) event.preventDefault();
    };
    node.addEventListener("wheel", holdWheel, { passive: false });
    return () => node.removeEventListener("wheel", holdWheel);
  }, []);

  const step = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const node = event.currentTarget;
    // An unfinished "1e" reads as empty; stepping would replace the draft.
    if (node.validity.badInput) return;
    const current = node.value === "" ? "0" : parseDecimalNumber(node.value);
    if (current === null || !setInputValue) return;
    const next = sumDecimalNumbers([
      current,
      event.key === "ArrowUp" ? "1" : "-1",
    ]);
    // Through the input's own setter and event, so the form hears a change.
    setInputValue.call(node, next);
    node.dispatchEvent(new Event("input", { bubbles: true }));
  };

  return (
    <Input
      {...props}
      ref={(node) => {
        input.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      type="number"
      step="any"
      onKeyDown={step}
      className={cn(
        "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        className,
      )}
    />
  );
}

import {
  useEffect,
  useRef,
  type ComponentProps,
  type KeyboardEvent,
} from "react";
import { Input } from "@/common/components/ui/input";
import {
  negateDecimalNumber,
  parseDecimalNumber,
  sumDecimalNumbers,
} from "@/common/lib/beancount/decimal-number";
import { cn } from "@/common/lib/utils/utils";

/** Whether decimal `a` is below decimal `b`. */
function isBelow(a: string, b: string): boolean {
  return sumDecimalNumbers([a, negateDecimalNumber(b)]).startsWith("-");
}

/**
 * A number field for an exact ledger amount.
 *
 * The browser steps a number input through a double, so one ArrowUp turned
 * 9007199254740993.01 into 9.00719925474099e+15, 3.01 less (w4/1017). Here
 * ArrowUp/ArrowDown step by one in exact decimal arithmetic, held inside the
 * field's `min`/`max` as the browser's step is, the spin buttons are hidden,
 * and the wheel cannot step a focused amount. Typing, exponent input and the
 * browser's own validity are unchanged. Used by every form that takes an
 * exact amount (New Entry, Receipt Review, Add Budget; w4/1021).
 *
 * The amount is edited as one left-to-right run, so a Persian form shows the
 * typed `-12.50` rather than `12.50-`; it keeps the page's alignment (w4/1056).
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
    // Read here, in the browser: the server has no HTMLInputElement.
    const setInputValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    if (current === null || !setInputValue) return;
    let next = sumDecimalNumbers([
      current,
      event.key === "ArrowUp" ? "1" : "-1",
    ]);
    const min = node.min === "" ? null : parseDecimalNumber(node.min);
    const max = node.max === "" ? null : parseDecimalNumber(node.max);
    if (min !== null && isBelow(next, min)) next = min;
    if (max !== null && isBelow(max, next)) next = max;
    // Through the input's own setter and event, so the form hears a change.
    setInputValue.call(node, next);
    node.dispatchEvent(new Event("input", { bubbles: true }));
  };

  return (
    <Input
      dir="ltr"
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
        "rtl:text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        className,
      )}
    />
  );
}

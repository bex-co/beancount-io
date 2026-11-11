import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type KeyboardEvent,
} from "react";
import { Input } from "@/common/components/ui/input";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  negateDecimalNumber,
  parseDecimalNumber,
  sumDecimalNumbers,
} from "@/common/lib/beancount/decimal-number";
import {
  isCommaDecimalLanguage,
  parseTypedAmount,
  type TypedAmount,
} from "@/common/lib/beancount/typed-amount";
import { cn } from "@/common/lib/utils/utils";

/** Whether decimal `a` is below decimal `b`. */
function isBelow(a: string, b: string): boolean {
  return sumDecimalNumbers([a, negateDecimalNumber(b)]).startsWith("-");
}

/** What the form receives for the field's text. */
function formValue(parsed: TypedAmount, text: string): string {
  if (parsed.kind === "decimal") return parsed.decimal;
  // Unreadable or ambiguous text stays as typed, so the form refuses it; a
  // blank would let New Entry auto-balance a number the reader never chose.
  return parsed.kind === "empty" ? "" : text;
}

/**
 * A field for an exact ledger amount.
 *
 * A native number field parsed the text with the browser's language, so
 * `4,50` in an English browser was booked as 450 without a word (w2/120).
 * This is a text field: it keeps what the reader typed on screen, reads it
 * with `parseTypedAmount` (either decimal separator, the dashboard's language
 * deciding a lone `,`/`.` before three digits), and hands the form the plain
 * ledger decimal. When that differs from the text, "Recorded as 4.50" says
 * what will be booked; an ambiguous `4,500` asks which was meant.
 *
 * ArrowUp/ArrowDown step by one in exact decimal arithmetic, held inside
 * `min`/`max` (w4/1017), and the wheel cannot step a focused amount. Used by
 * every form that takes an exact amount (New Entry, Receipt Review, Add
 * Budget; w4/1021). The amount is edited as one left-to-right run, so a
 * Persian form shows the typed `-12.50` rather than `12.50-` (w4/1056).
 */
export function ExactAmountInput({
  className,
  onKeyDown,
  onChange,
  value,
  min,
  max,
  ref,
  ...props
}: Omit<ComponentProps<typeof Input>, "type" | "step">) {
  const { t, i18n } = useTranslations();
  const commaDecimal = useMemo(
    () => isCommaDecimalLanguage(i18n.language),
    [i18n.language],
  );
  const input = useRef<HTMLInputElement | null>(null);
  const hintId = useId();

  // The text on screen, and the value last handed to the form. A value the
  // form sets itself (a reset, a prefill) replaces the text; the echo of
  // what this field sent keeps the reader's own spelling.
  const external = value === undefined || value === null ? "" : String(value);
  const [draft, setDraft] = useState({ text: external, sent: external });
  let text = draft.text;
  if (external !== draft.sent) {
    text = external;
    setDraft({ text: external, sent: external });
  }
  const parsed = parseTypedAmount(text, commaDecimal);

  useEffect(() => {
    const node = input.current;
    if (!node) return;
    const holdWheel = (event: WheelEvent) => {
      if (document.activeElement === node) event.preventDefault();
    };
    node.addEventListener("wheel", holdWheel, { passive: false });
    return () => node.removeEventListener("wheel", holdWheel);
  }, []);

  const send = (next: string, event: ChangeEvent<HTMLInputElement>) => {
    const sent = formValue(parseTypedAmount(next, commaDecimal), next);
    setDraft({ text: next, sent });
    // The form reads `target.value`; the field itself keeps the text.
    onChange?.({
      ...event,
      target: { ...event.target, name: event.target.name, value: sent },
      currentTarget: { ...event.currentTarget, value: sent },
    } as ChangeEvent<HTMLInputElement>);
  };

  const step = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const current =
      parsed.kind === "empty"
        ? "0"
        : parsed.kind === "decimal"
          ? parsed.decimal
          : null;
    // An unfinished or ambiguous draft is the reader's to finish.
    if (current === null) return;
    let next = sumDecimalNumbers([
      current,
      event.key === "ArrowUp" ? "1" : "-1",
    ]);
    const low = min === undefined ? null : parseDecimalNumber(String(min));
    const high = max === undefined ? null : parseDecimalNumber(String(max));
    if (low !== null && isBelow(next, low)) next = low;
    if (high !== null && isBelow(high, next)) next = high;
    send(next, {
      target: event.currentTarget,
      currentTarget: event.currentTarget,
    } as ChangeEvent<HTMLInputElement>);
  };

  const hint =
    parsed.kind === "ambiguous"
      ? t("common.amountAmbiguous", {
          text: text.trim(),
          grouped: parsed.grouped,
          decimal: parsed.decimal,
        })
      : parsed.kind === "decimal" && parsed.decimal !== text.trim()
        ? t("common.amountRecordedAs", { value: parsed.decimal })
        : null;
  const describedBy =
    [props["aria-describedby"], hint ? hintId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <>
      <Input
        dir="ltr"
        {...props}
        ref={(node) => {
          input.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        type="text"
        inputMode="decimal"
        // It steps with the arrow keys, as a number field does.
        role="spinbutton"
        autoComplete="off"
        value={text}
        onChange={(event) => send(event.target.value, event)}
        onKeyDown={step}
        aria-describedby={describedBy}
        aria-invalid={
          parsed.kind === "ambiguous" ? true : props["aria-invalid"]
        }
        className={cn("rtl:text-right", className)}
      />
      {hint && (
        <p
          id={hintId}
          dir="auto"
          className={cn(
            "mt-1 text-xs",
            parsed.kind === "ambiguous"
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          {hint}
        </p>
      )}
    </>
  );
}

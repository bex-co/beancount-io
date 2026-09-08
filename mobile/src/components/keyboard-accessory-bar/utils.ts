export type KeyboardShortcutButton = {
  label: string;
  insert: string;
  cursorOffset?: number;
  isDate?: boolean;
};

/**
 * Keyboard events report height from the bottom of the window, while the
 * editor is laid out above its bottom safe-area inset. Convert the event
 * height into the portion that actually overlaps the editor.
 */
export function getKeyboardOverlap(
  keyboardHeight: number,
  bottomInset: number,
): number {
  return Math.max(0, keyboardHeight - bottomInset);
}

export function buildKeyboardShortcutButtons(
  today: string,
  operatingCurrencies: string[],
): KeyboardShortcutButton[] {
  const currencyButtons = Array.from(
    new Set(
      operatingCurrencies
        .map((currency) => currency.trim())
        .filter((currency) => currency.length > 0),
    ),
  ).map((currency) => ({ label: currency, insert: currency }));

  return [
    { label: today, insert: `${today} `, isDate: true },
    { label: "*", insert: "* " },
    { label: "!", insert: "! " },
    { label: '""', insert: '""', cursorOffset: 1 },
    { label: ":", insert: ":" },
    ...currencyButtons,
    { label: "⇥", insert: "  " },
    { label: "-", insert: "-" },
    { label: "#", insert: "#" },
    { label: "^", insert: "^" },
  ];
}

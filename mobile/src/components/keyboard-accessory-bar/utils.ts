export type KeyboardShortcutButton = {
  label: string;
  insert: string;
  cursorOffset?: number;
  isDate?: boolean;
};

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

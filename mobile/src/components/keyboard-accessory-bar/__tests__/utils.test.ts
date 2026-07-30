import { buildKeyboardShortcutButtons } from "../utils";

test("keyboard shortcuts follow the transaction entry flow", () => {
  const buttons = buildKeyboardShortcutButtons("2026-07-29", ["USD"]);

  expect(buttons.map((button) => button.label)).toEqual([
    "2026-07-29",
    "*",
    "!",
    '""',
    ":",
    "USD",
    "⇥",
    "-",
    "#",
    "^",
  ]);
});

test("keyboard shortcuts preserve and deduplicate operating currencies", () => {
  const buttons = buildKeyboardShortcutButtons("2026-07-29", [
    "EUR",
    " USD ",
    "EUR",
    "",
  ]);

  const currencyButtons = buttons.slice(5, 7);
  expect(currencyButtons).toEqual([
    { label: "EUR", insert: "EUR" },
    { label: "USD", insert: "USD" },
  ]);
});

test("keyboard shortcuts omit currencies when none are configured", () => {
  const buttons = buildKeyboardShortcutButtons("2026-07-29", []);

  expect(buttons.map((button) => button.label)).toEqual([
    "2026-07-29",
    "*",
    "!",
    '""',
    ":",
    "⇥",
    "-",
    "#",
    "^",
  ]);
});

test("keyboard shortcuts insert useful multi-character syntax", () => {
  const buttons = buildKeyboardShortcutButtons("2026-07-29", []);

  expect(buttons[0]).toEqual({
    label: "2026-07-29",
    insert: "2026-07-29 ",
    isDate: true,
  });
  expect(buttons[1].insert).toBe("* ");
  expect(buttons[2].insert).toBe("! ");
  expect(buttons[3]).toEqual({
    label: '""',
    insert: '""',
    cursorOffset: 1,
  });
  expect(buttons[5].insert).toBe("  ");
});

import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DirectiveType, type JournalTransaction } from "@/common/types/journal";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { JournalTable } from "../journal-table";

vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");
vi.unmock("@/i18n");

function transaction(
  id: string,
  payee: string,
  narration: string,
  count: number,
): JournalTransaction {
  return {
    entry_hash: id,
    directive_type: DirectiveType.TRANSACTION,
    date: "2017-09-04",
    flag: "*",
    payee,
    narration,
    postings: Array.from({ length: count }, (_, index) => ({
      account: index === 0 ? "Expenses:Fees" : "Assets:Checking",
      units: { number: index === 0 ? "4.95" : "-4.95", currency: "USD" },
      cost: null,
      price: null,
      flag: null,
      meta: {},
    })),
    tags: [],
    links: [],
    meta: {},
  };
}

const entries = [
  transaction("fees", "BANK FEES", "Monthly fee", 1),
  transaction("dinner", "Uncle Boons", "Dinner", 2),
  transaction("same-a", "Same merchant", "Same purchase", 2),
  transaction("same-b", "Same merchant", "Same purchase", 2),
  transaction(
    "long-a",
    "Long merchant",
    `${"Repeated narration ".repeat(20)}first`,
    2,
  ),
  transaction(
    "long-b",
    "Long merchant",
    `${"Repeated narration ".repeat(20)}second`,
    2,
  ),
];

describe("Journal entry control names", () => {
  it.each(["en", "de"] as const)(
    "%s identifies same-day, identical and truncated entries and keeps the responsive disclosure copies synchronized",
    async (language) => {
      const localization = createLocalization();
      await localization.changeLanguage(language);
      const onEntryClick = vi.fn();
      render(
        <LocalizationProvider localization={localization}>
          <JournalTable
            data={entries.map((directive) => ({ directive }))}
            showMetadata={false}
            showPostings={false}
            onEntryClick={onEntryClick}
          />
        </LocalizationProvider>,
      );
      const openControls = screen.getAllByRole("button", {
        name: language === "en" ? /^Open entry / : /^Eintrag /,
      });
      expect(openControls).toHaveLength(6);
      expect(openControls[0]).toHaveAccessibleName(
        language === "en"
          ? "Open entry 2017-09-04 BANK FEES Monthly fee (row 1)"
          : "Eintrag 2017-09-04 BANK FEES Monthly fee öffnen (Zeile 1)",
      );
      expect(openControls[1]).toHaveAccessibleName(
        language === "en"
          ? "Open entry 2017-09-04 Uncle Boons Dinner (row 2)"
          : "Eintrag 2017-09-04 Uncle Boons Dinner öffnen (Zeile 2)",
      );
      const names = openControls.map((button) =>
        button.getAttribute("aria-label"),
      );
      expect(new Set(names).size).toBe(6);
      expect(names[2]).toContain("Same merchant Same purchase");
      expect(names[3]).toContain("Same merchant Same purchase");
      expect(names[4]).not.toContain("first");
      expect(names[5]).not.toContain("second");
      expect(Array.from(names[4] ?? "").length).toBeLessThan(220);
      expect(Array.from(names[5] ?? "").length).toBeLessThan(220);
      const disclosureNames = openControls.map((openControl, index) => {
        const copies = within(openControl.closest("tr")!).getAllByRole(
          "button",
          { expanded: false },
        );
        expect(copies).toHaveLength(2);
        const name = copies[0].getAttribute("aria-label");
        expect(copies[1]).toHaveAccessibleName(name!);
        expect(name).toContain(
          language === "en" ? `(row ${index + 1})` : `(Zeile ${index + 1})`,
        );
        return name;
      });
      expect(new Set(disclosureNames).size).toBe(6);

      const row = openControls[0].closest("tr")!;
      expect(row).toHaveRole("row");
      expect(row).not.toHaveAttribute("tabindex");
      // CSS chooses one of these cells in the browser; jsdom exposes both.
      const toggles = within(row).getAllByRole("button", { expanded: false });
      expect(toggles).toHaveLength(2);
      for (const toggle of toggles) {
        expect(toggle).toHaveAccessibleName(
          language === "en"
            ? "Show 1 posting for 2017-09-04 BANK FEES Monthly fee (row 1)"
            : "1 Buchung für 2017-09-04 BANK FEES Monthly fee anzeigen (Zeile 1)",
        );
        expect(toggle).toHaveTextContent("1");
        expect(toggle).not.toHaveAttribute("aria-controls");
      }
      const secondRow = openControls[1].closest("tr")!;
      expect(
        within(secondRow).getAllByRole("button", { expanded: false })[0],
      ).toHaveAccessibleName(
        language === "en"
          ? "Show 2 postings for 2017-09-04 Uncle Boons Dinner (row 2)"
          : "2 Buchungen für 2017-09-04 Uncle Boons Dinner anzeigen (Zeile 2)",
      );

      const user = userEvent.setup();
      openControls[0].focus();
      await user.keyboard("{Enter}");
      expect(onEntryClick).toHaveBeenLastCalledWith(
        entries[0],
        openControls[0],
      );
      expect(onEntryClick).toHaveBeenCalledTimes(1);
      toggles[0].focus();
      await user.keyboard("{Enter}");
      const targetId = toggles[0].getAttribute("aria-controls");
      expect(targetId).toBeTruthy();
      const target = document.getElementById(targetId!);
      expect(target).not.toBeNull();
      expect(within(target!).getAllByRole("listitem")).toHaveLength(1);
      for (const toggle of toggles) {
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        expect(toggle).toHaveAttribute("aria-controls", targetId);
        expect(toggle).toHaveAccessibleName(
          language === "en"
            ? "Hide 1 posting for 2017-09-04 BANK FEES Monthly fee (row 1)"
            : "1 Buchung für 2017-09-04 BANK FEES Monthly fee ausblenden (Zeile 1)",
        );
      }
      toggles[1].focus();
      await user.keyboard(" ");
      expect(document.getElementById(targetId!)).toBeNull();
      for (const toggle of toggles) {
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        expect(toggle).not.toHaveAttribute("aria-controls");
      }
      await user.click(toggles[1]);
      expect(toggles[0]).toHaveAttribute("aria-expanded", "true");
      expect(onEntryClick).toHaveBeenCalledTimes(1);

      await act(async () =>
        localization.changeLanguage(language === "en" ? "de" : "en"),
      );
      expect(toggles[0]).toHaveAccessibleName(
        language === "en"
          ? "1 Buchung für 2017-09-04 BANK FEES Monthly fee ausblenden (Zeile 1)"
          : "Hide 1 posting for 2017-09-04 BANK FEES Monthly fee (row 1)",
      );
      expect(toggles[0]).toHaveAttribute("aria-controls", targetId);
    },
  );

  it("points only at mounted postings when a detail row already contains metadata", async () => {
    const localization = createLocalization();
    const withMetadata = {
      ...entries[1],
      meta: { receipt: "dinner.pdf" },
    };
    const withoutPostings = {
      ...entries[0],
      entry_hash: "metadata-only",
      postings: [],
      meta: { receipt: "fee.pdf" },
    };
    const onEntryClick = vi.fn();
    render(
      <LocalizationProvider localization={localization}>
        <JournalTable
          data={[{ directive: withMetadata }, { directive: withoutPostings }]}
          showMetadata
          showPostings={false}
          onEntryClick={onEntryClick}
        />
      </LocalizationProvider>,
    );
    expect(screen.getByText("dinner.pdf")).toBeInTheDocument();
    expect(screen.getByText("fee.pdf")).toBeInTheDocument();
    const toggles = screen.getAllByRole("button", { expanded: false });
    for (const toggle of toggles)
      expect(toggle).not.toHaveAttribute("aria-controls");

    const user = userEvent.setup();
    await user.click(toggles[0]);
    const targetId = toggles[0].getAttribute("aria-controls");
    expect(targetId).toBeTruthy();
    const target = document.getElementById(targetId!);
    expect(within(target!).getAllByRole("listitem")).toHaveLength(2);
    expect(target).not.toHaveTextContent("dinner.pdf");
    expect(toggles[1]).toHaveAttribute("aria-controls", targetId);

    const emptyToggles = screen.getAllByRole("button", {
      name: "Show 0 postings for 2017-09-04 BANK FEES Monthly fee (row 2)",
      exact: true,
    });
    await user.click(emptyToggles[0]);
    for (const toggle of emptyToggles)
      expect(toggle).not.toHaveAttribute("aria-controls");
    await user.click(toggles[1]);
    expect(document.getElementById(targetId!)).toBeNull();
    expect(screen.getByText("dinner.pdf")).toBeInTheDocument();
    expect(screen.getByText("fee.pdf")).toBeInTheDocument();
    expect(onEntryClick).not.toHaveBeenCalled();
  });

  it.each(["en", "de"] as const)(
    "%s keeps global postings indicators static with singular/plural entry context",
    async (language) => {
      const localization = createLocalization();
      await localization.changeLanguage(language);
      const onEntryClick = vi.fn();
      const { container } = render(
        <LocalizationProvider localization={localization}>
          <JournalTable
            data={entries.slice(0, 2).map((directive) => ({ directive }))}
            showMetadata={false}
            showPostings
            onEntryClick={onEntryClick}
          />
        </LocalizationProvider>,
      );
      expect(
        screen.queryByRole("button", { expanded: true }),
      ).not.toBeInTheDocument();
      const first = screen.getAllByText(
        language === "en"
          ? "1 posting shown for 2017-09-04 BANK FEES Monthly fee (row 1)"
          : "1 Buchung für 2017-09-04 BANK FEES Monthly fee sichtbar (Zeile 1)",
        { exact: true },
      );
      expect(first).toHaveLength(2);
      expect(
        screen.getAllByText(
          language === "en"
            ? "2 postings shown for 2017-09-04 Uncle Boons Dinner (row 2)"
            : "2 Buchungen für 2017-09-04 Uncle Boons Dinner sichtbar (Zeile 2)",
          { exact: true },
        ),
      ).toHaveLength(2);
      expect(container.querySelectorAll(".postings")).toHaveLength(2);
      expect(onEntryClick).not.toHaveBeenCalled();
    },
  );
});

// w21/678: a transaction the ledger could not book is listed, marked, and says
// it is not counted in balances.
describe("Journal entry that failed booking", () => {
  it.each([
    ["en", "Not booked, not counted"],
    ["de", "Nicht gebucht, nicht gezählt"],
  ] as const)(
    "%s marks it and leaves booked rows unmarked",
    async (language, text) => {
      const localization = createLocalization();
      await localization.changeLanguage(language);
      const broken = {
        ...transaction("sell", "Broker", "QA Sell", 2),
        not_booked: true,
      };
      render(
        <LocalizationProvider localization={localization}>
          <JournalTable
            data={[broken, transaction("buy", "Broker", "QA Buy", 2)].map(
              (directive) => ({ directive }),
            )}
            showMetadata={false}
            showPostings={false}
          />
        </LocalizationProvider>,
      );
      expect(screen.getAllByText(text)).toHaveLength(1);
      const row = screen.getByText(text).closest("tr")!;
      expect(within(row).getByText(/QA Sell/)).toBeTruthy();
    },
  );
});

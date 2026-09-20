import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DirectiveType } from "@/common/types/journal";
import en from "@/i18n/locales/en";
import ru from "@/i18n/locales/ru";
import uk from "@/i18n/locales/uk";
import { FLAG_KEYS } from "@/test/locale-scan";
import { JournalFilters } from "../journal-filters";

// The shared setup mocks this hook to English; this suite renders the real
// Russian catalog instead, so the assertions below are about shipped values
// rather than keys.
vi.mock("@/common/hooks/use-translations", async () => {
  const { default: ruMessages } = await import("@/i18n/locales/ru");
  return {
    useTranslations: () => ({
      t: (key: string) => ruMessages[key] ?? key,
    }),
  };
});

/**
 * w4/149 reported two Russian Journal surfaces still reading English:
 * the Balance column header and the payee placeholder.
 *
 * Scanning Russian for stranded English words now belongs to
 * `src/test/locale-stray-english.test.ts`, which covers every locale and
 * exempts no key under `journal.` or `page.accountReport.`. What stays here is
 * what is specific to this surface: the exact values w4/149 named, the
 * en-identity sweep, and the rendered filter controls.
 */
const REPORTED = [
  ["journal.balance", "Баланс"],
  ["journal.payeePlaceholder", "Получатель"],
] as const;

function journalSurfaceKeys(messages: Record<string, string>) {
  return Object.keys(messages).filter(
    (key) =>
      key.startsWith("journal.") || key.startsWith("page.accountReport."),
  );
}

afterEach(cleanup);

describe("Russian Journal surfaces read as Russian", () => {
  it.each(REPORTED)("%s reads as %s", (key, expected) => {
    expect(ru[key]).toBe(expected);
  });

  it("translates every prose entry that English spells differently", () => {
    const offenders: string[] = [];
    const flags = new Set<string>(FLAG_KEYS);
    for (const key of journalSurfaceKeys(ru)) {
      if (flags.has(key)) continue;
      // Notation and bare symbols are the same in both languages by design;
      // prose is anything with a letter in it.
      if (!/[A-Za-z]{2,}/.test(en[key] ?? "")) continue;
      if (ru[key] === en[key]) offenders.push(`${key}: ${en[key]}`);
    }
    expect(offenders).toEqual([]);
  });

  it.each(FLAG_KEYS)("%s stays a literal flag", (key) => {
    expect(ru[key].length).toBeLessThanOrEqual(2);
    expect(ru[key]).not.toMatch(/\s/);
  });

  it("leaves English and Ukrainian untouched", () => {
    expect(en["journal.balance"]).toBe("Balance");
    expect(en["journal.payeePlaceholder"]).toBe("Payee");
    expect(en["page.accountReport.accountJournal"]).toBe("Account Journal");
    // Ukrainian already carried the Balance header w4/149 cited as the
    // contrast case; this note changed no Ukrainian value.
    expect(uk["journal.balance"]).toBe("Баланс");
    expect(uk["journal.payeePlaceholder"]).toBe("Отримувач");
  });
});

describe("Russian Journal filters render their own names", () => {
  it("names the directive controls in Russian", () => {
    render(
      <JournalFilters
        selectedDirectiveTypes={[DirectiveType.TRANSACTION]}
        onDirectiveTypesChange={vi.fn()}
        selectedTransactionSubtypes={[]}
        onTransactionSubtypesChange={vi.fn()}
        selectedDocumentSubtypes={[]}
        onDocumentSubtypesChange={vi.fn()}
        selectedCustomSubtypes={[]}
        onCustomSubtypesChange={vi.fn()}
        showMetadata={false}
        onShowMetadataChange={vi.fn()}
        showPostings={false}
        onShowPostingsChange={vi.fn()}
      />,
    );
    for (const label of ["Открыть", "Заметка", "Метаданные", "Проводки"]) {
      expect(screen.getByRole("button", { name: label })).toBeVisible();
    }
  });

  it("keeps the subtype flags literal behind Russian accessible names", () => {
    render(
      <JournalFilters
        selectedDirectiveTypes={[DirectiveType.TRANSACTION]}
        onDirectiveTypesChange={vi.fn()}
        selectedTransactionSubtypes={[]}
        onTransactionSubtypesChange={vi.fn()}
        selectedDocumentSubtypes={[]}
        onDocumentSubtypesChange={vi.fn()}
        selectedCustomSubtypes={[]}
        onCustomSubtypesChange={vi.fn()}
        showMetadata={false}
        onShowMetadataChange={vi.fn()}
        showPostings={false}
        onShowPostingsChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Проведённые транзакции" }),
    ).toHaveTextContent("*");
    expect(
      screen.getByRole("button", { name: "Ожидающие транзакции" }),
    ).toHaveTextContent("!");
    expect(
      screen.getByRole("button", { name: "Прочие транзакции" }),
    ).toHaveTextContent("x");
  });
});

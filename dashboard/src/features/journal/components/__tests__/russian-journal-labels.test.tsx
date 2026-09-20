import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DirectiveType } from "@/common/types/journal";
import en from "@/i18n/locales/en";
import ru from "@/i18n/locales/ru";
import uk from "@/i18n/locales/uk";
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
 */
const REPORTED = [
  ["journal.balance", "Баланс"],
  ["journal.payeePlaceholder", "Получатель"],
] as const;

/**
 * Auditing the catalog for the reported symptom surfaced a second, worse
 * shape: entries where a find/replace translated only the first word and left
 * the rest in English. These read as broken Russian rather than as English, so
 * a byte-identical-to-en sweep never finds them.
 */
const HALF_TRANSLATED = [
  ["journal.accountRequired", "Счёт is required"],
  ["journal.clearedTransactions", "Очиститьed transactions"],
  ["journal.entryContext", "Запись Context"],
  ["journal.entryCreatedSuccess", "Запись created successfully"],
  ["journal.exportJournal", "Экспорт Journal"],
  ["journal.noteContent", "Заметка content"],
  ["journal.noteContentRequired", "Заметка content is required"],
  ["journal.otherTransactions", "Прочее transactions"],
  ["page.accountReport.accountBalance", "Счёт Balance"],
  ["page.accountReport.accountJournal", "Счёт Journal"],
  ["page.accountReport.title", "Счёт Report"],
  ["page.accountReport.changesOverTime", "Изменениеs Over Time"],
] as const;

/**
 * Flag columns render the literal Beancount character, never prose — the same
 * rule the Catalan audit established.
 */
const FLAG_KEYS = [
  "journal.cleared",
  "journal.pending",
  "journal.other",
  "journal.linked",
  "journal.budget",
  "journal.discovered",
  "journal.flagAbbrev",
] as const;

/**
 * Latin that legitimately survives translation: brand names, Beancount
 * directive keywords, currency codes, and the literal account names used as
 * placeholder examples (account names are notation, not prose).
 */
const ALLOWED_LATIN =
  /\b(Beancount|Fava|Plaid|pad|option|CSV|PDF|OFX|PNG|JPG|ZIP|URL|SSH|HTTP|Git|CLI|OTP|AI|SEO|IP|JavaScript|Email|email|Mac|Windows|Linux|Cmd|Ctrl|Enter|Shift|USD|EUR|Assets|Liabilities|Income|Expenses|Equity|Bank|Checking|Food|Groceries|io|vs)\b/g;

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

  it.each(HALF_TRANSLATED)(
    "%s no longer stops mid-sentence at %s",
    (key, broken) => {
      expect(ru[key]).not.toBe(broken);
    },
  );

  it("leaves no English word stranded inside a Russian message", () => {
    const offenders: string[] = [];
    for (const key of journalSurfaceKeys(ru)) {
      const value = ru[key];
      if (!/[А-Яа-яЁё]/.test(value)) continue;
      const stray = value
        .replace(ALLOWED_LATIN, "")
        .match(/(?<![\w{$])[A-Za-z]{2,}(?![\w}])/g);
      if (stray) offenders.push(`${key}: ${value} -> ${stray.join(", ")}`);
    }
    expect(offenders).toEqual([]);
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

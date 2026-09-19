import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DirectiveType } from "@/common/types/journal";
import ca from "@/i18n/locales/ca";
import en from "@/i18n/locales/en";
import { JournalFilters } from "../journal-filters";

// The shared setup mocks this hook to English; this suite renders the real
// Catalan catalog instead, so the assertions below are about shipped values
// rather than keys.
vi.mock("@/common/hooks/use-translations", async () => {
  const { default: caMessages } = await import("@/i18n/locales/ca");
  return {
    useTranslations: () => ({
      t: (key: string) => caMessages[key] ?? key,
    }),
  };
});

/**
 * The 2026-09-17 QA run found these controls showing sentences written for
 * unrelated concepts. Each pair is the key and the concept it must name.
 */
const REPAIRED = [
  ["journal.open", "Obrir"],
  ["journal.note", "Nota"],
  ["journal.metadata", "Metadades"],
  ["journal.postings", "Apunts"],
  ["journal.payeeNarration", "Beneficiari/Descripció"],
  ["journal.pendingTransactions", "Transaccions pendents"],
  ["journal.otherTransactions", "Altres transaccions"],
  ["journal.linkedDocuments", "Documents vinculats"],
  ["common.overview", "Resum general"],
  ["component.searchControls.clearAll", "Esborrar tot"],
  [
    "component.searchControls.filterByTagPayee",
    "Filtrar per etiqueta, beneficiari, ...",
  ],
] as const;

/**
 * The exact wrong pairings the QA run reproduced. Several of these strings are
 * legitimate Catalan elsewhere — "Emplenar" is Pad, "Carregant el context de
 * l'entrada..." is the entry-context loader — so the regression is the pairing,
 * not the string.
 */
const MISASSIGNED = [
  ["journal.open", "El contingut de la nota és obligatori"],
  ["journal.note", "No s'han trobat beneficiaris"],
  ["journal.metadata", "Carregant el context de l'entrada..."],
  ["journal.pending", "El beneficiari és obligatori"],
  ["journal.payeeNarration", "Emplenar"],
  [
    "component.searchControls.clearAll",
    "Veure els canvis del compte al llarg del temps",
  ],
  [
    "component.searchControls.filterByTagPayee",
    "Error en carregar la informació general del llibre. Si us plau, torneu-ho a intentar més tard.",
  ],
  [
    "common.overview",
    "No s'han trobat dades del balanç de comprovació per a aquest llibre.",
  ],
] as const;

/**
 * Flag columns render the literal Beancount character, never prose. A sentence
 * here is the signature of the shift that produced this milestone.
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

function renderFilters(
  overrides: Partial<Parameters<typeof JournalFilters>[0]> = {},
) {
  const props = {
    selectedDirectiveTypes: [DirectiveType.TRANSACTION],
    onDirectiveTypesChange: vi.fn(),
    selectedTransactionSubtypes: [],
    onTransactionSubtypesChange: vi.fn(),
    selectedDocumentSubtypes: [],
    onDocumentSubtypesChange: vi.fn(),
    selectedCustomSubtypes: [],
    onCustomSubtypesChange: vi.fn(),
    showMetadata: false,
    onShowMetadataChange: vi.fn(),
    showPostings: false,
    onShowPostingsChange: vi.fn(),
    ...overrides,
  };
  render(<JournalFilters {...props} />);
  return props;
}

afterEach(cleanup);

describe("Catalan controls name their own concepts", () => {
  it.each(REPAIRED)("%s reads as %s", (key, expected) => {
    expect(ca[key]).toBe(expected);
  });

  it.each(MISASSIGNED)(
    "%s no longer carries another concept's message",
    (key, wrong) => {
      expect(ca[key]).not.toBe(wrong);
    },
  );

  it.each(FLAG_KEYS)("%s stays a literal flag", (key) => {
    expect(ca[key].length).toBeLessThanOrEqual(2);
    expect(ca[key]).not.toMatch(/\s/);
  });

  it("keeps every English control unchanged", () => {
    for (const [key] of REPAIRED) {
      expect(en[key]).toBeDefined();
    }
    expect(en["journal.open"]).toBe("Open");
    expect(en["journal.note"]).toBe("Note");
    expect(en["journal.metadata"]).toBe("Metadata");
    expect(en["common.overview"]).toBe("Overview");
    expect(en["component.searchControls.clearAll"]).toBe("Clear all");
  });

  it("does not label two balance-sheet tabs identically", () => {
    // Equity and Net Worth sit side by side in one selector, so one string for
    // both leaves the reader unable to tell the tabs apart.
    expect(ca["common.equity"]).not.toBe(ca["common.netWorth"]);
  });
});

describe("Catalan Journal filters render and act", () => {
  it("labels the directive controls with their own names", () => {
    renderFilters();
    for (const label of ["Obrir", "Nota", "Metadades", "Apunts"]) {
      expect(screen.getByRole("button", { name: label })).toBeVisible();
    }
  });

  it("separates literal subtype flags from their accessible names", () => {
    renderFilters({
      selectedDirectiveTypes: [
        DirectiveType.TRANSACTION,
        DirectiveType.DOCUMENT,
      ],
    });

    const pending = screen.getByRole("button", {
      name: "Transaccions pendents",
    });
    expect(pending).toHaveTextContent("!");

    const other = screen.getByRole("button", { name: "Altres transaccions" });
    expect(other).toHaveTextContent("x");

    const linked = screen.getByRole("button", { name: "Documents vinculats" });
    expect(linked).toHaveTextContent("V");
  });

  it("still filters to Open when the Catalan Open control is used", async () => {
    const user = userEvent.setup();
    const props = renderFilters();

    await user.click(screen.getByRole("button", { name: "Obrir" }));

    expect(props.onDirectiveTypesChange).toHaveBeenCalledWith(
      expect.arrayContaining([DirectiveType.OPEN]),
    );
  });

  it("still toggles metadata and postings from their Catalan labels", async () => {
    const user = userEvent.setup();
    const props = renderFilters();

    await user.click(screen.getByRole("button", { name: "Metadades" }));
    expect(props.onShowMetadataChange).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole("button", { name: "Apunts" }));
    expect(props.onShowPostingsChange).toHaveBeenCalledWith(true);
  });
});

describe("no locale carries another key's message", () => {
  it("keeps flag columns literal in every language", async () => {
    const locales = await import("@/i18n/locales");
    // zh renders journal.pending as a word rather than the "!" flag. That
    // predates this milestone and is a separate call about Chinese flag
    // columns, so it is excluded here rather than silently asserted away.
    const knownDeviations = new Set(["zh/journal.pending"]);
    const offenders: string[] = [];
    for (const [language, messages] of Object.entries(
      locales as unknown as Record<string, Record<string, string>>,
    )) {
      for (const key of FLAG_KEYS) {
        const value = messages[key];
        // A flag is one or two characters; a longer value means the key is
        // carrying prose meant for a neighbouring concept.
        if (!value || knownDeviations.has(`${language}/${key}`)) continue;
        if (value.length > 2 || /\s/.test(value)) {
          offenders.push(`${language}/${key}: ${value}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

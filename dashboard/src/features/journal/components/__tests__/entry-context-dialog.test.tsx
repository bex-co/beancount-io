import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  canWrite: true,
  fileNavigate: vi.fn(),
  queryOptions: [] as Array<{ skip?: boolean }>,
  contextData: {
    entry: { meta: { filename: "main.bean", lineno: 42 } },
    slice: '2024-01-01 * "Payee" "Narration"\n  Assets:Cash  -10 USD\n',
    sha256sum: "abc123",
    balances_before: null,
    balances_after: null,
  } as Record<string, unknown> | null,
  loading: false,
  error: undefined as Error | undefined,
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: (_document: unknown, options: { skip?: boolean }) => {
    mocks.queryOptions.push(options);
    return {
      data: mocks.contextData
        ? { getLedgerEntryContext: mocks.contextData }
        : undefined,
      loading: mocks.loading,
      error: mocks.error,
    };
  },
  useMutation: () => [vi.fn(), {}],
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: mocks.canWrite }),
}));

vi.mock("@/common/hooks/use-file-navigate", () => ({
  useFileNavigate: () => mocks.fileNavigate,
}));

vi.mock("@/common/hooks/use-apollo-cache", () => ({
  useApolloCacheClear: () => vi.fn(),
}));

vi.mock("@/common/hooks/use-theme", () => ({
  useIsDarkTheme: () => false,
}));

vi.mock("@/common/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/common/lib/errors/error-message", () => ({
  getErrorMessageKey: () => "error.generic",
  useErrorMessage: () => (error: unknown) => String(error),
}));

vi.mock("@/common/components/monaco-editor", () => ({
  MonacoEditor: ({
    value,
    onChange,
    options,
  }: {
    value: string;
    onChange?: (value: string | undefined) => void;
    options?: { readOnly?: boolean };
  }) => (
    <textarea
      aria-label="entry-source"
      value={value}
      readOnly={options?.readOnly}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
}));

vi.mock("@/common/lib/editor/monaco-beancount-language-vscode", () => ({
  registerBeancountLanguage: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { EntryContextDialog } from "../entry-context-dialog";

const entry = {
  entry_hash: "hash-1",
  type: "Transaction",
} as never;

describe("EntryContextDialog", () => {
  beforeEach(() => {
    mocks.canWrite = true;
    mocks.loading = false;
    mocks.error = undefined;
    mocks.queryOptions.length = 0;
    mocks.fileNavigate.mockReset();
    mocks.contextData = {
      entry: { meta: { filename: "main.bean", lineno: 42 } },
      slice: '2024-01-01 * "Payee" "Narration"\n  Assets:Cash  -10 USD\n',
      sha256sum: "abc123",
      balances_before: null,
      balances_after: null,
    };
  });

  it("navigates to a resolved source location for writers", () => {
    render(
      <EntryContextDialog
        open
        onOpenChange={vi.fn()}
        entry={entry}
        ledgerId="open_ledger/example"
      />,
    );

    fireEvent.click(screen.getByText("main.bean:42"));
    expect(mocks.fileNavigate).toHaveBeenCalledWith(
      "open_ledger/example",
      "file",
      "main.bean",
      { lineNumber: 42, editMode: true },
    );
  });

  it("shows an unavailable location instead of a clickable :0", () => {
    mocks.contextData = {
      entry: { meta: null },
      slice: "source",
      sha256sum: "abc123",
      balances_before: null,
      balances_after: null,
    };

    render(
      <EntryContextDialog
        open
        onOpenChange={vi.fn()}
        entry={entry}
        ledgerId="open_ledger/example"
      />,
    );

    expect(
      screen.getByText("journal.entryLocationUnavailable"),
    ).toBeInTheDocument();
    expect(screen.queryByText(":0")).not.toBeInTheDocument();
  });

  it("keeps source readable for readers without mutation controls", () => {
    mocks.canWrite = false;

    render(
      <EntryContextDialog
        open
        onOpenChange={vi.fn()}
        entry={entry}
        ledgerId="open_ledger/example"
      />,
    );

    const editor = screen.getByLabelText("entry-source");
    expect(editor).toHaveAttribute("readonly");
    expect(screen.queryByText("common.delete")).not.toBeInTheDocument();
    expect(screen.queryByText("common.save")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("main.bean:42"));
    expect(mocks.fileNavigate).toHaveBeenCalledWith(
      "open_ledger/example",
      "file",
      "main.bean",
      { lineNumber: 42, editMode: false },
    );
  });

  describe("generated padding entries", () => {
    const generatedEntry = {
      entry_hash: "hash-pad",
      directive_type: "Transaction",
      flag: "P",
      date: "2024-02-01",
      narration: "(Padding inserted for Balance of 10.00 USD)",
      postings: [
        {
          account: "Assets:Cash",
          units: { number: "10.00", currency: "USD" },
        },
        {
          account: "Equity:Opening-Balances",
          units: { number: "-10.00", currency: "USD" },
        },
      ],
    } as never;

    it("renders the read-only generated panel instead of querying for a source", () => {
      // A generated entry has no source directive, so the context query could
      // only answer NOT_FOUND and the dialog used to be a dead end.
      mocks.contextData = null;

      render(
        <EntryContextDialog
          open
          onOpenChange={vi.fn()}
          entry={generatedEntry}
          ledgerId="open_ledger/example"
        />,
      );

      expect(mocks.queryOptions.every((options) => options.skip)).toBe(true);
      expect(
        screen.getByText("journal.generatedEntryTitle"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("journal.generatedEntryExplanation"),
      ).toBeInTheDocument();
      expect(screen.getByText("2024-02-01")).toBeInTheDocument();
      expect(
        screen.getByText("(Padding inserted for Balance of 10.00 USD)"),
      ).toBeInTheDocument();
      expect(screen.getByText("Assets:Cash")).toBeInTheDocument();
      expect(screen.getByText("10.00 USD")).toBeInTheDocument();
      expect(screen.getByText("Equity:Opening-Balances")).toBeInTheDocument();
      expect(screen.getByText("-10.00 USD")).toBeInTheDocument();
      expect(
        screen.queryByText("journal.noEntryContext"),
      ).not.toBeInTheDocument();
    });

    it("offers no source, edit, or delete affordances even for writers", () => {
      mocks.canWrite = true;

      render(
        <EntryContextDialog
          open
          onOpenChange={vi.fn()}
          entry={generatedEntry}
          ledgerId="open_ledger/example"
        />,
      );

      expect(screen.queryByLabelText("entry-source")).not.toBeInTheDocument();
      expect(screen.queryByText("common.save")).not.toBeInTheDocument();
      expect(screen.queryByText("common.delete")).not.toBeInTheDocument();
      expect(
        screen.queryByText("journal.entryLocation"),
      ).not.toBeInTheDocument();
    });

    it("still queries and reports errors for ordinary entries", () => {
      mocks.contextData = null;
      mocks.error = new Error("boom");

      render(
        <EntryContextDialog
          open
          onOpenChange={vi.fn()}
          entry={entry}
          ledgerId="open_ledger/example"
        />,
      );

      expect(mocks.queryOptions.some((options) => options.skip)).toBe(false);
      expect(screen.getByText("error.generic")).toBeInTheDocument();
      expect(
        screen.queryByText("journal.generatedEntryTitle"),
      ).not.toBeInTheDocument();
    });
  });

  it("shows Save and Delete for writers", () => {
    render(
      <EntryContextDialog
        open
        onOpenChange={vi.fn()}
        entry={entry}
        ledgerId="open_ledger/example"
      />,
    );

    expect(screen.getByText("common.delete")).toBeInTheDocument();
    expect(screen.getByText("common.save")).toBeInTheDocument();
    expect(screen.getByLabelText("entry-source")).not.toHaveAttribute(
      "readonly",
    );
  });
});

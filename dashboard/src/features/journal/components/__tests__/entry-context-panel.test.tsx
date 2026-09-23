import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  canWrite: true,
  fileNavigate: vi.fn(),
  queryOptions: [] as Array<{
    skip?: boolean;
    variables?: { entryHash?: string; ledgerId?: string };
  }>,
  contextData: {
    entry: { meta: { filename: "transactions/sale.bean", lineno: 49 } },
    slice:
      '2025-11-15 * "Sale" "Dispose property — recognize gain"\n  Assets:Property  -1 HOUSE\n',
    sha256sum: "abc123",
    balances_before: null,
    balances_after: null,
  } as Record<string, unknown> | null,
  loading: false,
  error: undefined as Error | undefined,
  deleteMutation: vi.fn(),
  updateMutation: vi.fn(),
  mutationCallCount: 0,
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
  useMutation: () => {
    mocks.mutationCallCount += 1;
    return [
      mocks.mutationCallCount % 2 === 1
        ? mocks.deleteMutation
        : mocks.updateMutation,
      {},
    ];
  },
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
  getErrorMessageKey: (error: Error) =>
    error.message === "network" ? "common.errors.network" : "error.generic",
  useErrorMessage: () => (error: unknown) => String(error),
}));

vi.mock("@/common/components/monaco-editor", () => ({
  MonacoEditor: ({
    value,
    options,
  }: {
    value: string;
    options?: { readOnly?: boolean };
  }) => (
    <textarea
      aria-label="entry-source"
      value={value}
      readOnly={options?.readOnly}
      onChange={() => undefined}
    />
  ),
}));

vi.mock("@/common/lib/editor/monaco-beancount-language-vscode", () => ({
  registerBeancountLanguage: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { EntryContextPanel } from "../entry-context-panel";

describe("EntryContextPanel", () => {
  beforeEach(() => {
    mocks.canWrite = true;
    mocks.loading = false;
    mocks.error = undefined;
    mocks.queryOptions.length = 0;
    mocks.fileNavigate.mockReset();
    mocks.mutationCallCount = 0;
    mocks.deleteMutation.mockReset().mockResolvedValue({ data: {} });
    mocks.updateMutation.mockReset().mockResolvedValue({ data: {} });
    mocks.contextData = {
      entry: { meta: { filename: "transactions/sale.bean", lineno: 49 } },
      slice:
        '2025-11-15 * "Sale" "Dispose property — recognize gain"\n  Assets:Property  -1 HOUSE\n',
      sha256sum: "abc123",
      balances_before: null,
      balances_after: null,
    };
  });

  it("queries the exact ledgerId and entryHash", () => {
    render(
      <EntryContextPanel
        entryHash="2f4431f658f3553e73512ea3ebc1a2d4"
        ledgerId="open_ledger/real-estate-example"
      />,
    );

    expect(mocks.queryOptions[0]?.variables).toEqual({
      entryHash: "2f4431f658f3553e73512ea3ebc1a2d4",
      ledgerId: "open_ledger/real-estate-example",
    });
    expect(mocks.queryOptions[0]?.skip).toBe(false);
    expect(screen.getByText("transactions/sale.bean:49")).toBeInTheDocument();
    expect(screen.getByLabelText("entry-source")).toHaveValue(
      '2025-11-15 * "Sale" "Dispose property — recognize gain"\n  Assets:Property  -1 HOUSE\n',
    );
  });

  it("shows loading without prior entry content", () => {
    mocks.loading = true;
    mocks.contextData = null;

    render(
      <EntryContextPanel entryHash="hash-a" ledgerId="open_ledger/example" />,
    );

    expect(screen.getByText("journal.loadingEntryContext")).toBeInTheDocument();
    expect(screen.queryByLabelText("entry-source")).not.toBeInTheDocument();
  });

  it("surfaces classified network and missing errors without write controls", () => {
    mocks.canWrite = false;
    mocks.contextData = null;
    mocks.error = new Error("network");

    render(
      <EntryContextPanel entryHash="missing" ledgerId="open_ledger/example" />,
    );

    expect(screen.getByText("common.errors.network")).toBeInTheDocument();
    expect(screen.queryByText("common.delete")).not.toBeInTheDocument();
    expect(screen.queryByText("common.save")).not.toBeInTheDocument();
  });

  it("shows the empty state when the entry has no context", () => {
    mocks.contextData = null;

    render(
      <EntryContextPanel entryHash="gone" ledgerId="open_ledger/example" />,
    );

    expect(screen.getByText("journal.noEntryContext")).toBeInTheDocument();
  });

  it("remounting with a new key clears prior content while loading", () => {
    const { rerender } = render(
      <EntryContextPanel
        key="open_ledger/example:hash-a"
        entryHash="hash-a"
        ledgerId="open_ledger/example"
      />,
    );

    expect(screen.getByLabelText("entry-source")).toBeInTheDocument();

    mocks.loading = true;
    mocks.contextData = null;
    rerender(
      <EntryContextPanel
        key="open_ledger/example:hash-b"
        entryHash="hash-b"
        ledgerId="open_ledger/example"
      />,
    );

    expect(screen.getByText("journal.loadingEntryContext")).toBeInTheDocument();
    expect(screen.queryByLabelText("entry-source")).not.toBeInTheDocument();
  });

  it("keeps readers read-only", () => {
    mocks.canWrite = false;

    render(
      <EntryContextPanel entryHash="hash-1" ledgerId="open_ledger/example" />,
    );

    expect(screen.getByLabelText("entry-source")).toHaveAttribute("readonly");
    expect(screen.queryByText("common.delete")).not.toBeInTheDocument();
  });

  it("skips the query when asked", () => {
    render(
      <EntryContextPanel
        entryHash="hash-1"
        ledgerId="open_ledger/example"
        skip
      />,
    );

    expect(mocks.queryOptions[0]?.skip).toBe(true);
  });

  it("notifies onDeleted after a confirmed delete", async () => {
    const onDeleted = vi.fn();
    render(
      <EntryContextPanel
        entryHash="hash-1"
        ledgerId="open_ledger/example"
        onDeleted={onDeleted}
      />,
    );

    fireEvent.click(screen.getByText("common.delete"));
    fireEvent.click(await screen.findByText("journal.entryDeleteConfirm"));

    await waitFor(() => {
      expect(mocks.deleteMutation).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledTimes(1);
    });
  });

  describe("a price from a managed feed", () => {
    beforeEach(() => {
      mocks.contextData = {
        entry: {
          meta: { filename: "https:/beancount.io/prices/BTC-USD", lineno: 7 },
        },
        slice: "2026-09-15 price BTC 76000 USD\n",
        sha256sum: "feed123",
        balances_before: null,
        balances_after: null,
        managed_source: "https://beancount.io/prices/BTC-USD",
      };
    });

    it("offers a writer no edit, save, or delete, and names the feed", () => {
      render(
        <EntryContextPanel entryHash="hash-1" ledgerId="open_ledger/example" />,
      );

      expect(screen.getByLabelText("entry-source")).toHaveAttribute("readonly");
      expect(screen.queryByText("common.delete")).not.toBeInTheDocument();
      expect(screen.queryByText("common.save")).not.toBeInTheDocument();
      expect(
        screen.getByText("journal.managedPriceEntryExplanation"),
      ).toBeInTheDocument();
    });

    it("shows the virtual location without offering to open it as a file", () => {
      render(
        <EntryContextPanel entryHash="hash-1" ledgerId="open_ledger/example" />,
      );

      expect(
        screen.getByText("https:/beancount.io/prices/BTC-USD:7"),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "journal.openEntrySource" }),
      ).not.toBeInTheDocument();
      expect(mocks.fileNavigate).not.toHaveBeenCalled();
    });

    it("trusts the server's answer, not the shape of the path", () => {
      // A path that merely looks like a virtual key is still an ordinary file
      // when the ledger does not name a managed source for it.
      mocks.contextData = { ...mocks.contextData, managed_source: null };
      render(
        <EntryContextPanel entryHash="hash-1" ledgerId="open_ledger/example" />,
      );

      expect(screen.getByText("common.delete")).toBeInTheDocument();
    });

    it("leaves an ordinary price entry in a repository file editable", () => {
      mocks.contextData = {
        ...mocks.contextData,
        entry: { meta: { filename: "prices/btc.bean", lineno: 3 } },
        managed_source: null,
      };
      render(
        <EntryContextPanel entryHash="hash-1" ledgerId="open_ledger/example" />,
      );

      expect(screen.getByLabelText("entry-source")).not.toHaveAttribute(
        "readonly",
      );
      expect(screen.getByText("common.delete")).toBeInTheDocument();
      expect(
        screen.queryByText("journal.managedPriceEntryExplanation"),
      ).not.toBeInTheDocument();
    });
  });
});

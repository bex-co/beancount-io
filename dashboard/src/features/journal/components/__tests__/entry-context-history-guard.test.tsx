import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const blockerState = vi.hoisted(() => ({
  status: "idle" as "idle" | "blocked",
  reset: vi.fn(),
  proceed: vi.fn(),
  opts: [] as Array<{ shouldBlockFn: () => boolean }>,
}));

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({}),
  useBlocker: (opts: { shouldBlockFn: () => boolean }) => {
    blockerState.opts.push(opts);
    return blockerState;
  },
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({
    data: {
      getLedgerEntryContext: {
        entry: { meta: { filename: "main.bean", lineno: 42 } },
        slice: '2024-01-01 * "Payee" "Narration"\n  Assets:Cash  -10 USD\n',
        sha256sum: "abc123",
        balances_before: null,
        balances_after: null,
      },
    },
    loading: false,
    error: undefined,
  }),
  useMutation: () => [vi.fn().mockResolvedValue({ data: {} }), {}],
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: { entry?: string }) =>
      params?.entry ? `${key} ${params.entry}` : key,
  }),
}));

vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: true }),
}));

vi.mock("@/common/hooks/use-file-navigate", () => ({
  useFileNavigate: () => vi.fn(),
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
  }: {
    value: string;
    onChange?: (value: string | undefined) => void;
  }) => (
    <textarea
      aria-label="entry-source"
      value={value}
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

const entry = { entry_hash: "hash-1", type: "Transaction" } as never;

function renderDialog() {
  return render(
    <EntryContextDialog
      open
      onOpenChange={vi.fn()}
      entry={entry}
      ledgerId="open_ledger/example"
    />,
  );
}

describe("EntryContextDialog history guard (w4/1063)", () => {
  beforeEach(() => {
    blockerState.status = "idle";
    blockerState.opts.length = 0;
    blockerState.reset.mockReset();
    blockerState.proceed.mockReset();
  });

  it("does not block history while the draft is clean", () => {
    renderDialog();
    expect(blockerState.opts.at(-1)?.shouldBlockFn()).toBe(false);
  });

  it("blocks history once the source draft is dirty", () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText("entry-source"), {
      target: { value: "2024-01-01 * edited\n" },
    });
    expect(blockerState.opts.at(-1)?.shouldBlockFn()).toBe(true);
  });

  it("keeps editing on reset and completes navigation on discard", async () => {
    const user = userEvent.setup();
    const { rerender } = renderDialog();
    fireEvent.change(screen.getByLabelText("entry-source"), {
      target: { value: "2024-01-01 * edited\n" },
    });

    blockerState.status = "blocked";
    rerender(
      <EntryContextDialog
        open
        onOpenChange={vi.fn()}
        entry={entry}
        ledgerId="open_ledger/example"
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "journal.keepEditing" }),
    );
    expect(blockerState.reset).toHaveBeenCalled();
    expect(
      (screen.getByLabelText("entry-source") as HTMLTextAreaElement).value,
    ).toContain("edited");

    await user.click(
      screen.getByRole("button", { name: "journal.discardEntryEdit" }),
    );
    expect(blockerState.proceed).toHaveBeenCalled();
  });
});

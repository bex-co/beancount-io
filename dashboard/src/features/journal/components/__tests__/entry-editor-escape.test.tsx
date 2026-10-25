import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hasActiveMonacoWidget } from "../entry-editor-escape";

const mocks = vi.hoisted(() => ({
  widget: "none" as "none" | "find" | "goto",
  contextData: {
    entry: { meta: { filename: "main.bean", lineno: 42 } },
    slice: '2024-01-01 * "Payee" "Narration"\n  Assets:Cash  -10 USD\n',
    sha256sum: "abc123",
    balances_before: null,
    balances_after: null,
  } as Record<string, unknown> | null,
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({
    data: mocks.contextData
      ? { getLedgerEntryContext: mocks.contextData }
      : undefined,
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
  MonacoEditor: ({ value }: { value: string }) => (
    <div className="monaco-editor">
      {mocks.widget === "find" && <div className="find-widget visible" />}
      {mocks.widget === "goto" && (
        <div className="quick-input-widget" style={{ display: "block" }} />
      )}
      <textarea aria-label="entry-source" value={value} readOnly />
    </div>
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

describe("hasActiveMonacoWidget", () => {
  it("detects visible Find and open Go to Line widgets only", () => {
    const root = document.createElement("div");
    root.innerHTML = `<div class="monaco-editor"><div class="find-widget"></div><div class="quick-input-widget" style="display: none"></div></div>`;
    expect(hasActiveMonacoWidget(root)).toBe(false);
    root.querySelector(".find-widget")!.classList.add("visible");
    expect(hasActiveMonacoWidget(root)).toBe(true);
    root.querySelector(".find-widget")!.classList.remove("visible");
    (root.querySelector(".quick-input-widget") as HTMLElement).style.display =
      "block";
    expect(hasActiveMonacoWidget(root)).toBe(true);
  });
});

describe("EntryContextDialog Escape ownership (w4/1062)", () => {
  beforeEach(() => {
    mocks.widget = "none";
  });

  it.each(["find", "goto"] as const)(
    "leaves Escape to the %s widget instead of closing",
    (widget) => {
      mocks.widget = widget;
      const onOpenChange = vi.fn();
      render(
        <EntryContextDialog
          open
          onOpenChange={onOpenChange}
          entry={entry}
          ledgerId="open_ledger/example"
        />,
      );
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    },
  );

  it("closes on a bare Escape when no widget is active", () => {
    const onOpenChange = vi.fn();
    render(
      <EntryContextDialog
        open
        onOpenChange={onOpenChange}
        entry={entry}
        ledgerId="open_ledger/example"
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

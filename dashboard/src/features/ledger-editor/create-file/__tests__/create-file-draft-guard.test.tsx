import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const blockerState = vi.hoisted(() => ({
  status: "idle" as "idle" | "blocked",
  reset: vi.fn(),
  proceed: vi.fn(),
  shouldBlockFn: null as null | (() => boolean),
}));

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({
    ledgerOwner: "owner",
    ledgerName: "books",
    _splat: "",
  }),
  useNavigate: () => vi.fn(),
  useBlocker: (opts: { shouldBlockFn: () => boolean }) => {
    blockerState.shouldBlockFn = opts.shouldBlockFn;
    return blockerState;
  },
}));

vi.mock("@apollo/client/react", () => ({
  useMutation: () => [vi.fn()],
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

vi.mock("@/common/lib/errors/error-message", () => ({
  useErrorMessage: () => (error: unknown) => String(error),
}));

vi.mock("@/common/hooks/use-theme", () => ({
  useIsDarkTheme: () => false,
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerName: "books" }),
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
      aria-label="file-content"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

vi.mock("@/common/lib/editor/monaco-beancount-language", () => ({
  registerBeancountLanguage: vi.fn(),
}));

vi.mock("@/common/components/page-header", () => ({
  PageHeader: () => <div>header</div>,
}));

vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));

vi.mock("@/common/components/seo/ledger-page-seo", () => ({
  LedgerPageSEO: () => null,
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import CreateFilePage from "../index";

describe("CreateFilePage draft guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    blockerState.status = "idle";
    blockerState.shouldBlockFn = null;
  });

  it("treats empty filename and content as clean", () => {
    render(<CreateFilePage />);
    expect(blockerState.shouldBlockFn?.()).toBe(false);
  });

  it("blocks when the filename draft is non-empty", () => {
    render(<CreateFilePage />);
    fireEvent.change(screen.getByPlaceholderText("ledgerEditor.nameYourFile"), {
      target: { value: "notes.bean" },
    });
    expect(blockerState.shouldBlockFn?.()).toBe(true);
  });

  it("blocks when the editor draft is non-empty", () => {
    render(<CreateFilePage />);
    fireEvent.change(screen.getByLabelText("file-content"), {
      target: { value: "2024-01-01 open Assets:Cash" },
    });
    expect(blockerState.shouldBlockFn?.()).toBe(true);
  });

  it("keeps the draft when Stay is chosen from the leave dialog", () => {
    blockerState.status = "blocked";
    render(<CreateFilePage />);
    fireEvent.change(screen.getByPlaceholderText("ledgerEditor.nameYourFile"), {
      target: { value: "notes.bean" },
    });

    expect(screen.getByText("ledgerEditor.unsavedChanges")).toBeInTheDocument();
    fireEvent.click(screen.getByText("ledgerEditor.stay"));
    expect(blockerState.reset).toHaveBeenCalled();
    expect(
      screen.getByPlaceholderText("ledgerEditor.nameYourFile"),
    ).toHaveValue("notes.bean");
  });
});

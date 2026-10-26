import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const blockerState = vi.hoisted(() => ({
  status: "idle" as "idle" | "blocked",
  reset: vi.fn(),
  proceed: vi.fn(),
  shouldBlockFn: null as null | ((args: unknown) => boolean),
  enableBeforeUnload: null as null | boolean | (() => boolean),
}));

vi.mock("@tanstack/react-router", () => ({
  useHydrated: () => true,
  useParams: () => ({
    ledgerOwner: "owner",
    ledgerName: "books",
    _splat: "",
  }),
  useNavigate: () => vi.fn(),
  useBlocker: (opts: {
    shouldBlockFn: (args: unknown) => boolean;
    enableBeforeUnload?: boolean | (() => boolean);
  }) => {
    blockerState.shouldBlockFn = opts.shouldBlockFn;
    blockerState.enableBeforeUnload = opts.enableBeforeUnload ?? null;
    return blockerState;
  },
}));

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({
    query: async () => ({ data: undefined }),
    cache: { evict: () => true, gc: () => [] },
  }),
  useMutation: () => [vi.fn()],
  // The folder has been read and holds nothing yet.
  useQuery: () => ({ data: { getLedgerDirContent: [] } }),
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

// Drafting is writer-only behaviour; this suite is about the draft guard.
vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({
    canWrite: true,
    canRead: true,
    isAdmin: false,
  }),
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

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import CreateFilePage from "../index";

const DEPARTURE = {
  current: { routeId: "r", pathname: "/f", params: {}, search: {} },
  next: { routeId: "r", pathname: "/other", params: {}, search: {} },
};

describe("CreateFilePage draft guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    blockerState.status = "idle";
    blockerState.shouldBlockFn = null;
    blockerState.enableBeforeUnload = null;
  });

  it("treats empty filename and content as clean", () => {
    render(<CreateFilePage />);
    expect(blockerState.shouldBlockFn?.(DEPARTURE)).toBe(false);
    expect(
      typeof blockerState.enableBeforeUnload === "function"
        ? blockerState.enableBeforeUnload()
        : blockerState.enableBeforeUnload,
    ).toBe(false);
  });

  it("blocks when the filename draft is non-empty", () => {
    render(<CreateFilePage />);
    fireEvent.change(screen.getByPlaceholderText("ledgerEditor.nameYourFile"), {
      target: { value: "notes.bean" },
    });
    expect(blockerState.shouldBlockFn?.(DEPARTURE)).toBe(true);
    expect(
      typeof blockerState.enableBeforeUnload === "function"
        ? blockerState.enableBeforeUnload()
        : blockerState.enableBeforeUnload,
    ).toBe(true);
  });

  it("lets a language-only transition through with a draft (w4/1088)", () => {
    render(<CreateFilePage />);
    fireEvent.change(screen.getByPlaceholderText("ledgerEditor.nameYourFile"), {
      target: { value: "notes.bean" },
    });
    const languageOnly = {
      current: {
        routeId: "r",
        pathname: "/f",
        params: {},
        search: { lang: "en" },
      },
      next: {
        routeId: "r",
        pathname: "/f",
        params: {},
        search: { lang: "de" },
      },
    };
    expect(blockerState.shouldBlockFn?.(languageOnly)).toBe(false);
    expect(blockerState.shouldBlockFn?.(DEPARTURE)).toBe(true);
  });

  it("blocks when the editor draft is non-empty", () => {
    render(<CreateFilePage />);
    fireEvent.change(screen.getByLabelText("file-content"), {
      target: { value: "2024-01-01 open Assets:Cash" },
    });
    expect(blockerState.shouldBlockFn?.(DEPARTURE)).toBe(true);
    expect(
      typeof blockerState.enableBeforeUnload === "function"
        ? blockerState.enableBeforeUnload()
        : blockerState.enableBeforeUnload,
    ).toBe(true);
  });

  it("disarms beforeunload when a typed draft is cleared back to empty", () => {
    render(<CreateFilePage />);
    const filename = screen.getByPlaceholderText("ledgerEditor.nameYourFile");
    fireEvent.change(filename, { target: { value: "notes.bean" } });
    fireEvent.change(filename, { target: { value: "" } });
    expect(blockerState.shouldBlockFn?.(DEPARTURE)).toBe(false);
    expect(
      typeof blockerState.enableBeforeUnload === "function"
        ? blockerState.enableBeforeUnload()
        : blockerState.enableBeforeUnload,
    ).toBe(false);
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

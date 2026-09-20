import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * The public directory hides its Create File and Upload Files buttons, but the
 * routes behind them are reachable directly. Anonymous readers were handed a
 * filename field, an editor and an enabled Save — and a file picker with an
 * Upload button — for changes the API refuses. These cases drive both pages
 * through every access state, including a permission loss mid-draft, where the
 * work already typed must survive even though the write must not proceed.
 */

const permission = vi.hoisted(() => ({
  canWrite: false,
  canRead: true,
  isAdmin: false,
}));
const authenticated = vi.hoisted(() => ({ value: false }));
const createFile = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({
    ledgerOwner: "owner",
    ledgerName: "books",
    _splat: "transactions",
  }),
  useNavigate: () => vi.fn(),
  useBlocker: () => ({ status: "idle", reset: vi.fn(), proceed: vi.fn() }),
  Link: ({
    children,
    params,
  }: {
    children: React.ReactNode;
    params?: Record<string, string>;
  }) => <a data-splat={params?._splat}>{children}</a>,
}));

vi.mock("@apollo/client/react", () => ({
  useMutation: () => [createFile],
  useQuery: () => ({ data: undefined }),
}));

vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => permission,
}));

vi.mock("@/common/hooks/use-is-authenticated", () => ({
  useIsAuthenticated: () => authenticated.value,
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

vi.mock("@/common/lib/errors/error-message", () => ({
  useErrorMessage: () => (error: unknown) => String(error),
}));

vi.mock("@/common/hooks/use-theme", () => ({ useIsDarkTheme: () => false }));

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

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import CreateFilePage from "@/features/ledger-editor/create-file";
import UploadFilesPage from "@/features/ledger-editor/upload-files";

function asGuest() {
  permission.canWrite = false;
  authenticated.value = false;
}

function asReaderWithoutWrite() {
  permission.canWrite = false;
  authenticated.value = true;
}

function asWriter() {
  permission.canWrite = true;
  authenticated.value = true;
}

beforeEach(() => {
  vi.clearAllMocks();
  asGuest();
});

afterEach(cleanup);

const filenameField = () =>
  screen.queryByPlaceholderText("ledgerEditor.nameYourFile");
const saveButton = () =>
  screen.queryByRole("button", { name: /ledgerEditor.save|save/i });

describe("create file page", () => {
  it("offers no form to a signed-out reader", () => {
    render(<CreateFilePage />);

    expect(filenameField()).toBeNull();
    expect(screen.queryByLabelText("file-content")).toBeNull();
    expect(saveButton()).toBeNull();
    expect(
      screen.getByText("common.errors.unauthenticated"),
    ).toBeInTheDocument();
  });

  it("tells a signed-in reader without write access why, not to sign in", () => {
    asReaderWithoutWrite();
    render(<CreateFilePage />);

    expect(filenameField()).toBeNull();
    expect(screen.getByText("common.errors.forbidden")).toBeInTheDocument();
  });

  it("points back at the directory the reader came from", () => {
    render(<CreateFilePage />);

    expect(
      screen.getByText("ledgerEditor.browseParentDirectory").closest("a"),
    ).toHaveAttribute("data-splat", "transactions");
  });

  it("keeps the real form for a writer", () => {
    asWriter();
    render(<CreateFilePage />);

    expect(filenameField()).toBeInTheDocument();
    expect(screen.getByLabelText("file-content")).toBeInTheDocument();
  });

  it("still validates filenames for a writer", () => {
    asWriter();
    render(<CreateFilePage />);

    fireEvent.change(filenameField()!, { target: { value: "../escape.bean" } });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "ledgerEditor.invalidFilePath",
    );
  });

  it("keeps a draft but refuses to write when access is lost mid-draft", () => {
    asWriter();
    const { rerender } = render(<CreateFilePage />);
    fireEvent.change(filenameField()!, { target: { value: "notes.bean" } });
    fireEvent.change(screen.getByLabelText("file-content"), {
      target: { value: "; draft" },
    });

    permission.canWrite = false;
    rerender(<CreateFilePage />);

    // The draft survives — losing access must not throw away typed work.
    expect(filenameField()).toHaveValue("notes.bean");
    expect(screen.getByLabelText("file-content")).toHaveValue("; draft");

    const save = screen.getByRole("button", { name: /save/i });
    expect(save).toBeDisabled();
    fireEvent.click(save);
    expect(createFile).not.toHaveBeenCalled();
  });
});

describe("upload files page", () => {
  const picker = () => document.querySelector('input[type="file"]');

  it("offers no file picker to a signed-out reader", () => {
    render(<UploadFilesPage />);

    expect(picker()).toBeNull();
    expect(screen.queryByRole("button", { name: /upload/i })).toBeNull();
    expect(
      screen.getByText("common.errors.unauthenticated"),
    ).toBeInTheDocument();
  });

  it("tells a signed-in reader without write access why", () => {
    asReaderWithoutWrite();
    render(<UploadFilesPage />);

    expect(picker()).toBeNull();
    expect(screen.getByText("common.errors.forbidden")).toBeInTheDocument();
  });

  it("keeps the real picker for a writer", () => {
    asWriter();
    render(<UploadFilesPage />);

    expect(picker()).not.toBeNull();
  });

  it("points back at the directory the reader came from", () => {
    render(<UploadFilesPage />);

    expect(
      screen.getByText("ledgerEditor.browseParentDirectory").closest("a"),
    ).toHaveAttribute("data-splat", "transactions");
  });
});

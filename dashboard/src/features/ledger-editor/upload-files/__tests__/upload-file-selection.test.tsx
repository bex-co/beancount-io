import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * `event.target.files` is a live FileList, and clearing the input to allow
 * re-selecting the same path empties that same object. The handler read it
 * inside the state updater, which React runs after the handler returns — so
 * the append saw an already-emptied list and the choice vanished.
 *
 * These cases model that ordering explicitly: the fake input empties its own
 * FileList the moment `value` is set, exactly as a browser does, so a handler
 * that defers the read fails here.
 */

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({
    ledgerOwner: "owner",
    ledgerName: "books",
    _splat: "transactions",
  }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

vi.mock("@apollo/client/react", () => ({
  useMutation: () => [vi.fn()],
  useQuery: () => ({ data: undefined }),
}));

vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({
    canWrite: true,
    canRead: true,
    isAdmin: false,
  }),
}));

vi.mock("@/common/hooks/use-is-authenticated", () => ({
  useIsAuthenticated: () => true,
}));

vi.mock("@/common/hooks/use-translations", () => ({
  // Interpolate, so the per-row remove label still names its own file.
  useTranslations: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key} ${Object.values(vars).join(" ")}` : key,
  }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerName: "books" }),
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

import UploadFilesPage from "@/features/ledger-editor/upload-files";

const file = (name: string, body: string) =>
  new File([body], name, { type: "text/plain" });

/**
 * Stages `files` on the page's file input the way a browser does: the FileList
 * the change event carries is live, and assigning `value` empties it.
 */
function choose(files: File[]) {
  const input = document.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;

  let staged = files;
  Object.defineProperty(input, "files", {
    configurable: true,
    get: () => ({
      length: staged.length,
      item: (index: number) => staged[index] ?? null,
      [Symbol.iterator]: function* () {
        yield* staged;
      },
    }),
  });
  Object.defineProperty(input, "value", {
    configurable: true,
    get: () => (staged.length > 0 ? staged[0].name : ""),
    // Resetting the input clears the very FileList the event handed out.
    set: () => {
      staged = [];
    },
  });

  fireEvent.change(input);
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("staging files for upload", () => {
  it("keeps the first choice even though the input is reset", () => {
    render(<UploadFilesPage />);

    choose([file("qa-native-first.txt", "first local fixture")]);

    expect(screen.getByText(/qa-native-first\.txt/)).toBeInTheDocument();
  });

  it("appends a second, different choice instead of replacing it", () => {
    render(<UploadFilesPage />);

    choose([file("qa-native-first.txt", "first local fixture")]);
    choose([file("qa-native-second.txt", "second local fixture")]);

    expect(screen.getByText(/qa-native-first\.txt/)).toBeInTheDocument();
    expect(screen.getByText(/qa-native-second\.txt/)).toBeInTheDocument();
  });

  it("stages every file chosen together in one go", () => {
    render(<UploadFilesPage />);

    choose([
      file("qa-native-first.txt", "first local fixture"),
      file("qa-native-second.txt", "second local fixture"),
    ]);

    expect(screen.getByText(/qa-native-first\.txt/)).toBeInTheDocument();
    expect(screen.getByText(/qa-native-second\.txt/)).toBeInTheDocument();
  });

  it("re-stages a file that was removed from the queue", () => {
    render(<UploadFilesPage />);
    choose([file("qa-native-first.txt", "first local fixture")]);

    fireEvent.click(
      screen.getByRole("button", {
        name: "ledgerEditor.removeSelectedFile qa-native-first.txt",
      }),
    );
    expect(screen.queryByText(/qa-native-first\.txt/)).toBeNull();

    choose([file("qa-native-first.txt", "first local fixture")]);

    expect(screen.getByText(/qa-native-first\.txt/)).toBeInTheDocument();
  });

  it("leaves the queue alone when a chooser is cancelled", () => {
    render(<UploadFilesPage />);
    choose([file("qa-native-first.txt", "first local fixture")]);

    choose([]);

    expect(screen.getByText(/qa-native-first\.txt/)).toBeInTheDocument();
  });
});

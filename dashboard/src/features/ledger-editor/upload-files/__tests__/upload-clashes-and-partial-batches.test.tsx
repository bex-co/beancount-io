import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  useHydrated: () => true,
  useParams: () => ({
    ledgerOwner: "owner",
    ledgerName: "books",
    _splat: "transactions",
  }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

const mutate = vi.hoisted(() => vi.fn());
vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({
    query: async () => ({ data: undefined }),
    cache: { evict: () => true, gc: () => [] },
  }),
  useMutation: () => [mutate],
  // The target folder already holds main.bean.
  useQuery: () => ({
    data: { getLedgerDirContent: [{ name: "main.bean" }, { name: "books" }] },
  }),
}));

vi.mock("@/common/lib/errors/error-message", () => ({
  useErrorMessage: () => () => "the server refused it",
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

const upload = () =>
  screen.getByRole("button", { name: "ledgerEditor.uploadFiles" });
const stagedNames = () =>
  screen
    .getAllByRole("button", { name: /^ledgerEditor\.removeSelectedFile / })
    .map((button) =>
      button
        .getAttribute("aria-label")!
        .replace("ledgerEditor.removeSelectedFile ", ""),
    );
const sentPaths = () =>
  mutate.mock.calls.map(([options]) => options.variables.path);

beforeEach(() => {
  vi.clearAllMocks();
  mutate.mockResolvedValue({ data: {} });
});

afterEach(cleanup);

describe("Upload Files clashes, duplicates and partial batches (w3/563)", () => {
  it("flags a name the folder already has and keeps upload disabled", () => {
    render(<UploadFilesPage />);
    choose([file("main.bean", "synthetic"), file("new.bean", "synthetic")]);

    expect(
      screen.getByText("ledgerEditor.fileAlreadyExists"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("ledgerEditor.removeExistingFiles"),
    ).toBeInTheDocument();
    expect(upload()).toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", {
        name: "ledgerEditor.removeSelectedFile main.bean",
      }),
    );
    expect(upload()).toBeEnabled();
  });

  it("keeps one row when the same file is chosen twice, the later pick winning", () => {
    render(<UploadFilesPage />);
    choose([file("a.bean", "first")]);
    choose([file("b.bean", "other"), file("a.bean", "second")]);

    expect(stagedNames()).toEqual(["a.bean", "b.bean"]);
  });

  it("names the file a batch stopped at, drops what landed, and retries only the rest", async () => {
    mutate.mockImplementation(async ({ variables }) => {
      if (variables.path === "transactions/b.bean") {
        throw new Error("repository file already exists");
      }
      return { data: {} };
    });
    render(<UploadFilesPage />);
    choose([file("a.bean", "a"), file("b.bean", "b"), file("c.bean", "c")]);

    fireEvent.click(upload());

    expect(
      await screen.findByText(
        "ledgerEditor.uploadStoppedAt b.bean the server refused it",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("ledgerEditor.uploadedBeforeFailure a.bean"),
    ).toBeInTheDocument();
    expect(sentPaths()).toEqual(["transactions/a.bean", "transactions/b.bean"]);
    expect(stagedNames()).toEqual(["b.bean", "c.bean"]);

    mutate.mockClear();
    mutate.mockResolvedValue({ data: {} });
    fireEvent.click(upload());

    await waitFor(() =>
      expect(sentPaths()).toEqual([
        "transactions/b.bean",
        "transactions/c.bean",
      ]),
    );
  });
});

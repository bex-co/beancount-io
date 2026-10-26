/**
 * Leaving a pending upload for Journal reached Journal, then the old batch's
 * completion navigated to Files anyway (w4/305). Leaving unmounts the page,
 * as the route change does; the batch's writes still land.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const page = vi.hoisted(() => ({
  navigate: vi.fn(),
  mutate: vi.fn(),
  refresh: vi.fn(async () => ({ data: undefined })),
}));

vi.mock("@tanstack/react-router", () => ({
  useHydrated: () => true,
  useParams: () => ({
    ledgerOwner: "owner",
    ledgerName: "books",
    _splat: "transactions",
  }),
  useNavigate: () => page.navigate,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({
    query: page.refresh,
    cache: { evict: () => true, gc: () => [] },
  }),
  useMutation: () => [page.mutate],
  useQuery: () => ({ data: { getLedgerDirContent: [] } }),
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

/** A create held until the test releases it. */
function holdCreate() {
  let release!: () => void;
  page.mutate.mockImplementationOnce(
    () => new Promise((resolve) => (release = () => resolve({ data: {} }))),
  );
  return () => release();
}

async function startUpload(name: string) {
  render(<UploadFilesPage />);
  choose([file(name, "qa-20261022 upload\n")]);
  fireEvent.click(upload());
  await waitFor(() => expect(page.mutate).toHaveBeenCalled());
}

beforeEach(() => {
  vi.clearAllMocks();
  page.mutate.mockResolvedValue({ data: {} });
});
afterEach(cleanup);

describe("Upload Files after the reader leaves", () => {
  it("still leaves for Files after an ordinary upload", async () => {
    await startUpload("qa-foreground.txt");
    await waitFor(() => expect(page.navigate).toHaveBeenCalledTimes(1));
  });

  it("lets a held upload finish without taking the reader away", async () => {
    const release = holdCreate();
    await startUpload("qa-held.txt");
    cleanup();

    await act(async () => release());
    await waitFor(() => expect(page.refresh).toHaveBeenCalled());
    expect(page.navigate).not.toHaveBeenCalled();
    expect(page.mutate).toHaveBeenCalledTimes(1);
  });

  it("does not navigate when the folder refresh lands after leaving", async () => {
    let refreshed!: () => void;
    page.refresh.mockImplementationOnce(
      () =>
        new Promise(
          (resolve) => (refreshed = () => resolve({ data: undefined })),
        ),
    );
    await startUpload("qa-refresh.txt");
    await waitFor(() => expect(page.refresh).toHaveBeenCalled());
    cleanup();

    await act(async () => refreshed());
    expect(page.navigate).not.toHaveBeenCalled();
  });

  it("keeps an older batch from redirecting a later selection", async () => {
    const releaseOld = holdCreate();
    await startUpload("qa-old.txt");
    cleanup();

    render(<UploadFilesPage />);
    choose([file("qa-later.txt", "qa-20261022 later\n")]);
    await act(async () => releaseOld());
    expect(page.navigate).not.toHaveBeenCalled();
    expect(upload()).toBeEnabled();

    fireEvent.click(upload());
    await waitFor(() => expect(page.navigate).toHaveBeenCalledTimes(1));
  });
});

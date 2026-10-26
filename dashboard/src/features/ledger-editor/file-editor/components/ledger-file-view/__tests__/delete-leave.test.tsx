import { act, render, waitFor } from "@testing-library/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { describe, expect, it, vi } from "vitest";
import LedgerFileView from "../index";

vi.mock("@/common/hooks/use-write-outcome", () => ({
  useWriteOutcome: () => ({ snapshot: () => null, report: async () => false }),
}));

const harness = vi.hoisted(() => ({
  contentViewProps: vi.fn(),
  fileNavigate: vi.fn(),
  cleanCache: vi.fn(),
  mutateCalls: [] as Array<{
    onCompleted?: () => void;
    onError?: (e: Error) => void;
  }>,
  resolveMutation: null as null | (() => void),
  /** Directory reads: answers by path; a missing entry means it exists. */
  dirReads: [] as string[],
  dirAnswers: {} as Record<string, "missing" | "offline" | "hold">,
  releaseDir: null as null | (() => void),
}));

const notFound = (path: string) =>
  new CombinedGraphQLErrors({
    errors: [
      {
        message: `Directory '${path}' not found`,
        extensions: { code: "NOT_FOUND" },
      },
    ],
  });

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({
    query: ({ variables }: { variables: { dirPath: string } }) => {
      const path = variables.dirPath;
      harness.dirReads.push(path);
      const answer = harness.dirAnswers[path];
      if (answer === "missing")
        return Promise.resolve({ error: notFound(path) });
      if (answer === "offline")
        return Promise.reject(new TypeError("Failed to fetch"));
      if (answer === "hold") {
        return new Promise((resolve) => {
          harness.releaseDir = () =>
            resolve({ data: { getLedgerDirContent: [] } });
        });
      }
      return Promise.resolve({ data: { getLedgerDirContent: [] } });
    },
  }),
  useQuery: () => ({
    data: {
      getLedgerFile: { path: "notes.txt", sha: "sha", content: "" },
      getLedgerErrors: [],
    },
  }),
  useMutation: () => [
    vi.fn((opts: { onCompleted?: () => void }) => {
      harness.mutateCalls.push(opts);
      return new Promise<void>((resolve) => {
        harness.resolveMutation = () => {
          opts.onCompleted?.();
          resolve();
        };
      });
    }),
  ],
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
}));
vi.mock("@/common/hooks/use-file-navigate", () => ({
  useFileNavigate: () => harness.fileNavigate,
}));
vi.mock("@/common/hooks/use-apollo-cache", () => ({
  useApolloCacheClear: () => harness.cleanCache,
}));
vi.mock("@/common/components/ledger-permission/write", () => ({
  LedgerWritePermission: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
vi.mock("../file-content-view", () => ({
  FileContentView: (props: { onDelete?: () => Promise<void> }) => {
    harness.contentViewProps(props);
    return null;
  },
}));

describe("file deletion completing after departure (w4/1091)", () => {
  it("does not navigate when the view left before success", async () => {
    harness.mutateCalls.length = 0;
    harness.fileNavigate.mockClear();
    harness.cleanCache.mockClear();
    const { unmount } = render(
      <LedgerFileView ledgerId="alice/books" filePath="notes.txt" />,
    );
    const { onDelete } = harness.contentViewProps.mock.calls.at(-1)![0];
    const pending = onDelete!();
    unmount();
    await act(async () => {
      harness.resolveMutation!();
      await pending;
    });
    // The deletion still counts: cache cleared, but no navigation.
    expect(harness.cleanCache).toHaveBeenCalled();
    expect(harness.fileNavigate).not.toHaveBeenCalled();
  });

  it("still navigates once for a foreground success", async () => {
    harness.mutateCalls.length = 0;
    harness.fileNavigate.mockClear();
    render(<LedgerFileView ledgerId="alice/books" filePath="notes.txt" />);
    const { onDelete } = harness.contentViewProps.mock.calls.at(-1)![0];
    const pending = onDelete!();
    await act(async () => {
      harness.resolveMutation!();
      await pending;
    });
    expect(harness.fileNavigate).toHaveBeenCalledTimes(1);
    expect(harness.fileNavigate).toHaveBeenCalledWith("alice/books", "dir", "");
  });
});

/**
 * Git removes a folder with its last file, and a named folder that is gone
 * answers NOT_FOUND, so success navigation goes to the nearest folder that
 * survived instead of a failed-directory page (w4/1104).
 */
describe("file deletion lands in a surviving folder (w4/1104)", () => {
  async function deleteFile(filePath: string) {
    harness.fileNavigate.mockClear();
    harness.dirReads.length = 0;
    const view = render(
      <LedgerFileView ledgerId="alice/books" filePath={filePath} />,
    );
    const { onDelete } = harness.contentViewProps.mock.calls.at(-1)![0];
    const pending = onDelete!();
    await act(async () => {
      harness.resolveMutation!();
      await pending;
    });
    return view;
  }

  it("stays in the parent when other files remain", async () => {
    harness.dirAnswers = {};
    await deleteFile("receipts/2026/first.txt");
    await waitFor(() =>
      expect(harness.fileNavigate).toHaveBeenCalledWith(
        "alice/books",
        "dir",
        "receipts/2026",
      ),
    );
    expect(harness.dirReads).toEqual(["receipts/2026"]);
  });

  it("steps up past folders the last file took with it", async () => {
    harness.dirAnswers = { "receipts/2026": "missing", receipts: "missing" };
    await deleteFile("receipts/2026/last.txt");
    await waitFor(() =>
      expect(harness.fileNavigate).toHaveBeenCalledWith(
        "alice/books",
        "dir",
        "",
      ),
    );
    expect(harness.dirReads).toEqual(["receipts/2026", "receipts"]);
    expect(harness.fileNavigate).toHaveBeenCalledTimes(1);
  });

  it("keeps a parent whose read fails for another reason", async () => {
    harness.dirAnswers = { "receipts/2026": "offline" };
    await deleteFile("receipts/2026/last.txt");
    await waitFor(() =>
      expect(harness.fileNavigate).toHaveBeenCalledWith(
        "alice/books",
        "dir",
        "receipts/2026",
      ),
    );
  });

  it("does not navigate when the reader left while the folder was checked", async () => {
    harness.dirAnswers = { "receipts/2026": "hold" };
    const view = await deleteFile("receipts/2026/last.txt");
    await waitFor(() => expect(harness.releaseDir).not.toBeNull());
    view.unmount();
    await act(async () => harness.releaseDir!());
    expect(harness.fileNavigate).not.toHaveBeenCalled();
    harness.releaseDir = null;
  });
});

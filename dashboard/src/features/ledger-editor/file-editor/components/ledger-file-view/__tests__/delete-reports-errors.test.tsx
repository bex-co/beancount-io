import { act, render, waitFor } from "@testing-library/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { describe, expect, it, vi } from "vitest";
import LedgerFileView from "../index";

const outcome = vi.hoisted(() => ({
  snapshot: [{ message: "existing" }],
  report: vi.fn(),
  finish: null as null | ((left: boolean) => void),
}));
vi.mock("@/common/hooks/use-write-outcome", () => ({
  useWriteOutcome: () => ({
    snapshot: () => outcome.snapshot,
    report: outcome.report,
  }),
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
  useLedgerWriteRefresh: () => harness.cleanCache,
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

/**
 * Deleting a file a `document` entry names leaves `E8001 Document file not
 * found` in the ledger, and the dashboard said only "File deleted
 * successfully" (w2/121). The delete now reports new ledger errors as a file
 * save does, before the view leaves for the folder: its queries end when it
 * unmounts, so a re-read started later would be aborted.
 */
describe("file deletion reports the errors it leaves", () => {
  it("re-reads the ledger's errors against the pre-delete snapshot before leaving", async () => {
    outcome.report.mockReset().mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          outcome.finish = resolve;
        }),
    );
    harness.fileNavigate.mockClear();
    render(<LedgerFileView ledgerId="alice/books" filePath="qa/receipt.txt" />);
    const { onDelete } = harness.contentViewProps.mock.calls.at(-1)![0];
    const pending = onDelete!();
    await act(async () => {
      harness.resolveMutation!();
    });

    await waitFor(() => expect(outcome.report).toHaveBeenCalledTimes(1));
    expect(outcome.report).toHaveBeenCalledWith(outcome.snapshot);
    // Still here while the errors are read again.
    expect(harness.fileNavigate).not.toHaveBeenCalled();

    await act(async () => {
      outcome.finish!(true);
      await pending;
    });
    expect(harness.fileNavigate).toHaveBeenCalledWith(
      "alice/books",
      "dir",
      "qa",
    );
  });

  it("still reports when the reader already left", async () => {
    outcome.report.mockReset().mockResolvedValue(false);
    const { unmount } = render(
      <LedgerFileView ledgerId="alice/books" filePath="qa/receipt.txt" />,
    );
    const { onDelete } = harness.contentViewProps.mock.calls.at(-1)![0];
    const pending = onDelete!();
    unmount();
    await act(async () => {
      harness.resolveMutation!();
      await pending;
    });
    expect(outcome.report).toHaveBeenCalledWith(outcome.snapshot);
  });
});

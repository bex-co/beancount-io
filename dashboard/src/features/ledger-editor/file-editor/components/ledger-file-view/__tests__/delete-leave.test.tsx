import { act, render } from "@testing-library/react";
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
}));

vi.mock("@apollo/client/react", () => ({
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

import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import LedgerFileView from "../index";

/**
 * A file save says it saved as soon as the write lands. The new-error check
 * revalidates the whole ledger, so it runs behind the success message instead
 * of holding it back (w1/m41).
 */
const state = vi.hoisted(() => ({
  mutate: vi.fn(),
  report: vi.fn(),
  refresh: vi.fn(),
  onSave: undefined as
    | undefined
    | ((content: string, base: unknown) => Promise<void>),
  file: undefined as unknown,
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
vi.mock("@/common/analytics", () => ({ track: vi.fn() }));
vi.mock("@/common/hooks/use-write-outcome", () => ({
  useWriteOutcome: () => ({ snapshot: () => [], report: state.report }),
}));
vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ query: async () => ({ data: {} }) }),
  useQuery: () => ({
    data: {
      getLedgerFile: {
        path: "main.bean",
        sha: "seed-sha",
        size: 12,
        content: btoa("; qa-20261102\n"),
      },
      getLedgerErrors: [],
    },
  }),
  useMutation: () => [state.mutate],
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
}));
vi.mock("@/common/hooks/use-file-navigate", () => ({
  useFileNavigate: () => vi.fn(),
}));
vi.mock("@/common/hooks/use-apollo-cache", () => ({
  useApolloCacheClear: () => vi.fn(),
  useLedgerWriteRefresh: () => state.refresh,
}));
vi.mock("../file-content-view", () => ({
  FileContentView: (props: {
    fileContent: unknown;
    onSave: (content: string, base: unknown) => Promise<void>;
  }) => {
    state.onSave = props.onSave;
    state.file = props.fileContent;
    return null;
  },
}));

type Revision = { sha: string; lastCommitSha: string | null };
type MutateOptions = {
  variables: { content: string };
  onCompleted?: (data: { updateLedgerFile: Revision }) => unknown;
  onError?: (error: Error) => void;
};

const NEW_REVISION: Revision = { sha: "new-sha", lastCommitSha: "new-commit" };

/** A mutation that lands: Apollo calls onCompleted, then resolves. */
const landedWrite =
  (revision: Revision = NEW_REVISION) =>
  async (options: MutateOptions) => {
    options.onCompleted?.({ updateLedgerFile: revision });
    return { data: { updateLedgerFile: revision } };
  };

async function save() {
  render(<LedgerFileView ledgerId="qa/books" filePath="main.bean" />);
  await act(async () => state.onSave!("; qa-20261102 edited\n", state.file));
}

beforeEach(() => {
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
  state.mutate.mockReset();
  state.report.mockReset();
  state.refresh.mockReset();
});

describe("saving a file", () => {
  it("confirms the save and finishes before the new-error check answers", async () => {
    // The check never settles: a save that waited on it would never finish.
    state.report.mockReturnValue(new Promise<boolean>(() => {}));
    state.mutate.mockImplementation(landedWrite());

    await save();

    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(state.report).toHaveBeenCalledTimes(1);
    expect(state.refresh).toHaveBeenCalledTimes(1);
  });

  it("still confirms the save when the check then warns about a new error", async () => {
    // The hook shows the warning itself and returns true.
    state.report.mockResolvedValue(true);
    state.mutate.mockImplementation(landedWrite());

    await save();

    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(state.report).toHaveBeenCalledWith([]);
  });

  it("neither confirms nor checks a write that failed", async () => {
    state.mutate.mockImplementation(async (options: MutateOptions) => {
      options.onError?.(new Error("sha mismatch"));
      return { data: undefined };
    });

    await save();

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.success).not.toHaveBeenCalled();
    expect(state.report).not.toHaveBeenCalled();
    expect(state.refresh).not.toHaveBeenCalled();
  });

  it("keeps the saved file instead of downloading it again", async () => {
    state.report.mockResolvedValue(false);
    state.mutate.mockImplementation(landedWrite());

    await save();

    const sent = state.mutate.mock.calls[0][0].variables.content;
    const write = state.refresh.mock.calls[0][0];
    const cache = { writeQuery: vi.fn() };
    write(cache);
    expect(cache.writeQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { ledgerId: "qa/books", path: "main.bean" },
        data: {
          getLedgerFile: { ...NEW_REVISION, content: sent },
        },
      }),
    );
  });

  it("downloads the file when the write did not say which commit it made", async () => {
    // Writing the old commit back would label the saved file with it.
    state.report.mockResolvedValue(false);
    state.mutate.mockImplementation(
      landedWrite({ sha: "new-sha", lastCommitSha: null }),
    );

    await save();

    expect(state.refresh).toHaveBeenCalledWith(undefined);
  });
});

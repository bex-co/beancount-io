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
  cleanCache: vi.fn(),
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
  useApolloCacheClear: () => state.cleanCache,
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

type MutateOptions = {
  onCompleted?: () => unknown;
  onError?: (error: Error) => void;
};

/** A mutation that lands: Apollo calls onCompleted, then resolves. */
const landedWrite = async (options: MutateOptions) => {
  options.onCompleted?.();
  return { data: {} };
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
  state.cleanCache.mockReset();
});

describe("saving a file", () => {
  it("confirms the save and finishes before the new-error check answers", async () => {
    // The check never settles: a save that waited on it would never finish.
    state.report.mockReturnValue(new Promise<boolean>(() => {}));
    state.mutate.mockImplementation(landedWrite);

    await save();

    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(state.report).toHaveBeenCalledTimes(1);
    expect(state.cleanCache).toHaveBeenCalledTimes(1);
  });

  it("still confirms the save when the check then warns about a new error", async () => {
    // The hook shows the warning itself and returns true.
    state.report.mockResolvedValue(true);
    state.mutate.mockImplementation(landedWrite);

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
    expect(state.cleanCache).not.toHaveBeenCalled();
  });
});

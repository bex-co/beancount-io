import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LedgerFileView from "../index";
import { deleteRefusalIncluders } from "../delete-refusal";

vi.mock("@/common/hooks/use-write-outcome", () => ({
  useWriteOutcome: () => ({ snapshot: () => null, report: async () => false }),
}));

const harness = vi.hoisted(() => ({
  contentViewProps: vi.fn(),
  toastError: vi.fn(),
  calls: [] as Array<{
    variables: Record<string, unknown>;
    onError?: (e: Error) => void;
  }>,
  refuse: true,
}));

vi.mock("sonner", () => ({
  toast: { error: harness.toastError, success: vi.fn() },
}));
vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({
    query: () => Promise.resolve({ data: { getLedgerDirContent: [] } }),
  }),
  useQuery: () => ({
    data: {
      getLedgerFile: { path: "books/jan.bean", sha: "sha", content: "" },
      getLedgerErrors: [],
    },
  }),
  useMutation: () => [
    vi.fn(
      async (opts: {
        variables: Record<string, unknown>;
        onError?: (e: Error) => void;
        onCompleted?: () => void;
      }) => {
        harness.calls.push(opts);
        if (harness.refuse && !opts.variables.removeIncludes) {
          opts.onError?.(
            new Error(
              "books/jan.bean is still included by main.bean, books/all.bean; remove the include from the including file(s) first, then delete",
            ),
          );
        } else {
          opts.onCompleted?.();
        }
      },
    ),
  ],
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
}));
vi.mock("../file-content-view", () => ({
  FileContentView: (props: { onDelete?: () => Promise<void> }) => {
    harness.contentViewProps(props);
    return null;
  },
}));

describe("deleteRefusalIncluders", () => {
  const message =
    "a.bean is still included by main.bean, b.bean; remove the include first";

  it("reads the includers of that file", () => {
    expect(deleteRefusalIncluders(message, "a.bean")).toEqual([
      "main.bean",
      "b.bean",
    ]);
    expect(deleteRefusalIncluders(message, "/a.bean")).toEqual([
      "main.bean",
      "b.bean",
    ]);
  });

  it("is null for another file or another refusal", () => {
    expect(deleteRefusalIncluders(message, "x/a.bean")).toBe(null);
    expect(deleteRefusalIncluders("Network error", "a.bean")).toBe(null);
  });
});

describe("deleting a file another file includes (w21/587)", () => {
  it("asks before removing the include, then resends with removeIncludes", async () => {
    harness.calls.length = 0;
    harness.toastError.mockClear();
    render(<LedgerFileView ledgerId="alice/books" filePath="books/jan.bean" />);
    const { onDelete } = harness.contentViewProps.mock.calls.at(-1)![0];

    await act(async () => {
      await onDelete!();
    });

    // The refusal is a question, not an error toast; nothing was removed yet.
    expect(harness.toastError).not.toHaveBeenCalled();
    expect(harness.calls).toHaveLength(1);
    expect(harness.calls[0].variables.removeIncludes).toBeUndefined();
    expect(
      await screen.findByText(/main\.bean, books\/all\.bean/),
    ).toBeTruthy();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /remove include and delete/i }),
      );
    });

    expect(harness.calls).toHaveLength(2);
    expect(harness.calls[1].variables.removeIncludes).toBe(true);
    expect(harness.calls[1].variables.path).toBe("books/jan.bean");
  });

  it("sends nothing more when the question is cancelled", async () => {
    harness.calls.length = 0;
    render(<LedgerFileView ledgerId="alice/books" filePath="books/jan.bean" />);
    const { onDelete } = harness.contentViewProps.mock.calls.at(-1)![0];
    await act(async () => {
      await onDelete!();
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    });
    expect(harness.calls).toHaveLength(1);
  });
});

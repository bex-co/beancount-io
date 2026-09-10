import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LedgerFileView from "../index";

const mocks = vi.hoisted(() => ({
  queryResult: {
    data: undefined as
      | { getLedgerFile: null | { content: string; sha: string } }
      | undefined,
    loading: false,
    error: undefined as Error | undefined,
  },
  fileNavigate: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: () => mocks.queryResult,
  useMutation: () => [vi.fn(), {}],
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => ({
    ledgerOwner: "open_ledger",
    ledgerName: "example",
    branch: "main",
    _splat: "qa-missing-file.bean",
  }),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params?.path ? `${key}:${params.path}` : key,
  }),
}));

vi.mock("@/common/hooks/use-file-navigate", () => ({
  useFileNavigate: () => mocks.fileNavigate,
}));

vi.mock("@/common/hooks/use-apollo-cache", () => ({
  useApolloCacheClear: () => vi.fn(),
}));

vi.mock("@/common/lib/errors/error-message", () => ({
  useErrorMessage: () => (error: unknown) => String(error),
}));

vi.mock("../file-content-view", () => ({
  FileContentView: () => <div data-testid="file-content" />,
}));

describe("LedgerFileView missing vs failed file", () => {
  beforeEach(() => {
    mocks.fileNavigate.mockReset();
    mocks.queryResult.data = undefined;
    mocks.queryResult.loading = false;
    mocks.queryResult.error = undefined;
  });

  it("shows File not found with parent browse for a settled null file", () => {
    mocks.queryResult.data = { getLedgerFile: null };

    render(
      <LedgerFileView
        ledgerId="open_ledger/example"
        filePath="qa-missing-file.bean"
      />,
    );

    expect(
      screen.getByText("ledgerEditor.fileNotFound:qa-missing-file.bean"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("ledgerEditor.failedToLoadFileContent"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("common.tryAgain")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "ledgerEditor.browseParentDirectory",
      }),
    );
    expect(mocks.fileNavigate).toHaveBeenCalledWith(
      "open_ledger/example",
      "dir",
      "",
    );
  });

  it("keeps retry for genuine query failures", () => {
    mocks.queryResult.error = new Error("network");

    render(
      <LedgerFileView
        ledgerId="open_ledger/example"
        filePath="main.bean"
      />,
    );

    expect(
      screen.getByText("ledgerEditor.failedToLoadFileContent"),
    ).toBeInTheDocument();
    expect(screen.getByText("common.tryAgain")).toBeInTheDocument();
    expect(
      screen.queryByText(/ledgerEditor.fileNotFound/),
    ).not.toBeInTheDocument();
  });

  it("renders file content when the query returns a file", () => {
    mocks.queryResult.data = {
      getLedgerFile: { content: "abc", sha: "sha" },
    };

    render(
      <LedgerFileView ledgerId="open_ledger/example" filePath="main.bean" />,
    );

    expect(screen.getByTestId("file-content")).toBeInTheDocument();
  });

  it("does not claim not-found while the query payload is unresolved", () => {
    mocks.queryResult.data = undefined;

    render(
      <LedgerFileView
        ledgerId="open_ledger/example"
        filePath="qa-missing-file.bean"
      />,
    );

    expect(
      screen.getByText("ledgerEditor.loadingFileContent"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/ledgerEditor.fileNotFound/),
    ).not.toBeInTheDocument();
  });
});

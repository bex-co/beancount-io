import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { base64Encode } from "@/common/lib/utils/encode";

const mockUseQuery = vi.fn();
const mockFileNavigate = vi.fn();

vi.mock("@apollo/client/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@/common/components/markdown-renderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => (
    <div data-testid="markdown-renderer">{content}</div>
  ),
}));

vi.mock("@/common/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card">{children}</div>
  ),
  CardContent: ({
    children,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div data-testid="card-content">{children}</div>,
}));

vi.mock("@/common/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{children}</button>,
}));

vi.mock("@/common/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

vi.mock("lucide-react", () => ({
  BookOpen: () => <span data-testid="book-open-icon" />,
  Pencil: () => <span data-testid="pencil-icon" />,
}));

vi.mock("@/common/components/ledger-permission/write", () => ({
  LedgerWritePermission: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="write-permission">{children}</div>
  ),
}));

vi.mock("@/common/hooks/use-file-navigate", () => ({
  useFileNavigate: () => mockFileNavigate,
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

import { GetLedgerFileDocument } from "@/graphql/definitions";
import { ReadmeCard } from "../readme-card";

describe("ReadmeCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders skeleton while loading", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
    });

    render(<ReadmeCard ledgerId="test-ledger" />);

    expect(screen.getByText("README.md")).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton")).toHaveLength(4);
  });

  it("returns null on error", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: new Error("Not found"),
    });

    const { container } = render(<ReadmeCard ledgerId="test-ledger" />);

    expect(container.innerHTML).toBe("");
  });

  it("returns null when file content is null", () => {
    mockUseQuery.mockReturnValue({
      data: { getLedgerFile: null },
      loading: false,
      error: undefined,
    });

    const { container } = render(<ReadmeCard ledgerId="test-ledger" />);

    expect(container.innerHTML).toBe("");
  });

  it("returns null when content is empty", () => {
    mockUseQuery.mockReturnValue({
      data: { getLedgerFile: { content: base64Encode("   ") } },
      loading: false,
      error: undefined,
    });

    const { container } = render(<ReadmeCard ledgerId="test-ledger" />);

    expect(container.innerHTML).toBe("");
  });

  it("renders README content when available", () => {
    const readmeContent = "# Hello World\n\nThis is a test README.";
    mockUseQuery.mockReturnValue({
      data: { getLedgerFile: { content: base64Encode(readmeContent) } },
      loading: false,
      error: undefined,
    });

    render(<ReadmeCard ledgerId="test-ledger" />);

    expect(screen.getByText("README.md")).toBeInTheDocument();
    expect(screen.getByTestId("markdown-renderer")).toHaveTextContent(
      /Hello World/,
    );
    expect(screen.getByTestId("markdown-renderer")).toHaveTextContent(
      /This is a test README/,
    );
    expect(screen.getByTestId("book-open-icon")).toBeInTheDocument();
  });

  it("handles UTF-8 content correctly", () => {
    const utf8Content =
      "# 你好世界\n\nThis has emoji 🎉 and Chinese characters";
    mockUseQuery.mockReturnValue({
      data: { getLedgerFile: { content: base64Encode(utf8Content) } },
      loading: false,
      error: undefined,
    });

    render(<ReadmeCard ledgerId="test-ledger" />);

    expect(screen.getByTestId("markdown-renderer")).toHaveTextContent(
      /你好世界/,
    );
    expect(screen.getByTestId("markdown-renderer")).toHaveTextContent(/🎉/);
  });

  it("returns null on invalid base64 content", () => {
    mockUseQuery.mockReturnValue({
      data: { getLedgerFile: { content: "!!!invalid-base64!!!" } },
      loading: false,
      error: undefined,
    });

    const { container } = render(<ReadmeCard ledgerId="test-ledger" />);

    expect(container.innerHTML).toBe("");
  });

  it("uses custom path prop", () => {
    const readmeContent = "# Subdirectory README";
    mockUseQuery.mockReturnValue({
      data: { getLedgerFile: { content: base64Encode(readmeContent) } },
      loading: false,
      error: undefined,
    });

    render(<ReadmeCard ledgerId="test-ledger" path="docs/README.md" />);

    expect(screen.getByText("README.md")).toBeInTheDocument();
    expect(screen.getByTestId("markdown-renderer")).toHaveTextContent(
      /Subdirectory README/,
    );
  });

  it("displays filename from path in loading state", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
    });

    render(<ReadmeCard ledgerId="test-ledger" path="subdir/readme.md" />);

    expect(screen.getByText("readme.md")).toBeInTheDocument();
  });

  it("renders edit icon when write permission is granted", () => {
    const readmeContent = "# Test";
    mockUseQuery.mockReturnValue({
      data: { getLedgerFile: { content: base64Encode(readmeContent) } },
      loading: false,
      error: undefined,
    });

    render(<ReadmeCard ledgerId="test-ledger" />);

    expect(screen.getByTestId("pencil-icon")).toBeInTheDocument();
  });

  it("navigates to editor on edit icon click", async () => {
    const user = userEvent.setup();
    const readmeContent = "# Test";
    mockUseQuery.mockReturnValue({
      data: { getLedgerFile: { content: base64Encode(readmeContent) } },
      loading: false,
      error: undefined,
    });

    render(<ReadmeCard ledgerId="test-ledger" path="docs/README.md" />);

    await user.click(screen.getByTitle("common.edit"));

    expect(mockFileNavigate).toHaveBeenCalledWith(
      "test-ledger",
      "file",
      "docs/README.md",
      { editMode: true },
    );
  });

  it("uses default path README.md in useQuery variables", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
    });

    render(<ReadmeCard ledgerId="ledger-456" />);

    expect(mockUseQuery).toHaveBeenCalledWith(
      GetLedgerFileDocument,
      expect.objectContaining({
        variables: { ledgerId: "ledger-456", path: "README.md" },
      }),
    );
  });
});

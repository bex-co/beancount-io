import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUseQuery = vi.fn();
const mockNavigate = vi.fn();
const mockFileNavigate = vi.fn();
const mockT = vi.fn((key: string) => key);

vi.mock("@apollo/client/react", () => ({
  useQuery: () => mockUseQuery(),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/common/hooks/use-file-navigate", () => ({
  useFileNavigate: () => mockFileNavigate,
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: mockT }),
}));

vi.mock("@/common/lib/utils/encode", () => ({
  decodeLedgerId: (_id: string) => ({
    ledgerOwner: "owner",
    ledgerName: "name",
  }),
}));

vi.mock("@/common/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button onClick={onClick} data-testid="button">
      {children}
    </button>
  ),
}));

vi.mock(
  "@/features/ledger-editor/shared/components/ledger-file-breadcrumb",
  () => ({
    default: () => <div data-testid="breadcrumb" />,
  }),
);

vi.mock("@/common/components/ledger-permission/write", () => ({
  LedgerWritePermission: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock(
  "@/features/ledger-editor/directory-browse/components/ledger-clone-url-menu",
  () => ({
    default: () => <div data-testid="clone-url-menu" />,
  }),
);

vi.mock("@/common/components/readme-card", () => ({
  ReadmeCard: ({ path }: { ledgerId: string; path?: string }) => (
    <div data-testid="readme-card" data-path={path}>
      ReadmeCard
    </div>
  ),
}));

vi.mock("lucide-react", () => ({
  FileText: () => <span data-testid="file-icon" />,
  Folder: () => <span data-testid="folder-icon" />,
  ArrowLeft: () => <span />,
  Calendar: () => <span />,
  HardDrive: () => <span />,
  Plus: () => <span />,
  Upload: () => <span />,
  GitBranch: () => <span />,
}));

import LedgerDirectoryView from "../ledger-directory-view";

describe("LedgerDirectoryView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders ReadmeCard when directory contains README.md", () => {
    mockUseQuery.mockReturnValue({
      data: {
        getLedgerDirContent: [
          {
            name: "main.beancount",
            path: "main.beancount",
            type: "file",
            size: 100,
            sha: "abc",
            lastCommitterDate: "2024-01-01",
          },
          {
            name: "README.md",
            path: "README.md",
            type: "file",
            size: 200,
            sha: "def",
            lastCommitterDate: "2024-01-01",
          },
        ],
      },
      loading: false,
      error: undefined,
    });

    render(<LedgerDirectoryView ledgerId="test-ledger" currentPath="" />);

    const readmeCard = screen.getByTestId("readme-card");
    expect(readmeCard).toBeInTheDocument();
    expect(readmeCard).toHaveAttribute("data-path", "README.md");
  });

  it("renders ReadmeCard with correct path in subdirectory", () => {
    mockUseQuery.mockReturnValue({
      data: {
        getLedgerDirContent: [
          {
            name: "readme.md",
            path: "docs/readme.md",
            type: "file",
            size: 150,
            sha: "ghi",
            lastCommitterDate: "2024-01-01",
          },
        ],
      },
      loading: false,
      error: undefined,
    });

    render(<LedgerDirectoryView ledgerId="test-ledger" currentPath="docs" />);

    const readmeCard = screen.getByTestId("readme-card");
    expect(readmeCard).toBeInTheDocument();
    expect(readmeCard).toHaveAttribute("data-path", "docs/readme.md");
  });

  it("does not render ReadmeCard when directory has no README.md", () => {
    mockUseQuery.mockReturnValue({
      data: {
        getLedgerDirContent: [
          {
            name: "main.beancount",
            path: "main.beancount",
            type: "file",
            size: 100,
            sha: "abc",
            lastCommitterDate: "2024-01-01",
          },
        ],
      },
      loading: false,
      error: undefined,
    });

    render(<LedgerDirectoryView ledgerId="test-ledger" currentPath="" />);

    expect(screen.queryByTestId("readme-card")).not.toBeInTheDocument();
  });

  it("does not render ReadmeCard for directories named README.md", () => {
    mockUseQuery.mockReturnValue({
      data: {
        getLedgerDirContent: [
          {
            name: "README.md",
            path: "README.md",
            type: "dir",
            size: 0,
            sha: "abc",
            lastCommitterDate: "2024-01-01",
          },
        ],
      },
      loading: false,
      error: undefined,
    });

    render(<LedgerDirectoryView ledgerId="test-ledger" currentPath="" />);

    expect(screen.queryByTestId("readme-card")).not.toBeInTheDocument();
  });

  it("matches README.md case-insensitively", () => {
    mockUseQuery.mockReturnValue({
      data: {
        getLedgerDirContent: [
          {
            name: "Readme.MD",
            path: "Readme.MD",
            type: "file",
            size: 200,
            sha: "def",
            lastCommitterDate: "2024-01-01",
          },
        ],
      },
      loading: false,
      error: undefined,
    });

    render(<LedgerDirectoryView ledgerId="test-ledger" currentPath="" />);

    expect(screen.getByTestId("readme-card")).toBeInTheDocument();
  });

  it("shows error state", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: new Error("Network error"),
    });

    render(<LedgerDirectoryView ledgerId="test-ledger" currentPath="" />);

    expect(screen.queryByTestId("readme-card")).not.toBeInTheDocument();
  });
});

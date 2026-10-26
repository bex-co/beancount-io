import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { GetLedgerFileQuery } from "@/graphql/definitions";
import { FileActionButtons } from "../../non-text-file-views";
import LedgerFileView from "../index";

// The post-write error check (w3/640) has its own suite.
vi.mock("@/common/hooks/use-write-outcome", () => ({
  useWriteOutcome: () => ({ snapshot: () => null, report: async () => false }),
}));

const { contentViewProps } = vi.hoisted(() => ({
  contentViewProps: vi.fn(),
}));

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ query: async () => ({ data: {} }) }),
  useQuery: () => ({
    data: {
      getLedgerFile: { path: "main.bean", sha: "sha", content: "" },
      getLedgerErrors: [],
    },
  }),
  useMutation: () => [vi.fn()],
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
vi.mock("@/common/components/ledger-permission/write", () => ({
  LedgerWritePermission: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
// The content view only forwards props; record what the page hands it.
vi.mock("../file-content-view", () => ({
  FileContentView: (props: { onDelete?: () => void }) => {
    contentViewProps(props);
    return null;
  },
}));

describe("deleting the ledger's root file (w3/626)", () => {
  it.each([
    ["main.bean", false],
    ["/main.bean", false],
    ["accounts/main.bean", true],
    ["transactions.bean", true],
  ])("offers a delete handler for %s: %s", (filePath, deletable) => {
    contentViewProps.mockClear();
    render(<LedgerFileView ledgerId="alice/books" filePath={filePath} />);

    const { onDelete } = contentViewProps.mock.calls.at(-1)![0];
    expect(typeof onDelete === "function").toBe(deletable);
  });

  const file = {
    name: "main.bean",
    path: "main.bean",
    sha: "sha",
    content: "",
  } as NonNullable<GetLedgerFileQuery["getLedgerFile"]>;

  it("shows a disabled Delete with its reason when there is no handler", async () => {
    const user = userEvent.setup();
    render(
      <FileActionButtons
        filename="main.bean"
        fileContent={file}
        onDownload={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "More actions" }));

    const item = screen.getByRole("menuitem", { name: /Delete/ });
    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(item).toHaveTextContent(
      "main.bean is the ledger's root file and can't be deleted",
    );
  });

  it("keeps the confirmable Delete for any other file", async () => {
    const user = userEvent.setup();
    render(
      <FileActionButtons
        filename="main.bean"
        fileContent={{ ...file, path: "accounts/main.bean" }}
        onDownload={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "More actions" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(
      screen.getByRole("dialog", { name: "Delete File" }),
    ).toBeInTheDocument();
  });
});

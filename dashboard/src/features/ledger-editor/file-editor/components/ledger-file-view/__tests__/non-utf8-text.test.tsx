import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { GetLedgerFileQuery } from "@/graphql/definitions";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { FileContentView } from "../file-content-view";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
vi.mock("../text-file-view", () => ({
  TextFileView: () => <textarea aria-label="file-source" />,
}));
vi.mock("../../../../shared/components/ledger-file-breadcrumb", () => ({
  default: ({ path }: { path: string }) => <span>{path}</span>,
}));
vi.mock("@/common/hooks/use-is-authenticated", () => ({
  useIsAuthenticated: () => true,
}));
vi.mock("@/common/hooks/use-auth-status", () => ({
  useAuthStatus: () => "signed-in",
}));
vi.mock("@/common/providers/ledger-provider", () => ({
  useLedger: () => ({
    ledgerData: { permissions: { pull: true, push: true } },
  }),
}));

/**
 * A text file whose bytes are not UTF-8 is not opened in the editor: saving
 * would replace those bytes with U+FFFD (w4/276).
 */
const head = [
  ...new TextEncoder().encode("payee,city\r\nqa-20261020 original,caf"),
];
const tail = [...new TextEncoder().encode("\r\n")];
const base64Of = (bytes: number[]) => btoa(String.fromCharCode(...bytes));

function file(
  bytes: number[],
): NonNullable<GetLedgerFileQuery["getLedgerFile"]> {
  return {
    __typename: "LedgerFileContent",
    name: "qa-20261020-cp1252-save.csv",
    path: "qa-20261020-cp1252-save.csv",
    sha: "seed",
    size: bytes.length,
    type: "file",
    encoding: "base64",
    content: base64Of(bytes),
    lastCommitSha: null,
    lastAuthorDate: null,
    lastCommitterDate: null,
  };
}

function view(bytes: number[]) {
  render(
    <LocalizationProvider localization={createLocalization()}>
      <FileContentView
        filePath="qa-20261020-cp1252-save.csv"
        fileContent={file(bytes)}
        onSave={vi.fn()}
        isSaving={false}
        isEditMode
        onEnterEditMode={vi.fn()}
        onExitEditMode={vi.fn()}
      />
    </LocalizationProvider>,
  );
}

describe("text files that are not UTF-8", () => {
  it("refuses editing, even with editMode in the URL, and keeps Download", async () => {
    view([...head, 0xe9, ...tail]);
    expect(screen.queryByLabelText("file-source")).toBeNull();
    expect(screen.getByText(/isn't UTF-8 text/)).toBeInTheDocument();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "More actions" }));
    expect(
      await screen.findByRole("menuitem", { name: /Download/ }),
    ).not.toHaveAttribute("aria-disabled", "true");
  });

  it("still edits the valid UTF-8 counterpart", () => {
    view([...head, 0xc3, 0xa9, ...tail]);
    expect(screen.getByLabelText("file-source")).toBeInTheDocument();
  });
});

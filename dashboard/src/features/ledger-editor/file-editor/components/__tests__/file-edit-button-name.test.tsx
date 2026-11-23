import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { GetLedgerFileQuery } from "@/graphql/definitions";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { FileActionButtons } from "../non-text-file-views";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
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

const file: NonNullable<GetLedgerFileQuery["getLedgerFile"]> = {
  __typename: "LedgerFileContent",
  name: "notes.txt",
  path: "notes.txt",
  sha: "synthetic-file-sha",
  size: 5,
  type: "file",
  encoding: "base64",
  content: "bm90ZQo=",
  lastCommitSha: null,
  lastAuthorDate: null,
  lastCommitterDate: null,
};

/**
 * The view-mode Edit button is named by its own label, not by text that a
 * narrow breakpoint hides (w4/240).
 */
describe.each(["en", "de"] as const)("file Edit button in %s", (language) => {
  it("carries the localized Edit name and still enters edit mode", async () => {
    const localization = createLocalization();
    await localization.changeLanguage(language);
    const onEdit = vi.fn();
    render(
      <LocalizationProvider localization={localization}>
        <FileActionButtons
          filename="notes.txt"
          fileContent={file}
          onDownload={vi.fn()}
          canEdit
          onEdit={onEdit}
        />
      </LocalizationProvider>,
    );

    const name = localization.i18n.t("common.edit");
    const button = screen.getByRole("button", { name });
    expect(button).toHaveAttribute("aria-label", name);
    fireEvent.click(button);
    expect(onEdit).toHaveBeenCalledOnce();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { GetLedgerFileQuery } from "@/graphql/definitions";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { ViewModeActions } from "../ledger-file-view/file-view-mode";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
const { download } = vi.hoisted(() => ({ download: vi.fn() }));
vi.mock("../../../shared/lib/utils", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  downloadFile: download,
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

const file = (
  size: number,
  content: string | null,
): NonNullable<GetLedgerFileQuery["getLedgerFile"]> => ({
  __typename: "LedgerFileContent",
  name: "qa-empty.txt",
  path: "qa-empty.txt",
  sha: "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391",
  size,
  type: "file",
  encoding: "base64",
  content,
  lastCommitSha: null,
  lastAuthorDate: null,
  lastCommitterDate: null,
});

async function openMenu(fileContent: ReturnType<typeof file>) {
  render(
    <LocalizationProvider localization={createLocalization()}>
      <ViewModeActions
        filename="qa-empty.txt"
        fileContent={fileContent}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    </LocalizationProvider>,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "More actions" }));
  return {
    user,
    item: await screen.findByRole("menuitem", { name: /Download/ }),
  };
}

/** An existing zero-byte file downloads as zero bytes (w4/260). */
describe("Download for an empty file", () => {
  it.each([
    ["no content (the API's answer)", null],
    ["an empty string", ""],
  ])("downloads a size-0 file with %s", async (_case, content) => {
    download.mockClear();
    const { user, item } = await openMenu(file(0, content));
    expect(item).not.toHaveAttribute("aria-disabled", "true");
    await user.click(item);
    expect(download).toHaveBeenCalledWith("qa-empty.txt", "");
  });

  it("stays unavailable for a non-empty file whose content is missing", async () => {
    download.mockClear();
    const { item } = await openMenu(file(12, null));
    expect(item).toHaveAttribute("aria-disabled", "true");
  });
});

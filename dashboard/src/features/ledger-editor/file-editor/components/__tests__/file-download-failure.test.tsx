import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toaster } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GetLedgerFileQuery } from "@/graphql/definitions";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { ViewModeActions } from "../ledger-file-view/file-view-mode";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
vi.mock("@/common/hooks/use-is-authenticated", () => ({
  useIsAuthenticated: () => true,
}));
vi.mock("@/common/providers/ledger-provider", () => ({
  useLedger: () => ({
    ledgerData: { permissions: { pull: true, push: true } },
  }),
}));

const TEXT = "2026-01-01 open Assets:Cash\n";
const file: NonNullable<GetLedgerFileQuery["getLedgerFile"]> = {
  __typename: "LedgerFileContent",
  name: "main.bean",
  path: "main.bean",
  sha: "0123456789abcdef0123456789abcdef01234567",
  size: TEXT.length,
  type: "file",
  encoding: "base64",
  content: btoa(TEXT),
  lastCommitSha: null,
  lastAuthorDate: null,
  lastCommitterDate: null,
};

/** jsdom's Blob has no `text()`. */
const readText = (blob: Blob) =>
  new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsText(blob);
  });

// jsdom has no object URLs; each test installs the browser's behavior.
const original = {
  create: URL.createObjectURL,
  revoke: URL.revokeObjectURL,
};
afterEach(() => {
  URL.createObjectURL = original.create;
  URL.revokeObjectURL = original.revoke;
  vi.restoreAllMocks();
});

/**
 * The real menu and download helper: a browser that cannot generate the
 * local file reports it, and the same Download works once it can (w4/987).
 */
describe("File Download when the browser cannot generate the file", () => {
  it("says so, downloads nothing, and downloads the same file on retry", async () => {
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push(this.download);
    });
    URL.revokeObjectURL = vi.fn();
    URL.createObjectURL = vi.fn(() => {
      throw new Error("qa-controlled-file-download-generation");
    });

    render(
      <LocalizationProvider localization={createLocalization()}>
        <ViewModeActions
          filename="main.bean"
          fileContent={file}
          onEdit={vi.fn()}
        />
        <Toaster />
      </LocalizationProvider>,
    );
    const user = userEvent.setup();
    const more = screen.getByRole("button", { name: "More actions" });
    more.focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("menuitem", { name: /Download/ });
    await user.keyboard("{Enter}");

    expect(
      await screen.findByText(
        "Could not prepare main.bean for download. Please try again.",
      ),
    ).toBeVisible();
    expect(downloads).toEqual([]);
    // The menu closes as after any choice, and the actions keep focus.
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(more).toHaveFocus();

    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return "blob:qa-987";
    });
    await user.keyboard("{Enter}");
    const download = await screen.findByRole("menuitem", { name: /Download/ });
    expect(download).not.toHaveAttribute("aria-disabled", "true");
    await user.keyboard("{Enter}");

    expect(downloads).toEqual(["main.bean"]);
    expect(await readText(blobs[0]!)).toBe(TEXT);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:qa-987");
  });
});

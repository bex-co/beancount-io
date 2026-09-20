import { MockedProvider } from "@apollo/client/testing/react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { GetLedgerArchiveDownloadUrlDocument } from "@/graphql/definitions";
import LedgerCloneUrlMenu from "../ledger-clone-url-menu";

/**
 * Archive discovery is a round trip, so by the time it answers the click that
 * started it may no longer count as a user gesture. `window.open` then returns
 * null without throwing — the lookup succeeded, but nothing opened and the
 * popover said nothing at all.
 *
 * Stubbing `window.open` to return a window would miss that entirely, so these
 * cases drive the null return. The browser-side activation delay was measured
 * separately in installed Chrome with popup blocking left on.
 */

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("@/common/components/authenticated", () => ({
  Authenticated: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/common/providers/ledger-provider", () => ({
  useLedger: () => ({
    ledgerData: {
      httpUrl: "https://example.com/git/alice/books.git",
      sshUrl: "git@example.com:alice/books.git",
    },
  }),
}));

const LEDGER_ID = "alice/books";
const ARCHIVE_URL = "https://example.com/archive/books.zip";

const archiveRequest = {
  query: GetLedgerArchiveDownloadUrlDocument,
  variables: { ledgerId: LEDGER_ID },
};

const archiveFound = {
  request: archiveRequest,
  result: {
    data: {
      getLedgerArchiveDownloadUrl: {
        __typename: "LedgerArchiveDownloadUrlType",
        downloadUrl: ARCHIVE_URL,
      },
    },
  },
};

let openSpy: ReturnType<typeof vi.spyOn>;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleErrorSpy = vi
    .spyOn(console, "error")
    .mockImplementation(() => undefined);
});

afterEach(() => {
  openSpy?.mockRestore();
  consoleErrorSpy.mockRestore();
});

async function clickDownload(mocks: object[]) {
  const user = userEvent.setup();
  render(
    <MockedProvider mocks={mocks}>
      <LedgerCloneUrlMenu ledgerId={LEDGER_ID} />
    </MockedProvider>,
  );
  await user.click(screen.getByRole("button", { name: /git clone/i }));
  const button = await screen.findByRole("button", { name: /download zip/i });
  await user.click(button);
  return { user, button };
}

describe("when the browser blocks the download popup", () => {
  /** A blocked popup is exactly this: a null return, with nothing thrown. */
  const blockPopups = () => {
    openSpy = vi.spyOn(window, "open").mockReturnValue(null);
  };

  it("explains what happened instead of failing silently", async () => {
    blockPopups();
    await clickDownload([archiveFound]);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Your browser blocked the download. Use the link below to start it.",
    );
  });

  it("offers the discovered archive as a link the reader can activate", async () => {
    blockPopups();
    await clickDownload([archiveFound]);

    const link = await screen.findByRole("link", { name: /download zip/i });
    expect(link).toHaveAttribute("href", ARCHIVE_URL);
    expect(link).toHaveAttribute("download");
  });

  it("leaves the action usable for another attempt", async () => {
    blockPopups();
    const { button } = await clickDownload([archiveFound]);

    await screen.findByRole("status");
    expect(button).not.toBeDisabled();
  });

  it("clears the fallback when the reader tries again", async () => {
    blockPopups();
    const { user, button } = await clickDownload([archiveFound]);
    await screen.findByRole("link", { name: /download zip/i });

    openSpy.mockReturnValue(window);
    await user.click(button);

    await waitFor(() => {
      expect(screen.queryByRole("status")).toBeNull();
    });
    expect(screen.queryByRole("link", { name: /download zip/i })).toBeNull();
  });
});

describe("when the popup is not blocked", () => {
  it("opens the archive and offers no fallback", async () => {
    openSpy = vi.spyOn(window, "open").mockReturnValue(window);
    await clickDownload([archiveFound]);

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith(ARCHIVE_URL, "_blank");
    });
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("link", { name: /download zip/i })).toBeNull();
  });
});

describe("when discovery itself fails", () => {
  it("shows the error and no download link", async () => {
    openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    await clickDownload([
      { request: archiveRequest, error: new Error("boom") },
    ]);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
    // There is no URL to fall back to, so none is offered.
    expect(screen.queryByRole("link", { name: /download zip/i })).toBeNull();
    expect(openSpy).not.toHaveBeenCalled();
  });
});

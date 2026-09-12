import { MockedProvider } from "@apollo/client/testing/react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { GetLedgerArchiveDownloadUrlDocument } from "@/graphql/definitions";
import LedgerCloneUrlMenu from "../ledger-clone-url-menu";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

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

const archiveRequest = {
  query: GetLedgerArchiveDownloadUrlDocument,
  variables: { ledgerId: LEDGER_ID },
};

const successResult = {
  data: {
    getLedgerArchiveDownloadUrl: {
      __typename: "LedgerArchiveDownloadUrlType",
      downloadUrl: "https://example.com/archive.zip",
    },
  },
};

const openDownloadMenu = async (
  user: ReturnType<typeof userEvent.setup>,
): Promise<HTMLElement> => {
  await user.click(screen.getByRole("button", { name: /git clone/i }));
  return screen.findByRole("button", { name: /download zip/i });
};

describe("LedgerCloneUrlMenu download ZIP failures", () => {
  let openSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    openSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("surfaces a translated error when archive discovery rejects", async () => {
    const user = userEvent.setup();
    render(
      <MockedProvider
        mocks={[{ request: archiveRequest, error: new Error("boom") }]}
      >
        <LedgerCloneUrlMenu ledgerId={LEDGER_ID} />
      </MockedProvider>,
    );

    const button = await openDownloadMenu(user);
    await user.click(button);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong. Please try again.");
    expect(openSpy).not.toHaveBeenCalled();
    // The failure must leave the action usable again.
    expect(button).not.toBeDisabled();
  });

  it("reports a successful response that carries no download URL", async () => {
    const user = userEvent.setup();
    render(
      <MockedProvider
        mocks={[
          {
            request: archiveRequest,
            result: {
              data: {
                getLedgerArchiveDownloadUrl: {
                  __typename: "LedgerArchiveDownloadUrlType",
                  downloadUrl: null,
                },
              },
            },
          },
        ]}
      >
        <LedgerCloneUrlMenu ledgerId={LEDGER_ID} />
      </MockedProvider>,
    );

    const button = await openDownloadMenu(user);
    await user.click(button);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not prepare the download. Please try again.",
    );
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("clears the error and opens the archive on retry", async () => {
    const user = userEvent.setup();
    render(
      <MockedProvider
        mocks={[
          { request: archiveRequest, error: new Error("boom") },
          { request: archiveRequest, result: successResult },
        ]}
      >
        <LedgerCloneUrlMenu ledgerId={LEDGER_ID} />
      </MockedProvider>,
    );

    const button = await openDownloadMenu(user);
    await user.click(button);
    await screen.findByRole("alert");

    await user.click(button);

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith(
        "https://example.com/archive.zip",
        "_blank",
      );
    });
    await waitFor(() => {
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });

  it("opens the archive without an error message on the happy path", async () => {
    const user = userEvent.setup();
    render(
      <MockedProvider
        mocks={[{ request: archiveRequest, result: successResult }]}
      >
        <LedgerCloneUrlMenu ledgerId={LEDGER_ID} />
      </MockedProvider>,
    );

    const button = await openDownloadMenu(user);
    await user.click(button);

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith(
        "https://example.com/archive.zip",
        "_blank",
      );
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as apolloClient from "@apollo/client/react";
import type { ListLedgersQuery } from "@/graphql/definitions";
import { LedgerSwitcher } from "../ledger-switcher";
import { SidebarProvider, useSidebar } from "@/common/components/ui/sidebar";

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    className,
    "aria-label": ariaLabel,
  }: {
    children: ReactNode;
    className?: string;
    "aria-label"?: string;
  }) => (
    <a href="#" className={className} aria-label={ariaLabel}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: "/ledger/open_ledger/ledger-1/journal" }),
  useNavigate: () => mockNavigate,
}));

vi.mock("@apollo/client/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("@/common/components/authenticated", () => ({
  Authenticated: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/common/providers/react-native-bridge-provider", () => ({
  useReactNativeContext: () => ({ isReactNative: false }),
}));

function makeLedgers(count: number): ListLedgersQuery["listLedgers"] {
  return Array.from({ length: count }, (_, index) => {
    const name = `ledger-${index + 1}`;
    return {
      __typename: "Ledger" as const,
      id: `open_ledger/${name}`,
      name,
      fullName: `open_ledger/${name}`,
      httpUrl: `https://example.com/open_ledger/${name}`,
      sshUrl: `git@example.com:open_ledger/${name}`,
      private: false,
      empty: false,
      size: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      description: null,
      permissions: {
        __typename: "Permission" as const,
        admin: true,
        pull: true,
        push: true,
      },
    };
  });
}

function MobileDrawerProbe() {
  const { openMobile, setOpenMobile, isMobile } = useSidebar();
  return (
    <div>
      <div data-testid="is-mobile">{isMobile ? "mobile" : "desktop"}</div>
      <div data-testid="open-mobile">{openMobile ? "open" : "closed"}</div>
      <button type="button" onClick={() => setOpenMobile(true)}>
        Open drawer
      </button>
    </div>
  );
}

describe("LedgerSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1440,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue({
      data: { listLedgers: makeLedgers(20) },
      loading: false,
    } as ReturnType<typeof apolloClient.useQuery>);
    vi.mocked(apolloClient.useMutation).mockReturnValue([
      vi.fn(),
      { loading: false },
    ] as unknown as ReturnType<typeof apolloClient.useMutation>);
  });

  it("scrolls ledger results while keeping global actions outside the list", async () => {
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <LedgerSwitcher
          currentLedgerId="open_ledger/ledger-1"
          currentLedgerName="ledger-1"
          currentLedgerFullName="open_ledger/ledger-1"
        />
      </SidebarProvider>,
    );

    await user.click(
      screen.getByRole("combobox", { name: "ledger-1 — switch ledger" }),
    );

    expect(
      screen.getByRole("combobox", { name: /search ledgers/i }),
    ).toBeInTheDocument();

    const ledgerList = await screen.findByRole("listbox");
    const createButton = screen.getByRole("button", { name: "Create Ledger" });
    const manageButton = screen.getByRole("button", {
      name: "Manage your Beancount ledgers",
    });

    expect(ledgerList).toHaveClass(
      "min-h-0",
      "flex-1",
      "max-h-[300px]",
      "overflow-y-auto",
    );
    expect(ledgerList).not.toContainElement(createButton);
    expect(ledgerList).not.toContainElement(manageButton);
    expect(createButton.parentElement).toHaveClass(
      "shrink-0",
      "border-t",
      "bg-popover",
    );
  });

  it("marks only the ledger in use as current, including after filtering", async () => {
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <LedgerSwitcher
          currentLedgerId="open_ledger/ledger-2"
          currentLedgerName="ledger-2"
          currentLedgerFullName="open_ledger/ledger-2"
        />
      </SidebarProvider>,
    );

    await user.click(
      screen.getByRole("combobox", { name: "ledger-2 — switch ledger" }),
    );
    await screen.findByRole("listbox");
    const currentRows = () =>
      screen
        .getAllByRole("option")
        .filter((option) => option.getAttribute("aria-current") === "true")
        .map((option) => option.getAttribute("data-value"));

    // cmdk highlights the first row (the owner) with aria-selected; that is
    // not the current ledger.
    expect(currentRows()).toEqual(["open_ledger/ledger-2 ledger-2"]);

    await user.type(
      screen.getByRole("combobox", { name: /search ledgers/i }),
      "ledger-2",
    );
    await waitFor(() => {
      expect(currentRows()).toEqual(["open_ledger/ledger-2 ledger-2"]);
    });
  });

  it("closes the narrow sidebar drawer after selecting another ledger", async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("max-width"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 390,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue({
      data: {
        listLedgers: makeLedgers(2).concat([
          {
            ...makeLedgers(1)[0],
            id: "open_ledger/minimax",
            name: "minimax",
            fullName: "open_ledger/minimax",
          },
        ]),
      },
      loading: false,
    } as ReturnType<typeof apolloClient.useQuery>);

    render(
      <SidebarProvider>
        <MobileDrawerProbe />
        <LedgerSwitcher
          currentLedgerId="open_ledger/ledger-1"
          currentLedgerName="ledger-1"
          currentLedgerFullName="open_ledger/ledger-1"
        />
      </SidebarProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-mobile")).toHaveTextContent("mobile");
    });

    await user.click(screen.getByRole("button", { name: "Open drawer" }));
    expect(screen.getByTestId("open-mobile")).toHaveTextContent("open");

    await user.click(
      screen.getByRole("combobox", { name: "ledger-1 — switch ledger" }),
    );
    const destination = await screen.findByRole("option", {
      name: (_, element) =>
        element.getAttribute("data-value") === "open_ledger/minimax minimax",
    });
    await user.click(destination);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
      expect(screen.getByTestId("open-mobile")).toHaveTextContent("closed");
    });
  });

  /** A failed ledger read is not "no ledgers found" (w4/275). */
  // An input method's Escape cancels its composition; it must not close the
  // switcher and drop the search (w4/318).
  it.each([
    { isComposing: true, keyCode: 27 },
    { isComposing: false, keyCode: 229 },
  ])(
    "keeps the search open for a composing Escape (%o), then closes on an ordinary one",
    async (composing) => {
      const user = userEvent.setup();
      render(
        <SidebarProvider>
          <LedgerSwitcher
            currentLedgerId="open_ledger/ledger-1"
            currentLedgerName="ledger-1"
            currentLedgerFullName="open_ledger/ledger-1"
          />
        </SidebarProvider>,
      );
      const opener = screen.getByRole("combobox", {
        name: "ledger-1 — switch ledger",
      });
      await user.click(opener);
      const search = screen.getByRole("combobox", { name: /search ledgers/i });
      await user.type(search, "ledger-1");

      fireEvent.keyDown(search, { key: "Escape", ...composing });
      expect(search).toBeInTheDocument();
      expect(search).toHaveValue("ledger-1");
      expect(opener).toHaveAttribute("aria-expanded", "true");

      fireEvent.keyDown(search, { key: "Escape", keyCode: 27 });
      await waitFor(() =>
        expect(opener).toHaveAttribute("aria-expanded", "false"),
      );
      expect(
        screen.queryByRole("combobox", { name: /search ledgers/i }),
      ).toBeNull();
    },
  );

  // Create Ledger closed on one Escape with a typed name and description
  // (w2/134); the switcher's copy asks as the /ledger sidebar's does.
  it("asks before Create Ledger discards what was typed", async () => {
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <LedgerSwitcher
          currentLedgerId="open_ledger/ledger-1"
          currentLedgerName="ledger-1"
          currentLedgerFullName="open_ledger/ledger-1"
        />
      </SidebarProvider>,
    );
    const createDialog = () =>
      screen.queryByRole("dialog", { name: "Create New Ledger" });
    const confirm = () =>
      screen.queryByRole("dialog", { name: "Discard what you typed?" });
    const switcher = screen.getByRole("combobox", {
      name: "ledger-1 — switch ledger",
    });
    const openCreate = async () => {
      await user.click(switcher);
      await user.click(
        await screen.findByRole("button", { name: "Create Ledger" }),
      );
      expect(await screen.findByLabelText("Ledger Name")).toHaveValue(
        "my-book",
      );
    };

    // Untouched, it closes at once.
    await openCreate();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(createDialog()).toBeNull());
    expect(confirm()).toBeNull();
    await waitFor(() => expect(switcher).toHaveFocus());

    await openCreate();
    await user.type(
      screen.getByLabelText("Description (Optional)"),
      "Household books",
    );
    await user.keyboard("{Escape}");
    expect(
      await screen.findByRole("dialog", { name: "Discard what you typed?" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Keep editing" }));
    await waitFor(() => expect(confirm()).toBeNull());
    expect(screen.getByLabelText("Description (Optional)")).toHaveValue(
      "Household books",
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(await screen.findByRole("button", { name: "Discard" }));
    await waitFor(() => expect(createDialog()).toBeNull());
    await waitFor(() => expect(switcher).toHaveFocus());
  });

  it("does not focus the former switcher when creation navigates to the new ledger", async () => {
    const user = userEvent.setup();
    const create = vi.fn().mockResolvedValue({
      data: { createLedger: { id: "open_ledger/my-book" } },
    });
    vi.mocked(apolloClient.useMutation).mockReturnValue([
      create,
      { loading: false },
    ] as unknown as ReturnType<typeof apolloClient.useMutation>);
    render(
      <SidebarProvider>
        <LedgerSwitcher
          currentLedgerId="open_ledger/ledger-1"
          currentLedgerName="ledger-1"
          currentLedgerFullName="open_ledger/ledger-1"
        />
      </SidebarProvider>,
    );
    const switcher = screen.getByRole("combobox", {
      name: "ledger-1 — switch ledger",
    });
    await user.click(switcher);
    await user.click(
      await screen.findByRole("button", { name: "Create Ledger" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Create New Ledger",
    });
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );

    const focus = vi.spyOn(switcher, "focus");
    await user.click(screen.getByTestId("ledger-form-submit"));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(create).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/ledger/open_ledger/my-book",
    });
    expect(focus).not.toHaveBeenCalled();
  });

  describe("failed ledger read", () => {
    const view = () => (
      <SidebarProvider>
        <LedgerSwitcher
          currentLedgerId="open_ledger/ledger-1"
          currentLedgerName="ledger-1"
          currentLedgerFullName="open_ledger/ledger-1"
        />
      </SidebarProvider>
    );

    it("says the read failed and retries once, keeping search focus and text", async () => {
      const refetch = vi.fn().mockResolvedValue({});
      vi.mocked(apolloClient.useQuery).mockReturnValue({
        data: undefined,
        loading: false,
        error: new Error("Failed to fetch"),
        refetch,
      } as unknown as ReturnType<typeof apolloClient.useQuery>);
      const user = userEvent.setup();
      render(view());
      await user.click(
        screen.getByRole("combobox", { name: "ledger-1 — switch ledger" }),
      );
      const search = screen.getByRole("combobox", { name: /search ledgers/i });
      await user.type(search, "qa");

      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(screen.queryByText(/no ledgers found/i)).toBeNull();
      const retry = screen.getByRole("button", { name: "Try Again" });
      retry.focus();
      await user.keyboard("{Enter}");
      expect(refetch).toHaveBeenCalledTimes(1);
      expect(search).toHaveFocus();
      expect(search).toHaveValue("qa");
    });

    it("keeps a successful empty result as no ledgers found", async () => {
      vi.mocked(apolloClient.useQuery).mockReturnValue({
        data: { listLedgers: [] },
        loading: false,
        error: undefined,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof apolloClient.useQuery>);
      const user = userEvent.setup();
      render(view());
      await user.click(
        screen.getByRole("combobox", { name: "ledger-1 — switch ledger" }),
      );
      expect(await screen.findByText(/no ledgers found/i)).toBeInTheDocument();
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("keeps cached ledgers listed when only a refresh fails", async () => {
      vi.mocked(apolloClient.useQuery).mockReturnValue({
        data: { listLedgers: makeLedgers(2) },
        loading: false,
        error: new Error("Failed to fetch"),
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof apolloClient.useQuery>);
      const user = userEvent.setup();
      render(view());
      await user.click(
        screen.getByRole("combobox", { name: "ledger-1 — switch ledger" }),
      );
      expect((await screen.findAllByRole("option")).length).toBeGreaterThan(0);
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });
});

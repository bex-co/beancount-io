import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import type { EditorProps } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import CreateFilePage from "../index";

/**
 * Choosing to stay on an unsaved Create File draft keeps the reader's place
 * (w4/1035). Stay, Escape and dismissal used to drop focus on the page body,
 * so the next Tab restarted at "Skip to main content". The real router guard,
 * dialog, form and translations run; only Apollo and Monaco are replaced.
 */
vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
const mutate = vi.hoisted(() => vi.fn());
vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({
    query: async () => ({ data: undefined }),
    cache: { evict: () => true, gc: () => [] },
  }),
  useMutation: () => [mutate],
  useQuery: () => ({ data: undefined }),
}));
vi.mock("@/common/providers/ledger-provider", () => ({
  useLedger: () => ({
    ledgerName: "Books",
    ledgerData: { permissions: { pull: true, push: true } },
  }),
}));
vi.mock("@/common/hooks/use-is-authenticated", () => ({
  useIsAuthenticated: () => true,
}));
vi.mock("@/common/components/monaco-editor", () => ({
  MonacoEditor: (props: EditorProps) => (
    <textarea
      aria-label="File contents"
      value={props.value ?? ""}
      onChange={(event) => props.onChange?.(event.target.value, {} as never)}
    />
  ),
}));
afterEach(() => {
  cleanup();
  mutate.mockReset();
});

/** A destination that takes focus on arrival, as routed pages do. */
function Destination({ name }: { name: string }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <h1 ref={heading} tabIndex={-1}>
      {name}
    </h1>
  );
}

async function setup() {
  const localization = createLocalization();
  await localization.changeLanguage("en");
  const t = localization.i18n.t;
  // The app shell's navigation sits outside the page and survives leaving it.
  const root = createRootRoute({
    component: () => (
      <>
        <nav>
          <Link to="/ledger/alice/books/journal">Shell journal</Link>
        </nav>
        <Outlet />
      </>
    ),
  });
  const router = createRouter({
    routeTree: root.addChildren([
      createRoute({
        getParentRoute: () => root,
        path: "/ledger/$ledgerOwner/$ledgerName/files/new/$branch/$",
        component: CreateFilePage,
      }),
      createRoute({
        getParentRoute: () => root,
        path: "/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$",
        component: () => <Destination name="Files destination" />,
      }),
      createRoute({
        getParentRoute: () => root,
        path: "/ledger/$ledgerOwner/$ledgerName/journal",
        component: () => <Destination name="Journal destination" />,
      }),
    ]),
    history: createMemoryHistory({
      initialEntries: [
        "/ledger/alice/books/files/tree/main",
        "/ledger/alice/books/files/new/main",
      ],
      initialIndex: 1,
    }),
  });
  await router.load();
  render(
    <LocalizationProvider localization={localization}>
      <RouterProvider router={router} />
    </LocalizationProvider>,
  );
  await screen.findByRole("heading", { name: t("ledgerEditor.createFile") });

  const user = userEvent.setup();
  const filename = screen.getByPlaceholderText(t("ledgerEditor.nameYourFile"));
  const contents = screen.getByRole("textbox", { name: "File contents" });
  const draft = '2026-10-23 * "café 日本語"\n  Assets:Btc  4.00995 BTC\n';
  await user.type(filename, "qa-unsaved.md");
  await user.click(contents);
  await user.paste(draft);
  const button = (name: string) =>
    screen.getByRole("button", { name: t(name) });
  const decision = async () =>
    screen.findByRole("dialog", { name: t("ledgerEditor.unsavedChanges") });
  /** Resolve the decision from the keyboard and let the dialog detach. */
  const choose = async (choice: string) => {
    const dialog = await decision();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    while (document.activeElement !== button(choice)) await user.tab();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  };
  const retainsDraft = () => {
    expect(filename).toHaveValue("qa-unsaved.md");
    expect(contents).toHaveValue(draft);
    expect(router.state.location.pathname).toBe(
      "/ledger/alice/books/files/new/main",
    );
    expect(mutate).not.toHaveBeenCalled();
  };
  return { router, user, filename, contents, button, choose, retainsDraft };
}

describe("Create File keeps the keyboard position when leaving is cancelled", () => {
  it("returns Stay to Cancel, and Tab continues to Save", async () => {
    const { user, button, choose, retainsDraft } = await setup();
    button("common.cancel").focus();
    await user.keyboard("{Enter}");
    await choose("ledgerEditor.stay");

    await waitFor(() => expect(button("common.cancel")).toHaveFocus());
    await user.tab();
    expect(button("common.save")).toHaveFocus();
    retainsDraft();
  });

  it("returns Escape to Cancel", async () => {
    const { user, button, retainsDraft } = await setup();
    button("common.cancel").focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(button("common.cancel")).toHaveFocus());
    retainsDraft();
  });

  it("returns Stay to the shell link that asked to leave", async () => {
    const { user, choose, retainsDraft } = await setup();
    const shellLink = screen.getByRole("link", { name: "Shell journal" });
    shellLink.focus();
    await user.keyboard("{Enter}");
    await choose("ledgerEditor.stay");

    await waitFor(() => expect(shellLink).toHaveFocus());
    retainsDraft();
  });

  it("resumes at the filename when nothing on the page asked to leave", async () => {
    const { router, filename, choose, retainsDraft } = await setup();
    // Focus on the page body, as after browser Back or a global shortcut.
    (document.activeElement as HTMLElement).blur();
    void router.navigate({ to: "/ledger/alice/books/journal" });
    await choose("ledgerEditor.stay");

    await waitFor(() => expect(filename).toHaveFocus());
    retainsDraft();
  });

  it("leaves focus to the destination of a confirmed departure", async () => {
    const { user, choose } = await setup();
    const shellLink = screen.getByRole("link", { name: "Shell journal" });
    shellLink.focus();
    await user.keyboard("{Enter}");
    await choose("ledgerEditor.leaveWithoutSaving");

    const journal = await screen.findByRole("heading", {
      name: "Journal destination",
    });
    // The opener survives the departure; the dialog's close must not pull
    // focus back to it once the destination has taken it.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(journal).toHaveFocus();
    expect(mutate).not.toHaveBeenCalled();
  });
});

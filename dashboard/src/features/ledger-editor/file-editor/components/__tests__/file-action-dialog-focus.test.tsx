import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { useLayoutEffect, useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTranslations } from "@/common/hooks/use-translations";
import type { GetLedgerFileQuery } from "@/graphql/definitions";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { FileActionButtons } from "../non-text-file-views";

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

const file: NonNullable<GetLedgerFileQuery["getLedgerFile"]> = {
  __typename: "LedgerFileContent",
  name: "README.md",
  path: "README.md",
  sha: "synthetic-file-sha",
  size: 12,
  type: "file",
  encoding: "base64",
  content: "IyBTbnRoZXRpYwo=",
  lastCommitSha: null,
  lastAuthorDate: null,
  lastCommitterDate: null,
};

async function drainRadixFocus() {
  // FocusScope restores focus in an unmount task, after the dialog disappears.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

afterEach(async () => {
  cleanup();
  await drainRadixFocus();
});

function FilesDestination() {
  const { t } = useTranslations();
  const heading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <h1 ref={heading} tabIndex={-1}>
      {t("ledgerEditor.files")}
    </h1>
  );
}

async function setup(
  language: "en" | "de" = "en",
  deleteNavigation:
    | "none"
    | "immediate"
    | "held"
    | "fail"
    | "heldFail" = "none",
) {
  const localization = createLocalization();
  await localization.changeLanguage(language);
  let finishDelete!: () => void;
  const pendingDelete = new Promise<void>((resolve) => {
    finishDelete = resolve;
  });
  let failDelete!: () => void;
  const pendingFailure = new Promise<void>((_, reject) => {
    failDelete = () => reject(new Error("Connection problem"));
  });
  const onDelete = vi.fn(async () => {
    if (deleteNavigation === "none") return;
    if (deleteNavigation === "fail") throw new Error("Connection problem");
    if (deleteNavigation === "heldFail") return pendingFailure;
    if (deleteNavigation === "held") await pendingDelete;
    await router.navigate({ to: "/files" });
  });
  const root = createRootRoute({ component: () => <Outlet /> });
  const fileRoute = createRoute({
    getParentRoute: () => root,
    path: "/file",
    component: () => (
      <FileActionButtons
        filename={file.name}
        fileContent={file}
        onDownload={vi.fn()}
        onDelete={onDelete}
      />
    ),
  });
  const filesRoute = createRoute({
    getParentRoute: () => root,
    path: "/files",
    component: FilesDestination,
  });
  const router = createRouter({
    routeTree: root.addChildren([fileRoute, filesRoute]),
    history: createMemoryHistory({ initialEntries: ["/file"] }),
  });
  await router.load();
  render(
    <LocalizationProvider localization={localization}>
      <RouterProvider router={router} />
    </LocalizationProvider>,
  );
  const t = localization.i18n.t.bind(localization.i18n);
  const user = userEvent.setup();
  const opener = screen.getByRole("button", { name: t("common.moreActions") });
  async function openMenu() {
    await user.tab();
    expect(opener).toHaveFocus();
    await user.keyboard("{Enter}");
    await screen.findByRole("menu");
  }
  async function openDelete() {
    await openMenu();
    await user.keyboard("{End}");
    expect(
      screen.getByRole("menuitem", { name: t("common.delete") }),
    ).toHaveFocus();
    await user.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog", {
      name: t("ledgerEditor.deleteFileTitle"),
    });
    expect(dialog).toHaveAccessibleDescription(
      t("ledgerEditor.deleteFileConfirmation", { filename: file.name }),
    );
    await waitFor(() =>
      expect(
        within(dialog).getByRole("button", { name: t("common.cancel") }),
      ).toHaveFocus(),
    );
    return dialog;
  }
  return {
    user,
    t,
    opener,
    onDelete,
    router,
    openMenu,
    openDelete,
    finishDelete,
    failDelete,
  };
}

describe("file actions menu-launched Delete dialog focus", () => {
  it.each(
    (["en", "de"] as const).flatMap((language) =>
      (["Escape", "Cancel", "Close"] as const).map(
        (dismissal) => [language, dismissal] as const,
      ),
    ),
  )(
    "returns to the persistent %s More actions trigger after %s",
    async (language, dismissal) => {
      const { user, t, opener, onDelete, openDelete } = await setup(language);
      const dialog = await openDelete();
      if (dismissal === "Escape") {
        await user.keyboard("{Escape}");
      } else if (dismissal === "Cancel") {
        await user.keyboard("{Enter}");
      } else {
        await user.tab({ shift: true });
        expect(
          within(dialog).getByRole("button", { name: t("common.closeDialog") }),
        ).toHaveFocus();
        await user.keyboard("{Enter}");
      }
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      await drainRadixFocus();
      expect(opener).toHaveFocus();
      expect(onDelete).not.toHaveBeenCalled();
      await user.keyboard("{Enter}");
      expect(await screen.findByRole("menu")).toBeInTheDocument();
    },
  );

  it("keeps ordinary menu Escape focus restoration without opening Delete", async () => {
    const { user, opener, onDelete, openMenu } = await setup();
    await openMenu();
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
    );
    await drainRadixFocus();
    expect(opener).toHaveFocus();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("leaves focus on the new route after confirmed deletion unmounts the opener", async () => {
    const { user, t, opener, onDelete, router, openDelete } = await setup(
      "en",
      "immediate",
    );
    const dialog = await openDelete();
    await user.tab();
    expect(
      within(dialog).getByRole("button", { name: t("common.delete") }),
    ).toHaveFocus();
    await user.keyboard("{Enter}");
    const heading = await screen.findByRole("heading", {
      level: 1,
      name: t("ledgerEditor.files"),
    });
    await drainRadixFocus();
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(router.state.location.pathname).toBe("/files");
    expect(opener).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(heading).toHaveFocus();
  });

  it("closes after confirming an asynchronous delete without restoring the dismissed action", async () => {
    const { user, opener, onDelete, router, openDelete, finishDelete, t } =
      await setup("de", "held");
    await openDelete();
    await user.tab();
    await user.keyboard("{Enter}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await drainRadixFocus();
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(router.state.location.pathname).toBe("/file");
    // Pending, the reader keeps a usable place, not the body (w4/306).
    expect(opener).toHaveFocus();

    await act(async () => finishDelete());
    const heading = await screen.findByRole("heading", {
      level: 1,
      name: t("ledgerEditor.files"),
    });
    await drainRadixFocus();
    expect(opener).not.toBeInTheDocument();
    expect(heading).toHaveFocus();
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  /**
   * A failed delete took the success-only focus path: the dialog closed,
   * focus fell to the body and the next Tab reached the skip link (w4/306).
   */
  describe("when the deletion fails", () => {
    async function confirm(dialog: HTMLElement, t: (key: string) => string) {
      const user = userEvent.setup();
      await user.tab();
      expect(
        within(dialog).getByRole("button", { name: t("common.delete") }),
      ).toHaveFocus();
      await user.keyboard("{Enter}");
    }

    it("returns to the file actions after an immediate rejection", async () => {
      const { user, t, opener, onDelete, router, openDelete } = await setup(
        "en",
        "fail",
      );
      await confirm(await openDelete(), t);
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      await drainRadixFocus();
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(router.state.location.pathname).toBe("/file");
      expect(opener).toHaveFocus();

      // A retry from there succeeds once and leaves for Files.
      onDelete.mockImplementationOnce(async () => {
        await router.navigate({ to: "/files" });
      });
      await user.keyboard("{Enter}");
      await screen.findByRole("menu");
      await user.keyboard("{End}");
      await user.keyboard("{Enter}");
      const dialog = await screen.findByRole("dialog", {
        name: t("ledgerEditor.deleteFileTitle"),
      });
      await waitFor(() =>
        expect(
          within(dialog).getByRole("button", { name: t("common.cancel") }),
        ).toHaveFocus(),
      );
      await confirm(dialog, t);
      expect(
        await screen.findByRole("heading", {
          level: 1,
          name: t("ledgerEditor.files"),
        }),
      ).toBeInTheDocument();
      expect(onDelete).toHaveBeenCalledTimes(2);
    });

    it("keeps the actions focused through a held request that then fails", async () => {
      const { t, opener, openDelete, failDelete, router } = await setup(
        "en",
        "heldFail",
      );
      await confirm(await openDelete(), t);
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      await drainRadixFocus();
      expect(opener).toHaveFocus();

      await act(async () => failDelete());
      await drainRadixFocus();
      expect(router.state.location.pathname).toBe("/file");
      expect(opener).toHaveFocus();
    });

    it("keeps a focus the reader chose while the request was pending", async () => {
      const { t, opener, openDelete, failDelete } = await setup(
        "en",
        "heldFail",
      );
      await confirm(await openDelete(), t);
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      await drainRadixFocus();
      const elsewhere = document.createElement("button");
      elsewhere.textContent = "elsewhere";
      document.body.appendChild(elsewhere);
      elsewhere.focus();

      await act(async () => failDelete());
      await drainRadixFocus();
      expect(elsewhere).toHaveFocus();
      expect(opener).not.toHaveFocus();
      elsewhere.remove();
    });
  });

  it("offers no second delete while one is pending (w4/1090)", async () => {
    const { user, t, opener, onDelete, openDelete, finishDelete } = await setup(
      "en",
      "held",
    );
    const dialog = await openDelete();
    await user.tab();
    await user.keyboard("{Enter}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(onDelete).toHaveBeenCalledTimes(1);

    // Reopening the menu during the held request shows Delete unavailable.
    await user.click(opener);
    await screen.findByRole("menu");
    expect(
      screen.getByRole("menuitem", { name: t("common.delete") }),
    ).toHaveAttribute("aria-disabled", "true");
    await user.keyboard("{Escape}");
    expect(onDelete).toHaveBeenCalledTimes(1);

    await act(async () => finishDelete());
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
    void dialog;
  });
});

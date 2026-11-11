import { act, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import en from "@/i18n/locales/en";
import { renderGallery, results } from "./gallery-test-harness";

/**
 * SearchLedgers answers one page of 50. The Gallery used to show the first
 * page as the whole result and announce "50 ledgers found" while the API
 * still had more, so a ledger past the 50th match was unreachable from a
 * broad query (w2/104). The real page, router and Apollo client run; each
 * test answers the searches by hand.
 */
vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

const names = (prefix: string, count: number, from = 1) =>
  Array.from({ length: count }, (_, index) => `${prefix}-${from + index}`);

const offline = () => new TypeError("Failed to fetch");

const status = (gallery: Awaited<ReturnType<typeof renderGallery>>) =>
  gallery
    .getAllByRole("status")
    .find((element) => element.classList.contains("sr-only"));

const showMore = (gallery: Awaited<ReturnType<typeof renderGallery>>) =>
  gallery.queryByRole("button", { name: en["page.gallery.showMoreLedgers"] });

describe("Gallery search continuation", () => {
  it("loads later pages until the API runs out, then reaches them by keyboard", async () => {
    const gallery = await renderGallery();
    try {
      const first = await gallery.search("open_ledger");
      await act(async () =>
        first.resolve(results(...names("open_ledger", 50))),
      );
      await waitFor(() =>
        expect(gallery.getAllByRole("option")).toHaveLength(50),
      );
      // A full page is not the whole result.
      expect(status(gallery)).toHaveTextContent(
        "Showing the first 50 ledgers — more available",
      );
      const listbox = gallery.getByRole("listbox");
      const button = showMore(gallery);
      expect(button).toBeInTheDocument();
      // Show More is never a listbox child.
      expect(listbox).not.toContainElement(button);

      await gallery.user.click(button!);
      await waitFor(() => expect(gallery.requests).toHaveLength(2));
      expect(gallery.requests[1]).toMatchObject({
        name: "SearchLedgers",
        variables: { q: "open_ledger", limit: 50, page: 2 },
      });
      // One continuation at a time.
      await gallery.user.click(showMore(gallery)!);
      expect(gallery.requests).toHaveLength(2);

      await act(async () =>
        gallery.requests[1].resolve(results(...names("open_ledger", 50, 51))),
      );
      await waitFor(() =>
        expect(gallery.getAllByRole("option")).toHaveLength(100),
      );
      expect(status(gallery)).toHaveTextContent(
        "Showing the first 100 ledgers — more available",
      );

      // The keyboard finishes the list; focus returns to the field.
      showMore(gallery)!.focus();
      await gallery.user.keyboard("{Enter}");
      await waitFor(() => expect(gallery.requests).toHaveLength(3));
      expect(gallery.requests[2].variables).toMatchObject({ page: 3 });
      await act(async () =>
        gallery.requests[2].resolve(results(...names("open_ledger", 7, 101))),
      );
      await waitFor(() =>
        expect(gallery.getAllByRole("option")).toHaveLength(107),
      );
      expect(status(gallery)).toHaveTextContent("107 ledgers found");
      expect(showMore(gallery)).not.toBeInTheDocument();
      expect(
        gallery.getByText(new RegExp(en["common.noMoreResults"])),
      ).toBeInTheDocument();
      expect(gallery.input).toHaveFocus();

      // A ledger from a later page is reachable with the result keys.
      await gallery.user.keyboard("{ArrowDown>107/}");
      const last = gallery.getByRole("option", { name: /open_ledger-107/ });
      expect(gallery.input).toHaveAttribute("aria-activedescendant", last.id);
      await gallery.user.keyboard("{Enter}");
      await gallery.findByRole("heading", { name: "Ledger destination" });
      expect(gallery.router.state.location.pathname).toBe(
        "/ledger/synthetic/open_ledger-107",
      );
    } finally {
      gallery.dispose();
    }
  });

  it("offers no continuation for a short page and keeps its exact count", async () => {
    const gallery = await renderGallery();
    try {
      const first = await gallery.search("stock");
      await act(async () => first.resolve(results("stock-example")));
      await gallery.findByRole("option", { name: /stock-example/ });
      expect(status(gallery)).toHaveTextContent("1 ledger found");
      expect(showMore(gallery)).not.toBeInTheDocument();
      expect(
        gallery.queryByText(new RegExp(en["common.noMoreResults"])),
      ).not.toBeInTheDocument();
    } finally {
      gallery.dispose();
    }
  });

  it("never adds a late page to a different search", async () => {
    const gallery = await renderGallery();
    try {
      const first = await gallery.search("open_ledger");
      await act(async () =>
        first.resolve(results(...names("open_ledger", 50))),
      );
      await gallery.user.click(
        await gallery.findByRole("button", {
          name: en["page.gallery.showMoreLedgers"],
        }),
      );
      await waitFor(() => expect(gallery.requests).toHaveLength(2));
      const late = gallery.requests[1];

      await gallery.user.clear(gallery.input);
      const second = await gallery.search("stock");
      await act(async () => second.resolve(results("stock-example")));
      await gallery.findByRole("option", { name: /stock-example/ });

      await act(async () =>
        late.resolve(results(...names("open_ledger", 50, 51))),
      );
      expect(gallery.getAllByRole("option")).toHaveLength(1);
      expect(status(gallery)).toHaveTextContent("1 ledger found");
      expect(showMore(gallery)).not.toBeInTheDocument();
    } finally {
      gallery.dispose();
    }
  });

  it("keeps loaded results when a later page fails, and retries that page", async () => {
    const gallery = await renderGallery();
    try {
      const first = await gallery.search("open_ledger");
      await act(async () =>
        first.resolve(results(...names("open_ledger", 50))),
      );
      await gallery.user.click(
        await gallery.findByRole("button", {
          name: en["page.gallery.showMoreLedgers"],
        }),
      );
      await waitFor(() => expect(gallery.requests).toHaveLength(2));
      await act(async () => gallery.requests[1].reject(offline()));

      const alert = await gallery.findByRole("alert");
      expect(alert).toHaveTextContent(en["page.gallery.failedToSearchLedgers"]);
      expect(alert).toHaveTextContent(en["common.errors.network"]);
      expect(gallery.getAllByRole("option")).toHaveLength(50);

      const popup = gallery.getByRole("listbox").parentElement!;
      await gallery.user.click(
        within(popup).getByRole("button", { name: en["common.tryAgain"] }),
      );
      await waitFor(() => expect(gallery.requests).toHaveLength(3));
      expect(gallery.requests[2].variables).toMatchObject({
        q: "open_ledger",
        page: 2,
      });
      await act(async () =>
        gallery.requests[2].resolve(results(...names("open_ledger", 3, 51))),
      );
      await waitFor(() =>
        expect(gallery.getAllByRole("option")).toHaveLength(53),
      );
      expect(gallery.queryByRole("alert")).not.toBeInTheDocument();
      expect(status(gallery)).toHaveTextContent("53 ledgers found");
    } finally {
      gallery.dispose();
    }
  });

  it("closes the list with Escape from Show More and returns to the field", async () => {
    const gallery = await renderGallery();
    try {
      const first = await gallery.search("open_ledger");
      await act(async () =>
        first.resolve(results(...names("open_ledger", 50))),
      );
      const button = await gallery.findByRole("button", {
        name: en["page.gallery.showMoreLedgers"],
      });
      button.focus();
      await gallery.user.keyboard("{Escape}");
      expect(gallery.queryByRole("listbox")).not.toBeInTheDocument();
      expect(gallery.input).toHaveFocus();
      expect(gallery.input).toHaveAttribute("aria-expanded", "false");
      expect(gallery.requests).toHaveLength(1);
    } finally {
      gallery.dispose();
    }
  });
});

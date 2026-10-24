import { act, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import en from "@/i18n/locales/en";
import { renderGallery, results } from "./gallery-test-harness";

/**
 * A failed Gallery search offers Try Again for the same search (w4/1038).
 * The error said to try again with no way to, and Enter in the field never
 * re-ran it, so the reader had to clear and retype the query. The real page,
 * router and Apollo client run; each test answers the searches by hand.
 */
vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

const offline = () => new TypeError("Failed to fetch");

async function failedSearch(query: string) {
  const gallery = await renderGallery();
  const failed = await gallery.search(query);
  await act(async () => failed.reject(offline()));
  const alert = await gallery.findByRole("alert");
  const tryAgain = () =>
    within(alert).getByRole("button", { name: en["common.tryAgain"] });
  return { gallery, alert, tryAgain };
}

describe("Gallery search retry", () => {
  it("re-runs the same search once at a time, then selects a result by keyboard", async () => {
    const { gallery, alert, tryAgain } = await failedSearch("stock-example");
    try {
      expect(alert).toHaveTextContent(en["page.gallery.failedToSearchLedgers"]);
      expect(alert).toHaveTextContent(en["common.errors.network"]);
      // Try Again stands in its own alert, never as a listbox child.
      expect(gallery.queryByRole("listbox")).not.toBeInTheDocument();
      expect(gallery.queryByRole("option")).not.toBeInTheDocument();
      await waitFor(() =>
        expect(gallery.router.state.location.search).toEqual({
          q: "stock-example",
        }),
      );

      await gallery.user.click(tryAgain());
      await waitFor(() => expect(gallery.requests).toHaveLength(2));
      expect(gallery.requests[1]).toMatchObject({
        name: "SearchLedgers",
        variables: { q: "stock-example", limit: 50 },
      });
      expect(tryAgain()).toHaveAttribute("aria-busy", "true");
      await gallery.user.click(tryAgain());
      expect(gallery.requests).toHaveLength(2);

      // Another failure keeps the query, the explanation and focus.
      await act(async () => gallery.requests[1].reject(offline()));
      await waitFor(() => expect(tryAgain()).toBeEnabled());
      expect(tryAgain()).toHaveFocus();
      expect(gallery.input).toHaveValue("stock-example");
      expect(gallery.router.state.location.search).toEqual({
        q: "stock-example",
      });

      await gallery.user.click(tryAgain());
      await waitFor(() => expect(gallery.requests).toHaveLength(3));
      await act(async () =>
        gallery.requests[2].resolve(results("stock-example")),
      );
      const option = await gallery.findByRole("option", {
        name: /stock-example/,
      });
      expect(gallery.queryByRole("alert")).not.toBeInTheDocument();
      expect(gallery.input).toHaveFocus();
      await gallery.user.keyboard("{ArrowDown}");
      expect(gallery.input).toHaveAttribute("aria-activedescendant", option.id);
      await gallery.user.keyboard("{Enter}");
      await gallery.findByRole("heading", { name: "Ledger destination" });
      expect(gallery.router.state.location.pathname).toBe(
        "/ledger/synthetic/stock-example",
      );
    } finally {
      gallery.dispose();
    }
  });

  it("keeps a cleared search closed when its retry fails afterwards", async () => {
    const { gallery, tryAgain } = await failedSearch("stock-example");
    try {
      await gallery.user.click(tryAgain());
      await waitFor(() => expect(gallery.requests).toHaveLength(2));
      gallery.input.focus();
      await gallery.clearWithKeyboard();

      await act(async () => gallery.requests[1].reject(offline()));
      gallery.expectCleared();
    } finally {
      gallery.dispose();
    }
  });

  it("keeps a dismissed search closed, with focus in the field, when its retry lands", async () => {
    const { gallery, tryAgain } = await failedSearch("stock-example");
    try {
      await gallery.user.click(tryAgain());
      await waitFor(() => expect(gallery.requests).toHaveLength(2));
      gallery.input.focus();
      await gallery.user.keyboard("{Escape}");
      expect(gallery.input).toHaveAttribute("aria-expanded", "false");

      await act(async () =>
        gallery.requests[1].resolve(results("stock-example")),
      );
      expect(gallery.input).toHaveAttribute("aria-expanded", "false");
      expect(gallery.queryByRole("alert")).not.toBeInTheDocument();
      expect(gallery.queryByRole("option")).not.toBeInTheDocument();
      expect(gallery.input).toHaveFocus();
    } finally {
      gallery.dispose();
    }
  });

  it("drops the old failure when the reader types a new search during the retry", async () => {
    const { gallery, tryAgain } = await failedSearch("stock-example");
    try {
      await gallery.user.click(tryAgain());
      await waitFor(() => expect(gallery.requests).toHaveLength(2));
      gallery.input.focus();
      await gallery.user.type(gallery.input, "s");
      expect(gallery.queryByRole("alert")).not.toBeInTheDocument();

      await act(async () => gallery.requests[1].reject(offline()));
      expect(gallery.queryByRole("alert")).not.toBeInTheDocument();
      expect(gallery.input).toHaveFocus();
      expect(gallery.input).toHaveValue("stock-examples");
    } finally {
      gallery.dispose();
    }
  });
});

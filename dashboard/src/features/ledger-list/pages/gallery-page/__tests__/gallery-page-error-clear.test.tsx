import { act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import en from "@/i18n/locales/en";
import { renderGallery, results } from "./gallery-test-harness";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

describe("Gallery Clear after a search failure", () => {
  it("closes the failed query on native Tab and Enter, keeps input focus, and permits a healthy new search", async () => {
    const gallery = await renderGallery();
    try {
      const failed = await gallery.search("microsoft");
      await act(async () => failed.reject(new TypeError("Failed to fetch")));
      const alert = await gallery.findByRole("alert");
      expect(alert).toHaveTextContent(en["page.gallery.failedToSearchLedgers"]);
      expect(alert).toHaveTextContent(en["common.errors.network"]);
      expect(gallery.input).toHaveAttribute("aria-expanded", "true");

      await gallery.clearWithKeyboard();
      // Clearing remains closed after the abandoned query's debounce settles.
      await act(async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 350));
      });
      gallery.expectCleared();
      expect(gallery.requests).toHaveLength(1);
      await gallery.user.tab();
      await gallery.user.tab({ shift: true });
      gallery.expectCleared();

      const healthy = await gallery.search("micro");
      await act(async () =>
        healthy.resolve(results("microsoft", "micro-example")),
      );
      const option = await gallery.findByRole("option", { name: /microsoft/ });
      expect(gallery.getAllByRole("option")).toHaveLength(2);
      expect(gallery.queryByRole("alert")).not.toBeInTheDocument();
      await gallery.user.keyboard("{ArrowDown}");
      expect(gallery.input).toHaveAttribute("aria-activedescendant", option.id);
      expect(option).toHaveAttribute("aria-selected", "true");
      await gallery.user.keyboard("{Enter}");
      await gallery.findByRole("heading", { name: "Ledger destination" });
      expect(gallery.router.state.location.pathname).toBe(
        "/ledger/synthetic/microsoft",
      );
      expect(gallery.requests).toHaveLength(2);
    } finally {
      gallery.dispose();
    }
  });

  it("preserves pointer Clear and keeps a subsequently cleared pending response closed and nonselectable", async () => {
    const gallery = await renderGallery();
    try {
      const failed = await gallery.search("microsoft");
      await act(async () => failed.reject(new TypeError("Failed to fetch")));
      await gallery.findByRole("alert");
      await gallery.user.click(
        gallery.getByRole("button", { name: en["common.clearInput"] }),
      );
      gallery.expectCleared();

      const pending = await gallery.search("micro");
      expect(gallery.input).toHaveAttribute("aria-expanded", "true");
      await gallery.clearWithKeyboard();
      await act(async () =>
        pending.resolve(results("microsoft", "micro-example")),
      );
      gallery.expectCleared();
      await gallery.user.keyboard("{ArrowDown}{Enter}");
      gallery.expectCleared();
      expect(gallery.router.state.location.pathname).toBe("/ledger-gallery");
      expect(gallery.requests).toHaveLength(2);
    } finally {
      gallery.dispose();
    }
  });
});

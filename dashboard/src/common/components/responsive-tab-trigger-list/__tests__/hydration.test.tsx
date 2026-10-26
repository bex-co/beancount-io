import { act, waitFor } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Tabs } from "@/common/components/ui/tabs";
import { ResponsiveTabTriggerList } from "../index";

/**
 * The report view selector switches views from client state: a tab or the
 * narrow View trigger activated before hydration attaches their handlers did
 * nothing and was not replayed (w4/1105). Both forms are disabled in server
 * markup, keep the selected view, and respond once hydrated. Real SSR
 * markup, real hydration.
 */
describe("report view selector before and after hydration", () => {
  it("is unavailable in server markup and selects on the first activation once hydrated", async () => {
    const setSelectedTab = vi.fn();
    const view = (
      <Tabs value="holdings" onValueChange={setSelectedTab}>
        <ResponsiveTabTriggerList
          selectedTab="holdings"
          setSelectedTab={setSelectedTab}
          tabOptions={[
            { label: "Holdings", value: "holdings" },
            { label: "Holdings by Currency", value: "by-currency" },
          ]}
        />
      </Tabs>
    );
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = renderToString(view);
    const trigger =
      container.querySelector<HTMLButtonElement>("#view-selector")!;
    const tabs = [
      ...container.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    ];
    const byCurrency = tabs.find(
      (tab) => tab.textContent === "Holdings by Currency",
    )!;

    expect(trigger).toBeDisabled();
    expect(tabs).toHaveLength(2);
    tabs.forEach((tab) => expect(tab).toBeDisabled());
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");

    const recoverable = vi.fn();
    await act(async () => {
      hydrateRoot(container, view, { onRecoverableError: recoverable });
    });
    await waitFor(() => expect(trigger).toBeEnabled());
    tabs.forEach((tab) => expect(tab).toBeEnabled());
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");

    // Radix tabs select on mousedown.
    await act(async () => {
      byCurrency.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, button: 0 }),
      );
    });
    expect(setSelectedTab).toHaveBeenCalledWith("by-currency");
    expect(recoverable).not.toHaveBeenCalled();
    container.remove();
  });
});

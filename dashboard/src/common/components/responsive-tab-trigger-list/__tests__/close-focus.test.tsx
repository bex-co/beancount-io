import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Tabs } from "@/common/components/ui/tabs";
import { ResponsiveTabTriggerList } from "../index";

/**
 * Widening past `lg` while the narrow View list is open: Radix closes the list
 * on the resize and focuses the trigger, which `lg:hidden` has just hidden,
 * so focus fell to the page and Tab restarted at Skip to content (w4/1006).
 * jsdom lays nothing out, so which control has a box is stubbed per test.
 */
const OPTIONS = [
  { label: "Holdings", value: "all" },
  { label: "Holdings by Currency", value: "by-currency" },
  { label: "Holdings by Account", value: "by-account" },
];

function Report() {
  const [view, setView] = useState("all");
  return (
    <Tabs value={view} onValueChange={setView}>
      <ResponsiveTabTriggerList
        selectedTab={view}
        setSelectedTab={setView}
        tabOptions={OPTIONS}
      />
      <p>Showing {view}</p>
      <button type="button">Next control</button>
    </Tabs>
  );
}

const rects = (element: Element, shown: boolean) =>
  vi
    .spyOn(element, "getClientRects")
    .mockReturnValue(
      (shown ? [new DOMRect(0, 0, 80, 32)] : []) as unknown as DOMRectList,
    );

beforeEach(() => {
  // Radix Select reads pointer capture and scrolls its item, which jsdom does
  // not implement.
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});
afterEach(() => vi.restoreAllMocks());

async function chooseByCurrency(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("combobox"));
  await user.click(
    await screen.findByRole("option", { name: "Holdings by Currency" }),
  );
  expect(screen.getByText("Showing by-currency")).toBeInTheDocument();
}

describe("ResponsiveTabTriggerList closing focus", () => {
  it("hands focus to the selected tab when the list closes after the trigger hid", async () => {
    const user = userEvent.setup();
    render(<Report />);
    await chooseByCurrency(user);
    const trigger = screen.getByRole("combobox");
    const selected = screen.getByRole("tab", { name: "Holdings by Currency" });

    await user.click(trigger);
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
    // The window is now wide: the trigger has no box, the tabs do.
    rects(trigger, false);
    rects(selected, true);
    act(() => {
      fireEvent(window, new Event("resize"));
    });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    // Radix hands focus back a task after the list unmounts.
    await waitFor(() => expect(selected).toHaveFocus());
    expect(screen.getByText("Showing by-currency")).toBeInTheDocument();
    // Tab continues from the report's own controls.
    await user.tab();
    expect(screen.getByRole("button", { name: "Next control" })).toHaveFocus();
  });

  it("keeps focus on a visible trigger when the list closes", async () => {
    const user = userEvent.setup();
    render(<Report />);
    await chooseByCurrency(user);
    const trigger = screen.getByRole("combobox");
    rects(trigger, true);
    expect(trigger).toHaveFocus();

    // Escape, and a resize that leaves the trigger shown (390 → 768).
    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    act(() => {
      fireEvent(window, new Event("resize"));
    });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

vi.mock("@/common/hooks/use-cookie-storage-state", async () => {
  const { useState } = await import("react");
  return {
    useCookieStorageState: (_key: string, initial: unknown) =>
      useState(initial) as unknown,
  };
});

import {
  ChartsToggleButton,
  CollapsibleChartsSection,
} from "../collapsible-charts-section";
import { useChartsVisibility } from "../use-charts-visibility";

function Harness() {
  const { chartsVisible, toggleChartsVisible, chartsSectionId } =
    useChartsVisibility("balanceSheet");
  return (
    <div>
      <button type="button">before</button>
      <ChartsToggleButton
        chartsVisible={chartsVisible}
        onToggle={toggleChartsVisible}
        chartsSectionId={chartsSectionId}
      />
      <CollapsibleChartsSection
        id={chartsSectionId}
        chartsVisible={chartsVisible}
      >
        <button type="button">chart control</button>
      </CollapsibleChartsSection>
      <button type="button">after</button>
    </div>
  );
}

/** Finishes the 300ms grid-row animation jsdom never runs on its own. */
function settleCollapseAnimation() {
  const section = document.getElementById("balanceSheet-charts");
  fireEvent.transitionEnd(section!.parentElement!);
}

describe("collapsible charts section", () => {
  it("announces the collapsed state and the section it controls", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const toggle = screen.getByRole("button", { name: "common.hideCharts" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-controls", "balanceSheet-charts");
    expect(document.getElementById("balanceSheet-charts")).not.toBeNull();

    await user.click(toggle);

    const collapsedToggle = screen.getByRole("button", {
      name: "common.showCharts",
    });
    expect(collapsedToggle).toHaveAttribute("aria-expanded", "false");
    expect(collapsedToggle).toHaveAttribute(
      "aria-controls",
      "balanceSheet-charts",
    );
  });

  it("keeps expanded chart controls reachable by keyboard", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    screen.getByRole("button", { name: "common.hideCharts" }).focus();
    await user.tab();

    expect(screen.getByRole("button", { name: "chart control" })).toHaveFocus();
  });

  it("takes collapsed chart controls out of the tab order", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "common.hideCharts" }));
    settleCollapseAnimation();

    screen.getByRole("button", { name: "common.showCharts" }).focus();
    await user.tab();

    expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
  });

  it("marks the collapsing section inert before the animation finishes", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "common.hideCharts" }));

    // Still rendered (and not yet hidden) so the 300ms close animation runs,
    // but already inert so its descendants leave the tab order immediately.
    const section = document.getElementById("balanceSheet-charts")!;
    expect(section).toHaveAttribute("inert");
    expect(section).not.toHaveAttribute("hidden");
    expect(section.textContent).toContain("chart control");

    settleCollapseAnimation();
    expect(section).toHaveAttribute("hidden");
  });

  it("reveals the section again before the expand animation starts", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "common.hideCharts" }));
    settleCollapseAnimation();
    await user.click(screen.getByRole("button", { name: "common.showCharts" }));

    const section = document.getElementById("balanceSheet-charts")!;
    expect(section).not.toHaveAttribute("hidden");
    expect(section).not.toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "chart control" })).toBeVisible();
  });
});

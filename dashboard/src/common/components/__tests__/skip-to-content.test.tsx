import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SkipToContentLink } from "../skip-to-content";
import { focusMainContent, MAIN_CONTENT_ID } from "@/common/lib/main-content";

describe("SkipToContentLink", () => {
  it("is the first focusable control and stays visually hidden until focused", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <SkipToContentLink />
        <a href="/ledger">Sidebar link</a>
        <main id={MAIN_CONTENT_ID} tabIndex={-1}>
          Content
        </main>
      </div>,
    );

    const skip = screen.getByRole("link", { name: "Skip to main content" });
    expect(skip).toHaveClass("sr-only");

    await user.tab();
    expect(skip).toHaveFocus();
    expect(skip.className).toMatch(/focus:not-sr-only/);
  });

  it("moves document focus into main content when activated", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <SkipToContentLink />
        <a href="/ledger">Sidebar link</a>
        <main id={MAIN_CONTENT_ID} tabIndex={-1}>
          <button type="button">Inside content</button>
        </main>
      </div>,
    );

    const skip = screen.getByRole("link", { name: "Skip to main content" });
    const main = document.getElementById(MAIN_CONTENT_ID);
    expect(main).not.toBeNull();

    await user.click(skip);

    expect(document.activeElement).toBe(main);
  });
});

describe("focusMainContent", () => {
  it("focuses the main content element when present", () => {
    render(
      <main id={MAIN_CONTENT_ID} tabIndex={-1}>
        Body
      </main>,
    );

    focusMainContent();
    expect(document.activeElement).toBe(
      document.getElementById(MAIN_CONTENT_ID),
    );
  });
});

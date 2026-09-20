import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NotFoundPage from "../not-found-page";

/**
 * The shared not-found screen is a standalone document, so its content and
 * both recovery controls have to sit inside the page's single main landmark.
 */

vi.mock("@tanstack/react-router", () => ({
  // The real Link takes `to`; render a genuine anchor so it keeps its role.
  Link: ({
    to,
    children,
    ...props
  }: React.ComponentProps<"a"> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/common/components/seo/page-seo", () => ({ PageSEO: () => null }));

describe("NotFoundPage main landmark", () => {
  it("wraps the message and both recovery controls in one main", () => {
    render(<NotFoundPage />);

    const mains = [...document.querySelectorAll("main, [role='main']")];
    expect(mains).toHaveLength(1);

    const main = mains[0];
    expect(main.contains(screen.getByText("404"))).toBe(true);
    expect(
      main.contains(screen.getByRole("heading", { name: /not found/i })),
    ).toBe(true);
    const controls = [
      ...screen.getAllByRole("button"),
      ...screen.getAllByRole("link"),
    ];
    expect(controls.length).toBeGreaterThanOrEqual(2);
    for (const control of controls) {
      expect(main.contains(control)).toBe(true);
    }
  });
});

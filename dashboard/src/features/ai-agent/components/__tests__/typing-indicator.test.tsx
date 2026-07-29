import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TypingIndicator } from "../typing-indicator";

describe("TypingIndicator", () => {
  it("renders 3 animated dots", () => {
    const { container } = render(<TypingIndicator />);
    const dots = container.querySelectorAll(".animate-bounce");
    expect(dots).toHaveLength(3);
  });

  it("renders a container with flex layout", () => {
    const { container } = render(<TypingIndicator />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("flex");
  });
});

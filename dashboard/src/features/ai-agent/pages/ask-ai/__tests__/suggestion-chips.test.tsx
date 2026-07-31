import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SuggestionChips } from "../suggestion-chips";
import enAiAgent from "@/features/ai-agent/locales/en";

const POOL_MESSAGES = [
  "aiAgent.suggestions.diningLastMonth",
  "aiAgent.suggestions.netWorth",
  "aiAgent.suggestions.topCategories",
  "aiAgent.suggestions.uncategorized",
  "aiAgent.suggestions.monthOverMonth",
  "aiAgent.suggestions.largestExpense",
].map((key) => enAiAgent[key].message);

describe("SuggestionChips", () => {
  it("renders 4 suggestion chips sampled from the pool", () => {
    render(<SuggestionChips onSelect={vi.fn()} />);
    expect(screen.getByText("Try asking:")).toBeInTheDocument();

    const chips = screen.getAllByRole("button");
    expect(chips).toHaveLength(4);
    for (const chip of chips) {
      expect(POOL_MESSAGES).toContain(chip.textContent);
    }
  });

  it("renders distinct chips (no duplicates)", () => {
    render(<SuggestionChips onSelect={vi.fn()} />);
    const texts = screen.getAllByRole("button").map((c) => c.textContent);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("calls onSelect with the question text when a chip is clicked", () => {
    const onSelect = vi.fn();
    render(<SuggestionChips onSelect={onSelect} />);
    const chip = screen.getAllByRole("button")[0];
    fireEvent.click(chip);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(chip.textContent);
  });
});

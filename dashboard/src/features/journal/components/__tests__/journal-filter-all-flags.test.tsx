import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DirectiveType } from "@/common/types/journal";
import { JournalFilters } from "../journal-filters";

/**
 * Choosing no flag lists every flag. That choice has a chip of its own, so
 * each flag chip reads plainly on or off.
 */
function renderFilters(selectedTransactionSubtypes: string[]) {
  const onTransactionSubtypesChange = vi.fn();
  render(
    <JournalFilters
      selectedDirectiveTypes={[DirectiveType.TRANSACTION]}
      onDirectiveTypesChange={vi.fn()}
      selectedTransactionSubtypes={selectedTransactionSubtypes}
      onTransactionSubtypesChange={onTransactionSubtypesChange}
      selectedDocumentSubtypes={[]}
      onDocumentSubtypesChange={vi.fn()}
      selectedCustomSubtypes={[]}
      onCustomSubtypesChange={vi.fn()}
      showMetadata={false}
      onShowMetadataChange={vi.fn()}
      showPostings={false}
      onShowPostingsChange={vi.fn()}
    />,
  );
  return onTransactionSubtypesChange;
}

describe("the All flags chip", () => {
  it("is pressed when no flag is chosen, and no flag chip is", () => {
    renderFilters([]);

    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: /cleared transactions/i }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("clears the chosen flags", async () => {
    const onChange = renderFilters(["pending"]);

    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await userEvent.click(screen.getByRole("button", { name: "All" }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});

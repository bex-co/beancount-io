import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DocumentRow } from "../index";

describe("DocumentRow", () => {
  it("is tabbable and activates with click, Enter, and Space", async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();

    render(
      <table>
        <tbody>
          <DocumentRow
            document={{
              __typename: "Document",
              filename: "receipts/coffee.pdf",
              account: "Expenses:Food",
              date: "2024-01-01",
              tags: ["receipt"],
              links: [],
              meta: null,
            }}
            onActivate={onActivate}
          />
        </tbody>
      </table>,
    );

    const documentRow = screen.getByRole("link", {
      name: /receipts\/coffee\.pdf/,
    });
    expect(documentRow).toHaveAttribute("tabindex", "0");

    await user.tab();
    expect(documentRow).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    await user.click(documentRow);

    expect(onActivate).toHaveBeenCalledTimes(3);
  });
});

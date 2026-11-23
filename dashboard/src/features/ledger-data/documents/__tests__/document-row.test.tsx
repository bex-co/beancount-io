import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DocumentRow } from "../index";

describe("DocumentRow", () => {
  it("shows each metadata key and its full value on a separate line", () => {
    render(
      <table>
        <tbody>
          <DocumentRow
            document={{
              __typename: "Document",
              filename: "receipts/coffee.pdf",
              account: "Expenses:Food",
              date: "2026-05-06",
              tags: [],
              links: [],
              meta: {
                "statement-date": "2026-05-06",
                total: "12.50 USD",
                reviewed: true,
                pages: 0,
                "bank-account": "Assets:Qa20261118:Cash",
              },
            }}
            onActivate={vi.fn()}
          />
        </tbody>
      </table>,
    );

    const metadata = screen.getAllByRole("cell").at(-1)!;
    expect(
      within(metadata)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "statement-date: 2026-05-06",
      "total: 12.50 USD",
      "reviewed: true",
      "pages: 0",
      "bank-account: Assets:Qa20261118:Cash",
    ]);
  });

  it("keeps native row structure and activates from the filename control", async () => {
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

    const filename = screen.getByRole("button", {
      name: /receipts\/coffee\.pdf/,
    });
    const documentRow = filename.closest("tr");
    expect(documentRow).not.toHaveAttribute("role");
    expect(documentRow).not.toHaveAttribute("tabindex");
    expect(documentRow?.querySelectorAll("td").length).toBeGreaterThan(0);

    await user.tab();
    expect(filename).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.click(filename);
    await user.click(documentRow as HTMLElement);

    expect(onActivate).toHaveBeenCalledTimes(3);
  });
});

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderLedgerNavigation } from "@/test/render-ledger-navigation";
import { DocumentRow } from "../index";

describe("DocumentRow", () => {
  it("shows each metadata key and its full value on a separate line", async () => {
    await renderLedgerNavigation(
      <table>
        <tbody>
          <DocumentRow
            ledgerOwner="alice"
            ledgerName="books"
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

    const { router } = await renderLedgerNavigation(
      <table>
        <tbody>
          <DocumentRow
            ledgerOwner="alice"
            ledgerName="books"
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
      "documents",
      "?time=2026",
    );

    const filename = screen.getByRole("link", {
      name: /receipts\/coffee\.pdf/,
    });
    const documentRow = filename.closest("tr");
    expect(documentRow).not.toHaveAttribute("role");
    expect(documentRow).not.toHaveAttribute("tabindex");
    expect(documentRow?.querySelectorAll("td").length).toBeGreaterThan(0);

    expect(filename).toHaveAttribute(
      "href",
      "/ledger/alice/books/files/blob/main/receipts/coffee.pdf?time=2026",
    );
    fireEvent.click(documentRow!, { ctrlKey: true });
    fireEvent.click(filename, { metaKey: true });
    expect(onActivate).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toBe(
      "/ledger/alice/books/documents",
    );
    await user.click(documentRow!);

    await user.tab();
    expect(filename).toHaveFocus();
    await user.keyboard("{Enter}");
    await waitFor(() =>
      expect(router.state.location.href).toBe(
        "/ledger/alice/books/files/blob/main/receipts/coffee.pdf?time=2026",
      ),
    );
    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});

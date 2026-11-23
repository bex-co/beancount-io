import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderLedgerNavigation } from "@/test/render-ledger-navigation";
import LedgerFileBreadcrumb from "../ledger-file-breadcrumb";

const rootPath = "/ledger/alice/books/files/tree/main";
const filters = "?account=Assets&filter=sample&time=2026";

describe("LedgerFileBreadcrumb", () => {
  it.each([undefined, ""])("links to Files for root path %s", async (path) => {
    const { container } = await renderLedgerNavigation(
      <LedgerFileBreadcrumb type="dir" path={path} className="breadcrumb" />,
      "files",
    );
    expect(screen.getByRole("link", { name: "Files" })).toHaveAttribute(
      "href",
      rootPath,
    );
    expect(container.firstChild).toHaveClass("breadcrumb");
    expect(container.querySelector(".lucide-folder-open")).toBeInTheDocument();
  });

  it.each(["accounts/2024/january", "/accounts/2024/january/"])(
    "links to each cumulative folder in %s",
    async (path) => {
      const { container, router } = await renderLedgerNavigation(
        <LedgerFileBreadcrumb type="dir" path={path} />,
        "files",
        filters,
      );
      const expected = [
        ["Files", ""],
        ["accounts", "/accounts"],
        ["2024", "/accounts/2024"],
        ["january", "/accounts/2024/january"],
      ];
      for (const [name, destination] of expected) {
        expect(screen.getByRole("link", { name, exact: true })).toHaveAttribute(
          "href",
          rootPath + destination + filters,
        );
      }
      expect(container.querySelectorAll(".lucide-chevron-right")).toHaveLength(
        3,
      );
      const user = userEvent.setup();
      screen.getByRole("link", { name: "2024" }).focus();
      await user.keyboard("{Enter}");
      await waitFor(() =>
        expect(router.state.location.href).toBe(
          rootPath + "/accounts/2024" + filters,
        ),
      );
    },
  );

  it("links to a file's parent folder and leaves the current filename as text", async () => {
    const { router } = await renderLedgerNavigation(
      <LedgerFileBreadcrumb
        type="file"
        path="FY 2024/receipt.pdf"
        name="Receipt"
      />,
      "files",
      filters,
    );
    const folder = screen.getByRole("link", { name: "FY 2024" });
    expect(folder).toHaveAttribute("href", rootPath + "/FY%202024" + filters);
    expect(
      screen.queryByRole("link", { name: "Receipt" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Receipt")).toHaveClass("font-medium");

    await userEvent.click(folder);
    await waitFor(() =>
      expect(router.state.location.href).toBe(
        rootPath + "/FY%202024" + filters,
      ),
    );
  });

  it.each([
    ["main.bean", "main.bean"],
    ["", undefined],
  ])("renders a root file breadcrumb for %s", async (path, filename) => {
    await renderLedgerNavigation(
      <LedgerFileBreadcrumb type="file" path={path} />,
      "files",
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);
    if (filename) expect(screen.getByText(filename)).toBeVisible();
  });
});

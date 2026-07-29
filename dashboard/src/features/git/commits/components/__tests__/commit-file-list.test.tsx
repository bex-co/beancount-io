import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CommitFileList } from "../commit-file-list";

describe("CommitFileList", () => {
  it("is collapsed by default and links files to matching diff anchors", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <CommitFileList
        files={[
          {
            filename: "accounts/main.bean",
            additions: 4,
            deletions: 2,
          },
        ]}
      />,
    );

    const disclosure = container.querySelector("details");
    expect(disclosure).not.toHaveAttribute("open");

    await user.click(screen.getByText("files changed"));
    expect(disclosure).toHaveAttribute("open");
    expect(
      screen.getByRole("link", { name: /accounts\/main\.bean/ }),
    ).toHaveAttribute("href", "#diff-file-accounts%2Fmain.bean");
    expect(screen.getByText("+4")).toBeInTheDocument();
    expect(screen.getByText("-2")).toBeInTheDocument();
  });
});

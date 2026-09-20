import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EditableCell } from "../editable-cell";

/**
 * The cell took an `error` prop and used it only to colour its border, so the
 * reason sat beside the control as loose text with nothing tying the two
 * together. The multiline branch pointed `aria-describedby` at its newline
 * hint alone, which meant the error was never referenced there either.
 */

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key} ${Object.values(vars).join(" ")}` : key,
  }),
}));

/** Resolves what a control's `aria-describedby` actually points at. */
function describedText(control: HTMLElement): string[] {
  const ids = control.getAttribute("aria-describedby")?.split(/\s+/) ?? [];
  return ids
    .map((id) => document.getElementById(id)?.textContent?.trim())
    .filter((text): text is string => Boolean(text));
}

async function openCell(props: Partial<Parameters<typeof EditableCell>[0]>) {
  const user = userEvent.setup();
  render(
    <EditableCell
      value="ACME"
      onChange={vi.fn()}
      error="Amount is required"
      {...props}
    />,
  );
  await user.click(screen.getByRole("button"));
  return user;
}

describe("a cell that is showing an error", () => {
  it("names the message from the collapsed control", () => {
    render(
      <EditableCell
        value="ACME"
        onChange={vi.fn()}
        error="Amount is required"
      />,
    );

    const cell = screen.getByRole("button");
    expect(cell).toHaveAttribute("aria-invalid", "true");
    expect(describedText(cell)).toContain("Amount is required");
  });

  it("names it from the single-line editor too", async () => {
    await openCell({});

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(describedText(input)).toContain("Amount is required");
  });

  it("keeps the multiline hint and adds the error beside it", async () => {
    await openCell({ multiline: true });

    const textarea = screen.getByRole("textbox");
    const described = describedText(textarea);
    expect(described).toContain("Amount is required");
    expect(described).toContain("importer.preview.multilineHint");
  });

  it("announces the message rather than only drawing it", () => {
    render(
      <EditableCell
        value="ACME"
        onChange={vi.fn()}
        error="Amount is required"
      />,
    );

    // The editor branch is the one a reader is in while correcting.
    expect(screen.getByText("Amount is required")).toBeInTheDocument();
  });
});

describe("a cell with nothing wrong", () => {
  it("describes nothing from the collapsed control", () => {
    render(<EditableCell value="ACME" onChange={vi.fn()} />);

    const cell = screen.getByRole("button");
    expect(cell).not.toHaveAttribute("aria-invalid");
    expect(cell).not.toHaveAttribute("aria-describedby");
  });

  it("still points a multiline editor at its hint", async () => {
    const user = userEvent.setup();
    render(<EditableCell value="ACME" onChange={vi.fn()} multiline />);
    await user.click(screen.getByRole("button"));

    expect(describedText(screen.getByRole("textbox"))).toContain(
      "importer.preview.multilineHint",
    );
  });
});

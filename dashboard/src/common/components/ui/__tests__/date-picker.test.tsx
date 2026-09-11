import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { format } from "date-fns";
import { DatePicker } from "../date-picker";

vi.mock("@/common/hooks/use-date-locale", async () => {
  const { enUS } = await import("react-day-picker/locale/en-US");
  return { useDateLocale: () => enUS };
});

function ControlledDatePicker({
  initial,
  onValue,
}: {
  initial?: Date;
  onValue: (date: Date | undefined) => void;
}) {
  const [value, setValue] = useState<Date | undefined>(initial);
  return (
    <DatePicker
      id="date"
      value={value}
      onChange={(next) => {
        setValue(next);
        onValue(next);
      }}
    />
  );
}

describe("DatePicker typing contract", () => {
  it("keeps a typed MM/dd/yyyy draft and publishes only the complete date", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<ControlledDatePicker onValue={onValue} />);

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "06/15/2025");

    expect(input).toHaveValue("06/15/2025");
    expect(onValue).toHaveBeenLastCalledWith(expect.any(Date));
    expect(format(onValue.mock.calls.at(-1)![0] as Date, "yyyy-MM-dd")).toBe(
      "2025-06-15",
    );
  });

  it("publishes undefined for cleared or invalid text without wiping the draft", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(
      <ControlledDatePicker
        initial={new Date(2025, 5, 15)}
        onValue={onValue}
      />,
    );

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("06/15/2025");

    await user.clear(input);
    expect(input).toHaveValue("");
    expect(onValue).toHaveBeenLastCalledWith(undefined);

    await user.type(input, "not-a-date");
    expect(input).toHaveValue("not-a-date");
    expect(onValue).toHaveBeenLastCalledWith(undefined);
  });

  it("does not accept February 30 as a rolled-over March date", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<ControlledDatePicker onValue={onValue} />);

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "02/30/2025");

    expect(input).toHaveValue("02/30/2025");
    expect(onValue).toHaveBeenLastCalledWith(undefined);
  });

  it("preserves ISO yyyy-MM-dd as a local calendar date", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<ControlledDatePicker onValue={onValue} />);

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.paste("2025-06-15");

    expect(onValue).toHaveBeenLastCalledWith(expect.any(Date));
    expect(format(onValue.mock.calls.at(-1)![0] as Date, "yyyy-MM-dd")).toBe(
      "2025-06-15",
    );
  });
});

describe("DatePicker calendar year range", () => {
  it("opens on a next-year value with that month selected", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(
      <ControlledDatePicker
        initial={new Date(2027, 0, 15)}
        onValue={onValue}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Select date" }));

    expect(screen.getByRole("combobox", { name: "Choose the Year" })).toHaveTextContent(
      "2027",
    );
    expect(
      screen.getByRole("combobox", { name: "Choose the Month" }),
    ).toHaveTextContent("January");
    expect(
      screen.getByRole("gridcell", { name: "15", selected: true }),
    ).toBeInTheDocument();
  });

  it("navigates from December into the next calendar year", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(
      <ControlledDatePicker
        initial={new Date(2026, 11, 1)}
        onValue={onValue}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Select date" }));

    const next = screen.getByRole("button", { name: "Go to the Next Month" });
    expect(next).toBeEnabled();
    await user.click(next);

    expect(screen.getByRole("combobox", { name: "Choose the Year" })).toHaveTextContent(
      "2027",
    );
    expect(
      screen.getByRole("combobox", { name: "Choose the Month" }),
    ).toHaveTextContent("January");

    const day15 = screen.getByRole("gridcell", { name: "15" });
    const dayButton = day15.querySelector("button");
    expect(dayButton).toBeTruthy();
    await user.click(dayButton!);
    expect(onValue).toHaveBeenLastCalledWith(expect.any(Date));
    expect(format(onValue.mock.calls.at(-1)![0] as Date, "yyyy-MM-dd")).toBe(
      "2027-01-15",
    );
  });
});

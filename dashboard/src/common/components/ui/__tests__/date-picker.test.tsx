import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { format } from "date-fns";
import { enUS } from "react-day-picker/locale/en-US";
import { fr } from "react-day-picker/locale/fr";
import type { Locale } from "react-day-picker";
import { DatePicker } from "../date-picker";

const mocks = vi.hoisted(() => ({
  dateLocale: null as unknown as Locale,
}));

vi.mock("@/common/hooks/use-date-locale", () => {
  return { useDateLocale: () => mocks.dateLocale };
});

beforeEach(() => {
  mocks.dateLocale = enUS;
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

    expect(
      screen.getByRole("combobox", { name: "Choose the Year" }),
    ).toHaveTextContent("2027");
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

    expect(
      screen.getByRole("combobox", { name: "Choose the Year" }),
    ).toHaveTextContent("2027");
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

describe("DatePicker locale ordering", () => {
  it("shows the month-first hint and ISO fallback under English", () => {
    render(<ControlledDatePicker onValue={vi.fn()} />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("placeholder", "MM/DD/YYYY");
    expect(input).toHaveAttribute(
      "title",
      "Enter a date as MM/DD/YYYY or YYYY-MM-DD",
    );
  });

  it("shows the day-first hint and reads day-first input under French", async () => {
    mocks.dateLocale = fr;
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<ControlledDatePicker onValue={onValue} />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("placeholder", "DD/MM/YYYY");
    expect(input).toHaveAttribute(
      "title",
      "Enter a date as DD/MM/YYYY or YYYY-MM-DD",
    );

    await user.clear(input);
    await user.type(input, "15/06/2025");
    expect(format(onValue.mock.calls.at(-1)![0] as Date, "yyyy-MM-dd")).toBe(
      "2025-06-15",
    );
  });

  it("re-renders the same date on language change without republishing (m22)", () => {
    const onValue = vi.fn();
    const { rerender } = render(
      <ControlledDatePicker
        initial={new Date(2025, 5, 15)}
        onValue={onValue}
      />,
    );
    expect(screen.getByRole("textbox")).toHaveValue("06/15/2025");

    mocks.dateLocale = fr;
    rerender(
      <ControlledDatePicker
        initial={new Date(2025, 5, 15)}
        onValue={onValue}
      />,
    );

    // Same selected Date in French clothes; the stored date is untouched.
    expect(screen.getByRole("textbox")).toHaveValue("15/06/2025");
    expect(onValue).not.toHaveBeenCalled();
  });

  it("leaves a mid-edit draft untouched when the language changes (m22)", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    const { rerender } = render(<ControlledDatePicker onValue={onValue} />);

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "06/1");
    const callsBeforeSwitch = onValue.mock.calls.length;

    mocks.dateLocale = fr;
    rerender(<ControlledDatePicker onValue={onValue} />);

    expect(screen.getByRole("textbox")).toHaveValue("06/1");
    expect(onValue.mock.calls.length).toBe(callsBeforeSwitch);
  });
});

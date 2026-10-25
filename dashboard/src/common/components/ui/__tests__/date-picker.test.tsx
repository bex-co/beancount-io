import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
  initial?: string;
  onValue: (date: string | undefined) => void;
}) {
  const [value, setValue] = useState<string | undefined>(initial);
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

describe("DatePicker pending lock (w4/1069)", () => {
  it("closes an open calendar and locks input and trigger when disabled", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    const { rerender } = render(
      <DatePicker id="date" value="2026-10-01" onChange={onValue} />,
    );
    await user.click(screen.getByRole("button", { name: "Select date" }));
    expect(screen.getByRole("button", { name: /October 15/ })).toBeVisible();

    rerender(
      <DatePicker id="date" value="2026-10-01" onChange={onValue} disabled />,
    );
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Select date" })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /October 15/ }),
    ).not.toBeInTheDocument();
    expect(onValue).not.toHaveBeenCalled();
  });
});

describe("DatePicker typing contract", () => {
  it("publishes the canonical day for Persian digits and keeps the typed text (w4/325)", () => {
    const onValue = vi.fn();
    render(<ControlledDatePicker onValue={onValue} />);
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "۰۶/۱۵/۲۰۲۵" } });
    expect(input).toHaveValue("۰۶/۱۵/۲۰۲۵");
    expect(onValue).toHaveBeenLastCalledWith("2025-06-15");
  });

  it("keeps a typed MM/dd/yyyy draft and publishes only the complete date", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<ControlledDatePicker onValue={onValue} />);

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "06/15/2025");

    expect(input).toHaveValue("06/15/2025");
    expect(onValue).toHaveBeenLastCalledWith("2025-06-15");
  });

  it("publishes undefined for cleared or invalid text without wiping the draft", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<ControlledDatePicker initial={"2025-06-15"} onValue={onValue} />);

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

  it("preserves ISO yyyy-MM-dd as the same civil day", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<ControlledDatePicker onValue={onValue} />);

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.paste("2025-06-15");

    expect(onValue).toHaveBeenLastCalledWith("2025-06-15");
  });
});

describe("DatePicker calendar year range", () => {
  // Year 0 rendered as a second "0001" whose February 29 crashed the form;
  // the dropdown now holds only real ledger years (w4/326).
  it("offers year 0001 once, and a February 0001 without the 29th", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<ControlledDatePicker initial={"0001-01-01"} onValue={onValue} />);
    await user.click(screen.getByRole("button", { name: "Select date" }));

    const years = screen.getByRole("combobox", { name: "Choose the Year" });
    const labels = [...years.querySelectorAll("option")].map(
      (option) => option.textContent,
    );
    expect(labels[0]).toBe("0001");
    expect(labels.filter((label) => label === "0001")).toHaveLength(1);
    expect(labels.at(-1)).toBe("0101");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Choose the Month" }),
      "1",
    );
    // Day buttons are named by their full date; January's outside days
    // also show in February's grid.
    expect(screen.queryByRole("button", { name: /February 29/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: /February 28/ }));
    expect(onValue).toHaveBeenLastCalledWith("0001-02-28");
    expect(screen.getByRole("textbox")).toHaveValue("02/28/0001");
  });

  it("offers no year past 9999", async () => {
    const user = userEvent.setup();
    render(<ControlledDatePicker initial={"9999-12-31"} onValue={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Select date" }));
    const years = screen.getByRole("combobox", { name: "Choose the Year" });
    const labels = [...years.querySelectorAll("option")].map(
      (option) => option.textContent,
    );
    expect(labels.at(-1)).toBe("9999");
    expect(labels[0]).toBe("9899");
  });

  it("opens on a next-year value with that month selected", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<ControlledDatePicker initial={"2027-01-15"} onValue={onValue} />);

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
    render(<ControlledDatePicker initial={"2026-12-01"} onValue={onValue} />);

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
    expect(onValue).toHaveBeenLastCalledWith("2027-01-15");
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
    expect(onValue).toHaveBeenLastCalledWith("2025-06-15");
  });

  it("re-renders the same date on language change without republishing (m22)", () => {
    const onValue = vi.fn();
    const { rerender } = render(
      <ControlledDatePicker initial={"2025-06-15"} onValue={onValue} />,
    );
    expect(screen.getByRole("textbox")).toHaveValue("06/15/2025");

    mocks.dateLocale = fr;
    rerender(<ControlledDatePicker initial={"2025-06-15"} onValue={onValue} />);

    // Same selected day in French clothes; the stored date is untouched.
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

/**
 * react-hook-form's `field.value` falls back to the form's default when the
 * stored value is `undefined`, so after invalid text the picker is handed the
 * default date back (w0/005). Mirrors the journal forms' wiring.
 */
function FormDatePicker({ defaultDate }: { defaultDate: string }) {
  const form = useForm<{ date: string | undefined }>({
    defaultValues: { date: defaultDate },
  });
  return (
    <Controller
      control={form.control}
      name="date"
      render={({ field }) => (
        <DatePicker
          id="date"
          value={field.value}
          onChange={(next) => field.onChange(next)}
          required
        />
      )}
    />
  );
}

describe("DatePicker inside react-hook-form", () => {
  it("keeps an invalid draft visible after blur instead of reverting to the default", async () => {
    const user = userEvent.setup();
    render(<FormDatePicker defaultDate="2026-10-15" />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("10/15/2026");
    await user.clear(input);
    await user.type(input, "2026-02-30");
    await user.tab();

    expect(input).toHaveValue("2026-02-30");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("still normalizes a valid ISO draft on blur", async () => {
    const user = userEvent.setup();
    render(<FormDatePicker defaultDate="2026-10-15" />);

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "2026-02-28");
    await user.tab();

    expect(input).toHaveValue("02/28/2026");
    expect(input).not.toHaveAttribute("aria-invalid");
  });
});

/** Pacific/Apia skipped 2011-12-30; the picker must still hold it (w4/m32). */
describe("DatePicker in a timezone that skipped a day", () => {
  const originalTz = process.env.TZ;
  beforeEach(() => {
    process.env.TZ = "Pacific/Apia";
  });
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("accepts the skipped day typed in either order", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<ControlledDatePicker onValue={onValue} />);

    const input = screen.getByRole("textbox");
    for (const typed of ["2011-12-30", "12/30/2011"]) {
      await user.clear(input);
      await user.type(input, typed);
      expect(onValue).toHaveBeenLastCalledWith("2011-12-30");
      await user.tab();
      expect(input).toHaveValue("12/30/2011");
      expect(input).not.toHaveAttribute("aria-invalid");
    }
  });

  it("selects the skipped day in the calendar and picks its neighbours", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<ControlledDatePicker initial="2011-12-30" onValue={onValue} />);

    await user.click(screen.getByRole("button", { name: "Select date" }));
    expect(
      screen.getByRole("combobox", { name: "Choose the Year" }),
    ).toHaveTextContent("2011");
    expect(
      screen.getByRole("gridcell", { name: "30", selected: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Saturday, December 31st, 2011" }),
    ).toBeInTheDocument();
    // Cell labels read the civil day too, not the zone's local rendering.
    expect(
      screen.getByRole("button", { name: /December 30th, 2011/ }),
    ).toHaveAttribute("data-day", "12/30/2011");

    await user.click(
      screen.getByRole("button", { name: "Thursday, December 29th, 2011" }),
    );
    expect(onValue).toHaveBeenLastCalledWith("2011-12-29");
    expect(screen.getByRole("textbox")).toHaveValue("12/29/2011");
  });

  it("commits the local Today", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<ControlledDatePicker onValue={onValue} />);

    await user.click(screen.getByRole("button", { name: "Select date" }));
    await user.click(screen.getByRole("button", { name: "Today" }));
    const now = new Date();
    const local = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(onValue).toHaveBeenLastCalledWith(local);
  });
});

/**
 * The same real react-hook-form wiring with a schema-backed submit state and
 * a deliberate reset, for the valid-then-invalid and cleared sequences
 * (w4/239).
 */
function ValidatedFormDatePicker({ resetTo }: { resetTo?: string }) {
  const form = useForm<{ date: string | undefined }>({
    defaultValues: { date: "2026-10-20" },
    mode: "onChange",
  });
  const valid = form.watch("date") !== undefined;
  return (
    <form>
      <Controller
        control={form.control}
        name="date"
        rules={{ required: true }}
        render={({ field, fieldState }) => (
          <DatePicker
            id="date"
            value={field.value}
            onChange={(next) => field.onChange(next)}
            aria-invalid={fieldState.invalid}
            aria-describedby="date-error"
            required
          />
        )}
      />
      <button type="submit" disabled={!valid}>
        Submit
      </button>
      {resetTo && (
        <button type="button" onClick={() => form.reset({ date: resetTo })}>
          Reset
        </button>
      )}
    </form>
  );
}

describe("DatePicker draft after an earlier valid edit (w4/239)", () => {
  it.each([
    ["a different day", "10/22/2026"],
    ["the original day", "10/20/2026"],
  ])("keeps an invalid draft typed after %s", async (_case, firstEdit) => {
    const user = userEvent.setup();
    render(<ValidatedFormDatePicker />);
    const input = screen.getByRole("textbox");

    await user.clear(input);
    await user.type(input, firstEdit);
    await user.tab();
    expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled();

    await user.clear(input);
    await user.type(input, "02/30/2026");
    await user.tab();

    expect(input).toHaveValue("02/30/2026");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "date-error");
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });

  it("leaves a cleared required date empty and invalid", async () => {
    const user = userEvent.setup();
    render(<ValidatedFormDatePicker />);
    const input = screen.getByRole("textbox");

    await user.clear(input);
    await user.type(input, "10/22/2026");
    await user.clear(input);
    await user.tab();

    expect(input).toHaveValue("");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });

  it("recovers through Today", async () => {
    const user = userEvent.setup();
    render(<ValidatedFormDatePicker />);
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "02/30/2026");
    await user.tab();

    await user.click(screen.getByRole("button", { name: "Select date" }));
    await user.click(screen.getByRole("button", { name: "Today" }));
    expect(input).not.toHaveValue("02/30/2026");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled();
  });

  it("still applies a deliberate reset over a held invalid draft", async () => {
    const user = userEvent.setup();
    render(<ValidatedFormDatePicker resetTo="2026-12-01" />);
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "10/22/2026");
    await user.clear(input);
    await user.type(input, "02/30/2026");
    await user.tab();

    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(input).toHaveValue("12/01/2026");
    expect(input).not.toHaveAttribute("aria-invalid");
  });
});

/** An IME's ArrowDown stays with its composition (w4/288). */
describe("DatePicker during IME composition", () => {
  it.each(["2016-09-20", "2016-09"])(
    "keeps the calendar closed and focus in the field for a composing ArrowDown over %s",
    async (preedit) => {
      const onValue = vi.fn();
      render(<ControlledDatePicker onValue={onValue} />);
      const input = screen.getByRole("textbox");
      input.focus();
      fireEvent.compositionStart(input);
      fireEvent.change(input, { target: { value: preedit } });

      for (const keyCode of [40, 229]) {
        fireEvent.keyDown(input, {
          key: "ArrowDown",
          keyCode,
          isComposing: true,
        });
      }
      expect(screen.queryByRole("grid")).toBeNull();
      expect(input).toHaveFocus();
      expect(input).toHaveValue(preedit);

      fireEvent.compositionEnd(input);
      fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
      expect(await screen.findByRole("grid")).toBeInTheDocument();
    },
  );
});

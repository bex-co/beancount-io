import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ExactAmountInput } from "../exact-amount-input";

/**
 * The browser steps a number input through a double; this field steps in
 * exact decimals, within its own min/max (w4/1017, w4/1021). jsdom does no
 * native stepping, so these assert the field's own step.
 */
function Field(props: {
  initial?: string;
  min?: string;
  max?: string;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const [value, setValue] = useState(props.initial ?? "");
  return (
    <ExactAmountInput
      aria-label="Amount"
      value={value}
      min={props.min}
      max={props.max}
      onKeyDown={props.onKeyDown}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}

const amount = () => screen.getByRole("spinbutton", { name: "Amount" });

async function press(keys: string) {
  amount().focus();
  await userEvent.setup().keyboard(keys);
  return (amount() as HTMLInputElement).value;
}

describe("ExactAmountInput", () => {
  it("steps by exactly one either way", async () => {
    render(<Field initial="9007199254740993.01" />);
    expect(await press("{ArrowUp}")).toBe("9007199254740994.01");
    expect(await press("{ArrowDown}{ArrowDown}")).toBe("9007199254740992.01");
  });

  it("keeps a step inside min and max, as the browser does", async () => {
    render(<Field initial="0.5" min="0" max="2.25" />);
    expect(await press("{ArrowDown}")).toBe("0");
    fireEvent.change(amount(), { target: { value: "1.5" } });
    expect(await press("{ArrowUp}")).toBe("2.25");
  });

  it("leaves a key the caller handled alone", async () => {
    render(<Field initial="1" onKeyDown={(event) => event.preventDefault()} />);
    expect(await press("{ArrowUp}")).toBe("1");
  });

  it("keeps the wheel from stepping it while focused", () => {
    render(<Field initial="1" />);
    const idle = new WheelEvent("wheel", { cancelable: true });
    amount().dispatchEvent(idle);
    expect(idle.defaultPrevented).toBe(false);
    amount().focus();
    const focused = new WheelEvent("wheel", { cancelable: true });
    amount().dispatchEvent(focused);
    expect(focused.defaultPrevented).toBe(true);
    vi.restoreAllMocks();
  });
});

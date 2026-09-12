import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Combobox } from "../combobox";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params?.value ? `${key}:${params.value}` : key,
  }),
}));

const options = [
  { value: "Assets:Crypto:Binance:BTC", label: "Assets:Crypto:Binance:BTC" },
  { value: "Assets:Crypto:Coinbase:BTC", label: "Assets:Crypto:Coinbase:BTC" },
  { value: "Assets:Crypto:Mining:BTC", label: "Assets:Crypto:Mining:BTC" },
];

describe("Combobox explicit selection vs blur", () => {
  it("keeps a keyboard-highlighted option after Enter in blur mode", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Combobox
        options={options}
        value=""
        onValueChange={onValueChange}
        allowCustom
        triggerOn="blur"
      />,
    );

    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "BTC");
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(onValueChange).toHaveBeenCalledWith("Assets:Crypto:Coinbase:BTC");
    expect(onValueChange).not.toHaveBeenCalledWith("BTC");
    expect(input).toHaveValue("Assets:Crypto:Coinbase:BTC");
  });

  it("still commits a custom draft on ordinary blur", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <div>
        <Combobox
          options={options}
          value=""
          onValueChange={onValueChange}
          allowCustom
          triggerOn="blur"
        />
        <button type="button">Away</button>
      </div>,
    );

    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "BTC");
    await user.click(screen.getByRole("button", { name: "Away" }));

    expect(onValueChange).toHaveBeenLastCalledWith("BTC");
  });

  it("keeps pointer selection of a suggestion", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Combobox
        options={options}
        value=""
        onValueChange={onValueChange}
        allowCustom
        triggerOn="blur"
      />,
    );

    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "BTC");
    await user.click(screen.getByText("Assets:Crypto:Coinbase:BTC"));

    expect(onValueChange).toHaveBeenCalledWith("Assets:Crypto:Coinbase:BTC");
    expect(onValueChange.mock.calls.at(-1)?.[0]).toBe(
      "Assets:Crypto:Coinbase:BTC",
    );
  });
});

/**
 * jsdom neither lays out Radix's floating content nor resolves
 * `--radix-popover-content-available-height`, so the only thing assertable here
 * is that the suggestion list is bounded by that custom property instead of a
 * fixed pixel height. Confirming the list actually stops at the viewport edge on
 * a short window requires a real browser.
 */
describe("Combobox suggestion list height", () => {
  it("bounds the popover and its scroll region by the available height", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        options={options}
        value=""
        onValueChange={vi.fn()}
        allowCustom
        triggerOn="blur"
      />,
    );

    await user.click(screen.getByRole("combobox"));

    const item = await screen.findByText("Assets:Crypto:Binance:BTC");
    const list = item.closest("[cmdk-list]") as HTMLElement;
    const content = list.closest("[data-radix-popper-content-wrapper] > *");

    expect(content).not.toBeNull();
    expect((content as HTMLElement).style.maxHeight).toBe(
      "var(--radix-popover-content-available-height)",
    );
    // The shared `command.tsx` cap stays at 300px; this consumer narrows it.
    expect(list.style.maxHeight).toBe(
      "min(300px, var(--radix-popover-content-available-height))",
    );
    // Shrinking must not turn off internal scrolling.
    expect(list.className).toContain("overflow-y-auto");
  });
});

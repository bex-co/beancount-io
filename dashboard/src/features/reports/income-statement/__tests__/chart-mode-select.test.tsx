import { useState, type ComponentProps } from "react";
import { describe, it, expect, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import type { SupportedLanguage } from "@/i18n/config";
import { ChartModeSelect, type ChartMode } from "../chart-mode-select";
import en from "../locales/en";
import de from "../locales/de";

vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");

type SetupProps = Omit<
  ComponentProps<typeof ChartModeSelect>,
  "onValueChange" | "value"
> & { value?: ChartMode; language?: SupportedLanguage };

async function setup({
  language = "en",
  value = "stacked",
  ...props
}: SetupProps = {}) {
  const localization = createLocalization();
  await localization.changeLanguage(language);
  const onValueChange = vi.fn();
  function ControlledSelector() {
    const [mode, setMode] = useState(value);
    return (
      <ChartModeSelect
        {...props}
        value={mode}
        onValueChange={(next) => {
          onValueChange(next);
          setMode(next);
        }}
      />
    );
  }
  render(
    <LocalizationProvider localization={localization}>
      <ControlledSelector />
    </LocalizationProvider>,
  );
  return { localization, onValueChange, user: userEvent.setup() };
}

async function selectSingle(
  user: ReturnType<typeof userEvent.setup>,
  trigger: HTMLElement,
  labels: Record<
    "page.incomeStatement.stackedBars" | "page.incomeStatement.singleBars",
    { message: string }
  >,
) {
  await user.tab();
  expect(trigger).toHaveFocus();
  await user.keyboard("{Enter}");
  const stacked = screen.getByRole("option", {
    name: labels["page.incomeStatement.stackedBars"].message,
    exact: true,
  });
  const single = screen.getByRole("option", {
    name: labels["page.incomeStatement.singleBars"].message,
    exact: true,
  });
  await waitFor(() => expect(stacked).toHaveFocus());
  expect(stacked).toHaveAttribute("aria-selected", "true");
  expect(single).toHaveAttribute("aria-selected", "false");
  await user.keyboard("{ArrowDown}");
  await waitFor(() => expect(single).toHaveFocus());
  await user.keyboard("{Enter}");
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
}

describe("ChartModeSelect", () => {
  it.each([
    ["stacked", en["page.incomeStatement.stackedBars"].message],
    ["single", en["page.incomeStatement.singleBars"].message],
  ] as const)(
    "names the setting independently of its %s value",
    async (value, text) => {
      await setup({ value });
      const trigger = screen.getByRole("combobox", {
        name: en["page.incomeStatement.selectChartMode"].message,
        exact: true,
      });
      expect(trigger).toHaveTextContent(text);
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(trigger).toHaveAttribute("data-size", "sm");
    },
  );

  it("switches the actual Radix selection through the keyboard without changing the setting name", async () => {
    const { user, onValueChange } = await setup();
    const trigger = screen.getByRole("combobox", {
      name: en["page.incomeStatement.selectChartMode"].message,
      exact: true,
    });
    await selectSingle(user, trigger, en);
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("single");
    expect(trigger).toHaveTextContent(
      en["page.incomeStatement.singleBars"].message,
    );
    expect(trigger).toHaveAccessibleName(
      en["page.incomeStatement.selectChartMode"].message,
    );

    await user.keyboard("{Enter}");
    const selected = screen.getByRole("option", {
      name: en["page.incomeStatement.singleBars"].message,
      exact: true,
    });
    await waitFor(() => expect(selected).toHaveFocus());
    expect(selected).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(onValueChange).toHaveBeenCalledOnce();
  });

  it("uses the custom placeholder as its name and forwards caller class and size", async () => {
    await setup({
      placeholder: "Visualization layout",
      className: "custom-class",
      size: "default",
    });
    const trigger = screen.getByRole("combobox", {
      name: "Visualization layout",
      exact: true,
    });
    expect(trigger).toHaveTextContent(
      en["page.incomeStatement.stackedBars"].message,
    );
    expect(trigger).toHaveClass("custom-class");
    expect(trigger).toHaveAttribute("data-size", "default");
  });

  it("uses actual German labels and updates its name on a live language change while retaining the selected mode", async () => {
    const { user, onValueChange, localization } = await setup({
      language: "de",
    });
    const trigger = screen.getByRole("combobox", {
      name: de["page.incomeStatement.selectChartMode"].message,
      exact: true,
    });
    expect(trigger).toHaveTextContent(
      de["page.incomeStatement.stackedBars"].message,
    );
    await selectSingle(user, trigger, de);
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("single");
    expect(trigger).toHaveTextContent(
      de["page.incomeStatement.singleBars"].message,
    );
    expect(trigger).toHaveAccessibleName(
      de["page.incomeStatement.selectChartMode"].message,
    );

    await act(async () => {
      await localization.changeLanguage("en");
    });
    expect(
      screen.getByRole("combobox", {
        name: en["page.incomeStatement.selectChartMode"].message,
        exact: true,
      }),
    ).toBe(trigger);
    expect(trigger).toHaveTextContent(
      en["page.incomeStatement.singleBars"].message,
    );
    expect(onValueChange).toHaveBeenCalledOnce();
  });
});

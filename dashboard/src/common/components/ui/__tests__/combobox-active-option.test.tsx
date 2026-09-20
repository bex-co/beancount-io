import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Combobox } from "../combobox";

/**
 * The visible highlight, the option the input points at, the option that
 * reports itself selected, and the value Enter applies must all be the same
 * option. They used to be two separate models, so the highlight said one year
 * and `aria-selected` said another.
 */

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params?.value ? `${key}:${params.value}` : key,
  }),
}));

const years = [
  { value: "2017", label: "2017" },
  { value: "2016", label: "2016" },
  { value: "2015", label: "2015" },
];

function renderCombobox(props: Partial<Parameters<typeof Combobox>[0]> = {}) {
  const onValueChange = vi.fn();
  render(
    <Combobox
      options={years}
      value=""
      onValueChange={onValueChange}
      allowCustom
      triggerOn="blur"
      placeholder="Time"
      {...props}
    />,
  );
  return { onValueChange };
}

function input() {
  return screen.getByRole("combobox");
}

/** What the input says is active, resolved through the DOM. */
function activeOption() {
  const id = input().getAttribute("aria-activedescendant");
  return id ? document.getElementById(id) : null;
}

function selectedOptions() {
  return screen
    .queryAllByRole("option")
    .filter((o) => o.getAttribute("aria-selected") === "true");
}

describe("Combobox active option", () => {
  it("points at the highlighted option, and only that one reports selected", async () => {
    const user = userEvent.setup();
    renderCombobox();

    await user.click(input());
    await user.keyboard("{ArrowDown}{ArrowDown}");

    // Focus stays on the input, as the combobox pattern requires.
    expect(input()).toHaveFocus();
    expect(activeOption()).toHaveTextContent("2016");
    expect(selectedOptions().map((o) => o.textContent)).toEqual(["2016"]);
  });

  it("applies exactly the option it named", async () => {
    const user = userEvent.setup();
    const { onValueChange } = renderCombobox();

    await user.click(input());
    await user.keyboard("{ArrowDown}{ArrowDown}");
    const named = activeOption()?.textContent;
    await user.keyboard("{Enter}");

    expect(named).toBe("2016");
    expect(onValueChange).toHaveBeenCalledWith("2016");
  });

  it("moves the active option back with ArrowUp", async () => {
    const user = userEvent.setup();
    renderCombobox();

    await user.click(input());
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowUp}");

    expect(activeOption()).toHaveTextContent("2017");
    expect(selectedOptions().map((o) => o.textContent)).toEqual(["2017"]);
  });

  it("points at its own list, and the active option lives in it", async () => {
    const user = userEvent.setup();
    renderCombobox();

    await user.click(input());
    await user.keyboard("{ArrowDown}");

    const listId = input().getAttribute("aria-controls");
    expect(listId).toBeTruthy();
    const list = document.getElementById(listId as string);
    expect(list).toHaveAttribute("role", "listbox");
    expect(list?.contains(activeOption())).toBe(true);
  });

  it("drops the active option when filtering removes every match", async () => {
    const user = userEvent.setup();
    renderCombobox();

    await user.click(input());
    await user.keyboard("{ArrowDown}");
    expect(activeOption()).not.toBeNull();

    await user.type(input(), "zzzz");

    expect(input().getAttribute("aria-activedescendant")).toBeNull();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("drops both references when the popup closes", async () => {
    const user = userEvent.setup();
    renderCombobox();

    await user.click(input());
    await user.keyboard("{ArrowDown}");
    expect(input().getAttribute("aria-controls")).toBeTruthy();

    await user.keyboard("{Escape}");

    expect(input().getAttribute("aria-activedescendant")).toBeNull();
    expect(input().getAttribute("aria-controls")).toBeNull();
  });

  it("keeps two comboboxes' relationships apart", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Combobox
          options={years}
          value=""
          onValueChange={vi.fn()}
          allowCustom
          placeholder="Time"
        />
        <Combobox
          options={[{ value: "Assets:Cash", label: "Assets:Cash" }]}
          value=""
          onValueChange={vi.fn()}
          allowCustom
          placeholder="Account"
        />
      </>,
    );

    const [time, account] = screen.getAllByRole("combobox");
    await user.click(time);
    await user.keyboard("{ArrowDown}");

    const timeList = document.getElementById(
      time.getAttribute("aria-controls") as string,
    );
    expect(timeList).not.toBeNull();
    // The other combobox is closed and claims nothing.
    expect(account.getAttribute("aria-controls")).toBeNull();
    expect(account.getAttribute("aria-activedescendant")).toBeNull();
    // And the active option belongs to the list that named it.
    expect(
      within(timeList as HTMLElement).getByText("2016"),
    ).toBeInTheDocument();
  });

  it("still selects by pointer and still commits a custom value", async () => {
    const user = userEvent.setup();
    const { onValueChange } = renderCombobox();

    await user.click(input());
    await user.click(screen.getByText("2015"));
    expect(onValueChange).toHaveBeenCalledWith("2015");

    onValueChange.mockClear();
    await user.click(input());
    await user.clear(input());
    await user.type(input(), "2016-03");
    await user.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("2016-03");
  });
});

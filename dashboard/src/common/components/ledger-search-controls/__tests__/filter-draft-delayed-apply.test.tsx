import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { SearchControlCombobox } from "../index";

/**
 * A filter applies a commit only when its URL navigation finishes, which can
 * be after the reader has typed on (w4/990). This parent applies each sent
 * value when the test says so, and can change the value itself, as Clear
 * all or Back does.
 */
function setup(triggerOn: "blur" | "change", initial = "2016") {
  const sent: string[] = [];
  const queued: string[] = [];
  let setApplied!: (value: string) => void;
  function Parent() {
    const [applied, apply] = useState(initial);
    setApplied = apply;
    return (
      <SearchControlCombobox
        items={["2016", "2016-08", "2016-09"]}
        selected={applied}
        onChange={(value) => {
          sent.push(value);
          queued.push(value);
        }}
        placeholder="Time"
        allowCustom
        triggerOn={triggerOn}
      />
    );
  }
  render(<Parent />);
  const input = screen.getByRole("combobox");
  return {
    input,
    sent,
    /** The oldest sent value finishes applying. */
    finishNext: () => act(() => setApplied(queued.shift()!)),
    /** The value changes for another reason (Clear all, Back). */
    external: (value: string) => act(() => setApplied(value)),
    type: (value: string) => fireEvent.change(input, { target: { value } }),
    enter: () => fireEvent.keyDown(input, { key: "Enter" }),
  };
}

describe("filter draft while an earlier commit is still applying", () => {
  it("keeps the newer draft when the earlier commit finishes, and commits it next", () => {
    const filter = setup("blur");
    filter.input.focus();
    filter.type("2016-08");
    filter.enter();
    filter.type("2016-09");

    filter.finishNext();
    expect(filter.input).toHaveValue("2016-09");
    expect(filter.input).toHaveFocus();
    expect(filter.sent).toEqual(["2016-08"]);

    filter.enter();
    expect(filter.sent).toEqual(["2016-08", "2016-09"]);
    filter.finishNext();
    expect(filter.input).toHaveValue("2016-09");
  });

  it("keeps a change-mode draft through each late keystroke echo", () => {
    const filter = setup("change", "");
    filter.input.focus();
    filter.type("E");
    filter.type("Ex");
    filter.type("Exp");

    filter.finishNext();
    filter.finishNext();
    expect(filter.input).toHaveValue("Exp");
    filter.finishNext();
    expect(filter.input).toHaveValue("Exp");
  });

  it("still takes a value the filter changes itself, such as Clear all", () => {
    const filter = setup("blur");
    filter.input.focus();
    filter.type("2016-08");
    filter.enter();
    filter.finishNext();
    expect(filter.input).toHaveValue("2016-08");

    filter.type("2016-0");
    filter.external("");
    expect(filter.input).toHaveValue("");
  });

  it("takes a different value that arrives while a commit is pending, such as Back", () => {
    const filter = setup("blur");
    filter.input.focus();
    filter.type("2016-08");
    filter.enter();
    filter.type("2016-09");

    filter.external("2015");
    expect(filter.input).toHaveValue("2015");
    // The superseded commit finishing late is not an echo of the draft.
    filter.finishNext();
    expect(filter.input).toHaveValue("2016-08");
  });
});

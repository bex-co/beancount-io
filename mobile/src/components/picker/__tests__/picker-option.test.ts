import fs from "fs";
import path from "path";
import {
  ITEM_HEIGHT,
  pickerOptionAccessibility,
  wheelIndexAtOffset,
  wheelOffsetForIndex,
} from "../wheel-position";

describe("wheelOffsetForIndex", () => {
  it("lands a tapped option on the offset Confirm reads back as that option", () => {
    for (let index = 0; index < 5; index += 1) {
      expect(wheelIndexAtOffset(wheelOffsetForIndex(index, 5), 5)).toBe(index);
    }
    expect(wheelOffsetForIndex(2, 5)).toBe(2 * ITEM_HEIGHT);
  });

  it("clamps an index outside the item list", () => {
    expect(wheelOffsetForIndex(-1, 3)).toBe(0);
    expect(wheelOffsetForIndex(9, 3)).toBe(2 * ITEM_HEIGHT);
    expect(wheelOffsetForIndex(0, 0)).toBe(0);
  });
});

describe("pickerOptionAccessibility", () => {
  it("announces the highlighted option as a selected button", () => {
    expect(pickerOptionAccessibility("Dark", true)).toEqual({
      accessibilityRole: "button",
      accessibilityLabel: "Dark",
      accessibilityState: { selected: true },
    });
  });

  it("announces the other options as not selected", () => {
    expect(
      pickerOptionAccessibility("Light", false).accessibilityState,
    ).toEqual({ selected: false });
  });
});

/**
 * Static guardrail over the picker itself: the unit runner cannot render it,
 * so this checks that options are tappable buttons and that a tap only moves
 * the pending selection. Calling `onSelect` or `hideModal` from a tap would
 * bypass Confirm and reintroduce the untouched-picker confirmation bug.
 */
describe("picker option wiring", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "index.tsx"),
    "utf8",
  );

  it("renders each option as a pressable button carrying its selected state", () => {
    const start = source.indexOf("const renderItem = useCallback(");
    const renderItem = source.slice(
      start,
      source.indexOf("items.map(renderItem)"),
    );
    expect(start === -1).toBe(false);
    expect(renderItem.includes("<Pressable")).toBe(true);
    expect(renderItem.includes("onPress={() => selectIndex(index)}")).toBe(
      true,
    );
    expect(
      renderItem.includes(
        "{...pickerOptionAccessibility(item.label, isSelected)}",
      ),
    ).toBe(true);
  });

  it("moves the pending selection on tap without confirming or dismissing", () => {
    const start = source.indexOf("const selectIndex = useCallback(");
    const selectIndex = source.slice(
      start,
      source.indexOf("const renderItem", start),
    );
    expect(start === -1).toBe(false);
    expect(selectIndex.includes("setPendingIndex(index)")).toBe(true);
    expect(
      selectIndex.includes("wheelOffsetForIndex(index, items.length)"),
    ).toBe(true);
    expect(selectIndex.includes("onSelect")).toBe(false);
    expect(selectIndex.includes("hideModal")).toBe(false);
  });
});

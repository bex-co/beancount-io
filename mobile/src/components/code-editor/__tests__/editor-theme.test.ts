import { isSameEditorTheme } from "../editor-theme";
import type { EditorTheme } from "@/types/theme-props";

const light: EditorTheme = {
  dark: false,
  background: "#fff",
  foreground: "#111",
  selection: "#cce",
  cursor: "#000",
  lineHighlight: "#eee",
  gutterBackground: "#fafafa",
  gutterForeground: "#888",
  gutterBorder: "#ddd",
  comment: "#999",
  keyword: "#00f",
  string: "#080",
  number: "#808",
  account: "#048",
  tag: "#840",
  currency: "#480",
};

describe("isSameEditorTheme", () => {
  it("treats a re-serialized copy of the same theme as equal", () => {
    // The DOM bridge hands the editor a fresh object on every native render.
    expect(isSameEditorTheme(light, JSON.parse(JSON.stringify(light)))).toBe(
      true,
    );
  });

  it("detects a real theme change", () => {
    expect(
      isSameEditorTheme(light, { ...light, dark: true, background: "#000" }),
    ).toBe(false);
    expect(isSameEditorTheme(light, { ...light, keyword: "#f00" })).toBe(false);
  });
});

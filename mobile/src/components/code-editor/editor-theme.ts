import type { EditorTheme } from "@/types/theme-props";

/**
 * Whether two editor themes paint identically.
 *
 * The editor runs in an Expo DOM component, and the bridge re-serializes every
 * prop on each native render, so `editorTheme` arrives as a NEW object every
 * time the host screen re-renders (keyboard, dirty flag, …). Reference
 * equality would reconfigure CodeMirror's theme compartment on each of those
 * renders, appending dead style modules to the WebView and re-highlighting the
 * document; comparing by value keeps reconfiguration to real theme changes.
 */
export function isSameEditorTheme(a: EditorTheme, b: EditorTheme): boolean {
  if (a === b) return true;
  const keys = Object.keys(a) as (keyof EditorTheme)[];
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => a[key] === b[key]);
}

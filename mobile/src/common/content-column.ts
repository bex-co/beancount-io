import type { ViewStyle } from "react-native";

/**
 * Readable-width caps (w21/1005). Phones never reach them, so they are a
 * no-op there; on iPad they keep content in a centered column instead of
 * running edge to edge.
 */

/** Screen content column: forms, cards, and lists cap here. */
export const readableContentWidth = 640;
/** Bottom sheets cap narrower, like the text-input modal's 400. */
export const sheetContentWidth = 560;

/**
 * A centered column that fills its parent up to `readableContentWidth`.
 * `width: "100%"` keeps `alignSelf: "center"` from shrink-wrapping the
 * content on narrow screens.
 */
export const contentColumn: ViewStyle = {
  width: "100%",
  maxWidth: readableContentWidth,
  alignSelf: "center",
};

/** A centered column that fills its parent up to `sheetContentWidth`. */
export const sheetColumn: ViewStyle = {
  width: "100%",
  maxWidth: sheetContentWidth,
  alignSelf: "center",
};

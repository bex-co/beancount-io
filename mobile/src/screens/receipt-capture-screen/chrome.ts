/**
 * Camera chrome colors.
 *
 * Deliberately theme-independent: a viewfinder has no light mode, so these stay
 * fixed in both light and dark rather than resolving through `useTheme()`.
 * Everything downstream of the camera (the prefilled transaction form) goes back
 * to theme tokens as usual.
 */
export const CHROME = {
  /** Letterbox behind the preview / captured still. */
  background: "#000000",
  /** Circular button behind the X, library and flash icons. */
  buttonFill: "rgba(0, 0, 0, 0.55)",
  icon: "#ffffff",
  /** Dims the still while uploading / parsing so the spinner reads clearly. */
  scrim: "rgba(0, 0, 0, 0.78)",
  /** Retake / Upload pills — translucent dark so they read over any photo. */
  pillFill: "rgba(38, 38, 38, 0.88)",
  pillFillPressed: "rgba(70, 70, 70, 0.92)",
  pillText: "#ffffff",
  shutterFill: "#ffffff",
  shutterRing: "rgba(255, 255, 255, 0.55)",
} as const;

export const CONTROL_SIZE = 48;
export const SHUTTER_SIZE = 74;

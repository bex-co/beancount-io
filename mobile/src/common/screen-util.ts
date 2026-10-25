import { PixelRatio } from "react-native";

// The launch-time `ScreenWidth`/`ScreenHeight` exports are gone: they froze at
// the app's first width, so iPad rotations and Split View resizes never
// reached the charts sized from them (w21/1004). Size from the container via
// `onLayout`, or from `useWindowDimensions()` for a first-frame fallback, and
// stretch with flex instead of computing from the screen.
const onePx = 1 / PixelRatio.get();
const contentPadding = 16;
export { onePx, contentPadding };

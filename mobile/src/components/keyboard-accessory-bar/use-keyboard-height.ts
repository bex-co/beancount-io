import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * Live keyboard height (0 when hidden), shared by the screens that overlay
 * the KeyboardAccessoryBar. Kept out of utils.ts because that module stays
 * import-free for the unit-test runner; this hook needs react-native.
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return keyboardHeight;
}

import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Native stack header content height above a pushed screen. */
const STACK_HEADER_HEIGHT = 44;

/** `keyboardVerticalOffset` for a `KeyboardAvoidingView` filling a pushed
 * stack screen: the header and status bar sit above it on iOS. */
export function useStackKeyboardOffset(): number {
  const insets = useSafeAreaInsets();
  return Platform.OS === "ios" ? insets.top + STACK_HEADER_HEIGHT : 0;
}

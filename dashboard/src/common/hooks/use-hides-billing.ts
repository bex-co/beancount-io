import { useSyncExternalStore } from "react";
import { isAppSession } from "@/common/lib/app-session";
import { useReactNativeContext } from "@/common/providers/react-native-bridge-provider/react-native-bridge-context";

const noSubscription = () => () => {};

/**
 * Whether pricing, billing, and upgrade prompts stay hidden: in the app's web
 * view, and on any page an app opened (ADR 001 D14). The marker is read after
 * hydration, so the server and client agree.
 */
export function useHidesBilling(): boolean {
  const { isReactNative } = useReactNativeContext();
  const appSession = useSyncExternalStore(
    noSubscription,
    isAppSession,
    () => false,
  );
  return isReactNative || appSession;
}

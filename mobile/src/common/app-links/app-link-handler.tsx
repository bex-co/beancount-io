import { useAppLinkHandler } from "./use-app-link-handler";

/** Side-effect mount for universal / app links — renders nothing. */
export function AppLinkHandler(): null {
  useAppLinkHandler();
  return null;
}

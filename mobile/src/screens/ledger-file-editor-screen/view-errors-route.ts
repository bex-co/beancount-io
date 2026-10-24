/**
 * How "View errors" reaches Notifications. Opened from Notifications (the
 * bell's error row), the editor sits above a Notifications screen: `navigate`
 * would still push a second one, since expo-router's stack reuses a route only
 * when it is the top screen, and Back then landed on the editor, three Backs
 * from home (w21/954, reopening w21/544). With one below, pop to it; without,
 * push, because `dismissTo` with none in the stack replaces the editor itself.
 */
export function viewErrorsMove(
  routes: readonly { name?: string }[] | undefined,
  name = "notifications",
): "dismissTo" | "push" {
  return (routes ?? []).some((route) => route.name === name)
    ? "dismissTo"
    : "push";
}

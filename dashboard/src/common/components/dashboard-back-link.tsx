import type { ComponentProps } from "react";
import { Link, useRouter } from "@tanstack/react-router";

/** Return to the previous app entry, with a dashboard link for direct visits. */
export function DashboardBackLink(
  props: Pick<ComponentProps<"a">, "aria-label" | "children" | "className">,
) {
  const { history } = useRouter();
  return (
    <Link
      {...props}
      to="/ledger"
      onClick={(event) => {
        if (
          event.button === 0 &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          history.canGoBack()
        ) {
          event.preventDefault();
          history.back();
        }
      }}
    />
  );
}

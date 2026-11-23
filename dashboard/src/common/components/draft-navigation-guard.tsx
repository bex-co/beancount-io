import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

export function DraftNavigationGuard({
  writing,
  confirm,
}: {
  writing: boolean;
  confirm: () => boolean | Promise<boolean>;
}) {
  const router = useRouter({ warn: false });
  useEffect(
    () =>
      router?.history.block({
        // The browser owns the warning for reloads and document exits.
        enableBeforeUnload: true,
        // Keep the draft in place while its write is in flight.
        blockerFn: () => writing || confirm(),
      }),
    [router, writing, confirm],
  );
  return null;
}

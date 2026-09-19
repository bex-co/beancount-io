import { useTranslations } from "@/common/hooks/use-translations";

/**
 * Shown when the client scripts never arrive.
 *
 * The credential forms keep their submit button disabled until React attaches,
 * so without scripts the fields accept typing but nothing happens. This says
 * why, and `<noscript>` is the right carrier because it needs no hydration —
 * which is exactly the state being described.
 */
export function ScriptRequiredNotice() {
  const { t } = useTranslations();
  return (
    <noscript>
      <p className="text-sm text-destructive" role="alert">
        {t("auth.scriptRequired")}
      </p>
    </noscript>
  );
}

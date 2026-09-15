import { useTranslations } from "@/common/hooks/use-translations";
import { focusMainContent, MAIN_CONTENT_ID } from "@/common/lib/main-content";
import { cn } from "@/common/lib/utils/utils";

/**
 * First focusable control in the ledger and dashboard shells. Visually hidden
 * until focused; activating it focuses `#main-content` so Tab continues inside
 * the page body instead of the sidebar.
 */
export function SkipToContentLink({ className }: { className?: string }) {
  const { t } = useTranslations();

  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className={cn(
        // Off-screen until focused; then a fixed, high-z chip that does not
        // shift layout. Reuses the same ring treatment as other focusable UI.
        "sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]",
        "focus:rounded-md focus:border focus:border-input focus:bg-background",
        "focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      onClick={(event) => {
        event.preventDefault();
        focusMainContent();
      }}
    >
      {t("common.skipToContent")}
    </a>
  );
}

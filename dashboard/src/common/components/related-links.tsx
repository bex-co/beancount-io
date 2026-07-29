import { Link } from "@tanstack/react-router";
import { useTranslations } from "@/common/hooks/use-translations";

interface RelatedLinksProps {
  links: Array<{
    label: string;
    to: string;
  }>;
}

/**
 * Related links component that appears at the bottom of pages
 * Provides "See Also" style navigation for SEO and user discovery
 *
 * Design: Subtle, unobtrusive link section with minimal styling
 */
export function RelatedLinks({ links }: RelatedLinksProps) {
  const { t } = useTranslations();

  if (!links || links.length === 0) {
    return null;
  }

  return (
    <nav
      className="mt-12 pt-6 border-t border-border/50"
      aria-label={t("common.relatedPages")}
    >
      <h2 className="text-xs font-medium text-muted-foreground/70">
        {t("common.seeAlso")}
      </h2>
      <div className="flex flex-wrap gap-x-4 py-4">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline decoration-muted-foreground/30 hover:decoration-foreground/50 underline-offset-4"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

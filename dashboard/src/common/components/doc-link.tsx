import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";

/**
 * An inline link out to a documentation page, for the end of a description.
 *
 * It inherits the surrounding text's size and colour so it reads as part of
 * the sentence; the underline and the icon are what mark it as a link that
 * opens elsewhere.
 */
export function DocLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2 inline-flex items-center gap-1 hover:text-foreground"
    >
      {children}
      <ExternalLink className="h-3 w-3" aria-hidden="true" />
    </a>
  );
}

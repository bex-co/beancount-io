import { HeadContent, Scripts } from "@tanstack/react-router";
import { ThemeScript } from "@/common/components/document/theme-script";
import { GoogleAnalytics } from "@/common/analytics";
import { useTranslation } from "react-i18next";

export function ShellComponent({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  const { i18n } = useTranslation();
  return (
    // i18next already knows which languages read right-to-left, so the
    // document declares its direction beside its language from the first
    // server render — not after hydration, which would reflow the page under
    // the reader.
    <html lang={i18n.language} dir={i18n.dir()} suppressHydrationWarning>
      <head>
        <ThemeScript />
        {/* GoogleAnalytics self-gates on a configured measurement ID */}
        <GoogleAnalytics />
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { HeadContent, Scripts } from "@tanstack/react-router";
import { ThemeScript } from "@/common/components/document/theme-script";
import { GoogleAnalytics } from "@/common/analytics";
import i18n from "@/i18n/init";

export function ShellComponent({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <html lang={i18n.language} suppressHydrationWarning>
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

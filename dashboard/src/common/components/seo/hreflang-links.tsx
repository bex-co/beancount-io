import { useLocation } from "@tanstack/react-router";
import { createHreflangLinks } from "@/common/lib/seo/hreflang";

/** React hoists these links on pages whose components own their metadata. */
export function HreflangLinks() {
  const { pathname } = useLocation();
  return (
    <>
      {createHreflangLinks(pathname).map((link) => (
        <link key={link.hrefLang} {...link} />
      ))}
    </>
  );
}

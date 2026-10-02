import { trimPathRight } from "@tanstack/react-router";
import type { RouterContext } from "@/common/types/router-context";
import {
  GetLedgerDocument,
  GetLedgerFileDocument,
} from "@/graphql/definitions";
import {
  decodeLedgerReadme,
  type InitialLedgerReadme,
} from "@/common/lib/ledger-readme";
import { createLedgerId } from "@/common/lib/utils/encode";
import { getSEOMetadata, createHeadMeta } from "./seo-helpers";
import { createHreflangLinks } from "./hreflang";
import { resolveLedgerPresentation } from "./ledger-presentation";
import { withLedgerFileTitlePrefix } from "./ledger-file-title";
import { SOCIAL_IMAGE } from "./social-image";
import {
  getSelfCanonicalUrl,
  getLedgerAgentCanonicalUrl,
  getLedgerCommitCanonicalUrl,
  getLedgerEntryCanonicalUrl,
  getLedgerFileCanonicalUrl,
} from "./indexability";

type HeadMatch = {
  context: RouterContext;
  pathname: string;
  search: object;
  routeId?: string;
};

/** The router owns the complete ledger head during SSR and navigation. */
export function createLedgerHead(
  {
    match,
    params,
    loaderData,
    matches,
  }: {
    match: HeadMatch;
    params: { ledgerOwner: string; ledgerName: string; [key: string]: string };
    loaderData?: unknown;
    matches?: ReadonlyArray<{ status: string; globalNotFound?: boolean }>;
  },
  seoKey: string,
  options: { noIndex?: boolean } = {},
) {
  // Error components own their metadata. Never retain a public title or
  // canonical from an inaccessible ledger when a parent loader rejects it.
  if (
    matches?.some(
      (item) =>
        item.status === "error" ||
        item.status === "notFound" ||
        item.globalNotFound,
    )
  ) {
    return { meta: [], links: [] };
  }
  const { i18n } = match.context.localization;
  const ledgerId = createLedgerId(params.ledgerOwner, params.ledgerName);
  const ledger = match.context.client.readQuery({
    query: GetLedgerDocument,
    variables: { ledgerId },
  })?.getLedger;
  const overview = seoKey === "ledgerOverview";
  // Entry links deliberately use generic metadata, never transaction content.
  const translated = getSEOMetadata(
    i18n,
    `seo.${seoKey}.title`,
    `seo.${seoKey}.description`,
    {
      ...params,
      ledgerName: ledger?.name ?? params.ledgerName,
      shortSha: params.commitSha?.slice(0, 7) ?? "",
    },
    {
      customDescription:
        seoKey === "ledgerEntry" ? undefined : ledger?.description?.trim(),
    },
  );
  const snapshot = (
    loaderData as
      | {
          readme?: InitialLedgerReadme;
        }
      | undefined
  )?.readme;
  // Client navigation can reuse a previously fetched README. A settled SSR
  // snapshot (including unavailable) must keep its original hydration result.
  const cachedReadme =
    overview && snapshot === undefined
      ? match.context.client.readQuery({
          query: GetLedgerFileDocument,
          variables: { ledgerId, path: "README.md" },
        })?.getLedgerFile?.content
      : undefined;
  const presentation = resolveLedgerPresentation({
    name: ledger?.name ?? params.ledgerName,
    title: ledger?.options.title,
    description: ledger?.description,
    readme:
      snapshot?.ledgerId === ledgerId &&
      snapshot.path === "README.md" &&
      snapshot.status === "ready"
        ? snapshot.content
        : snapshot === undefined
          ? decodeLedgerReadme(cachedReadme)
          : undefined,
    fallbackDescription: translated.description,
  });
  const metadata =
    overview && ledger?.private === false ? presentation : translated;
  const isFileBlob = match.routeId?.endsWith("/files/blob/$branch/$");
  const title = withLedgerFileTitlePrefix(
    isFileBlob ? (params._splat ?? "") : "",
    metadata.title,
  );
  const { description } = metadata;
  const noIndex = Boolean(options.noIndex || ledger?.private);
  // Index matches retain a slash even though the router's default URL policy
  // removes it. Canonicals and alternates use that public URL spelling.
  const pathname = trimPathRight(match.pathname);
  const canonicalLocation = {
    pathname,
    search: match.search as Record<string, unknown>,
  };
  let canonical: string | undefined;
  if (seoKey === "ledgerAsk") canonical = getLedgerAgentCanonicalUrl(params);
  else if (params.commitSha)
    canonical = getLedgerCommitCanonicalUrl({
      ...params,
      commitSha: params.commitSha,
    });
  else if (params.entryHash)
    canonical = getLedgerEntryCanonicalUrl({
      ...params,
      entryHash: params.entryHash,
    });
  else if (isFileBlob) {
    canonical = getLedgerFileCanonicalUrl({
      ...params,
      branch: params.branch || "main",
      filePath: params._splat || "",
    });
  } else if (!noIndex) canonical = getSelfCanonicalUrl(canonicalLocation);

  const meta: Array<Record<string, string>> = [
    ...createHeadMeta(i18n, { title, description }, { noIndex }).meta,
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: SOCIAL_IMAGE.url },
    { property: "og:image:type", content: SOCIAL_IMAGE.type },
    { property: "og:image:width", content: SOCIAL_IMAGE.width },
    { property: "og:image:height", content: SOCIAL_IMAGE.height },
    { property: "og:image:alt", content: SOCIAL_IMAGE.alt },
    { name: "twitter:card", content: SOCIAL_IMAGE.card },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: SOCIAL_IMAGE.url },
    { name: "twitter:image:alt", content: SOCIAL_IMAGE.alt },
  ];
  if (ledger?.private === false)
    meta.push({
      name: "apple-itunes-app",
      content: `app-id=1527950512, app-argument=${canonical ?? getSelfCanonicalUrl(canonicalLocation)}`,
    });
  const links: Array<{ rel: string; href: string; hrefLang?: string }> = [];
  if (canonical) links.push({ rel: "canonical", href: canonical });
  if (!noIndex) links.push(...createHreflangLinks(pathname));
  return { meta, links };
}

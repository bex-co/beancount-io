/** Public ledger prose shared by the visible overview and its document head. */
export function resolveLedgerPresentation({
  name,
  title,
  description,
  readme,
  fallbackDescription,
}: {
  name: string;
  title?: string | null;
  description?: string | null;
  readme?: string | null;
  fallbackDescription: string;
}) {
  return {
    title: title?.trim() || name,
    description:
      description?.trim() || readmeIntroduction(readme) || fallbackDescription,
  };
}

function readmeIntroduction(markdown?: string | null): string {
  if (!markdown) return "";
  // Do not mistake frontmatter, code examples, headings, badges or tables for
  // an introduction. The original Markdown remains the visible source of truth.
  const prose = markdown
    .replace(/^---\s*\n[\s\S]*?\n---\s*(?:\n|$)/, "")
    .replace(/<!--[^]*?-->/g, "")
    .replace(
      /^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\1[^\n]*(?:\n|$)/gm,
      "",
    );
  for (const block of prose.split(/\n\s*\n/)) {
    const trimmed = block.trim();
    if (
      !trimmed ||
      /^(?:#{1,6}\s|>|[-*+]\s|\d+[.)]\s|\||!\[|<|\[.*\]:)/.test(trimmed) ||
      /\n\s*(?:={3,}|-{3,})\s*$/.test(trimmed)
    )
      continue;
    const text = trimmed
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
      .replace(/<[^>]*>/g, "")
      .replace(/[`*_~]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text)
      return text.length > 240 ? `${text.slice(0, 237).trimEnd()}…` : text;
  }
  return "";
}

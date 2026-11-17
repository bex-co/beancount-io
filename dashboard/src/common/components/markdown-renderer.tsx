import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { CodeBlock, type CodeAttributes } from "@/common/components/code-block";
import { ExternalLink } from "lucide-react";
import type { Components } from "react-markdown";
import { useMemo, type ComponentProps, type ReactNode } from "react";
import { LedgerImage } from "@/common/components/ledger-image";
import {
  getLedgerDirectoryTreePath,
  getLedgerFileBlobPath,
} from "@/common/hooks/use-file-navigate";
import { resolveReadmeReference } from "@/common/lib/readme-reference";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  /** Nest a document under its containing page's heading, without editing it. */
  headingOffset?: number;
  /**
   * The ledger file this Markdown was read from. Its relative links then open
   * the files they name and its relative images show those files' bytes,
   * resolved from its folder (w4/m37). Other Markdown keeps authored URLs.
   */
  source?: { ledgerId: string; path: string };
}

const headingTags = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: {
    className?: unknown;
    id?: unknown;
    name?: unknown;
    href?: unknown;
    dir?: unknown;
  };
  children?: HastNode[];
}

/** rehype-sanitize's DOM-clobbering guard prefix for authored ids and names. */
const CLOBBER_PREFIX = "user-content-";

function hastElements(node: HastNode, found: HastNode[] = []): HastNode[] {
  if (node.type === "element") found.push(node);
  for (const child of node.children ?? []) hastElements(child, found);
  return found;
}

/**
 * Sanitizing prefixes an authored `id="target"` to `user-content-target` but
 * leaves `[jump](#target)` alone, so the link went nowhere (w4/282). Point a
 * fragment-only link at the prefixed id when this document has that id and
 * not the bare one; a missing target, or one already written with the prefix,
 * keeps its authored href.
 */
function rehypeLinkSanitizedFragments() {
  return (tree: HastNode) => {
    const elements = hastElements(tree);
    const targets = new Set(
      elements.flatMap(({ properties }) =>
        [properties?.id, properties?.name].filter(
          (value): value is string => typeof value === "string",
        ),
      ),
    );
    for (const element of elements) {
      const href = element.properties?.href;
      if (element.tagName !== "a" || typeof href !== "string") continue;
      if (!href.startsWith("#")) continue;
      let fragment: string;
      try {
        fragment = decodeURIComponent(href.slice(1));
      } catch {
        continue;
      }
      if (targets.has(fragment) || !targets.has(CLOBBER_PREFIX + fragment)) {
        continue;
      }
      element.properties!.href = `#${CLOBBER_PREFIX}${href.slice(1)}`;
    }
  };
}

/**
 * The sanitized id and an authored direction of a code element. The code
 * overrides rebuild their elements, which dropped both: a README link to a
 * code block reached nothing, and `dir="ltr"` code read backwards in an RTL
 * page (w4/303). The id already carries the sanitizer's prefix.
 */
function codeAttributes(node: HastNode | undefined): CodeAttributes {
  const { id, dir } = node?.properties ?? {};
  return {
    id: typeof id === "string" ? id : undefined,
    dir: dir === "ltr" || dir === "rtl" || dir === "auto" ? dir : undefined,
  };
}

function hastText(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(hastText).join("");
}

const components: Components = {
  // A block is the parsed <pre>, whatever its language: an unlabelled fence
  // or an indented block has no `language-` class, and treating that as
  // inline collapsed the author's lines (w4/269). The `code` override below
  // therefore only ever sees inline spans.
  pre({ children, node }) {
    const pre = node as HastNode | undefined;
    const code = pre?.children?.find(
      (child) => child.type === "element" && child.tagName === "code",
    );
    if (!code) return <pre {...codeAttributes(pre)}>{children}</pre>;
    const classes = code.properties?.className;
    const languageClass = (Array.isArray(classes) ? classes : [])
      .map(String)
      .find((name) => name.startsWith("language-"));
    return (
      <CodeBlock
        code={hastText(code).replace(/\n$/, "")}
        language={languageClass?.slice("language-".length)}
        inline={false}
        preAttributes={codeAttributes(pre)}
        codeAttributes={codeAttributes(code)}
      />
    );
  },

  code({ children, node }) {
    return (
      <CodeBlock
        code={String(children)}
        inline
        codeAttributes={codeAttributes(node as HastNode | undefined)}
      />
    );
  },

  a({ children, href, ...props }) {
    const isExternal = href?.startsWith("http");
    return (
      <a
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className="underline hover:opacity-80 inline-flex items-center gap-1 font-medium"
        {...props}
      >
        {children}
        {isExternal && <ExternalLink className="h-3 w-3" />}
      </a>
    );
  },

  table({ children, ...props }) {
    return (
      <div className="overflow-x-auto my-4 max-w-full">
        <table className="min-w-full border-collapse" {...props}>
          {children}
        </table>
      </div>
    );
  },

  th({ children, ...props }) {
    return (
      <th
        className="border border-border px-4 py-2 bg-muted font-semibold text-start"
        {...props}
      >
        {children}
      </th>
    );
  },

  td({ children, ...props }) {
    return (
      <td className="border border-border px-4 py-2 text-start" {...props}>
        {children}
      </td>
    );
  },

  blockquote({ children, ...props }) {
    return (
      <blockquote
        className="border-l-4 border-current/20 pl-4 my-4 italic opacity-80"
        {...props}
      >
        {children}
      </blockquote>
    );
  },

  ul({ children, ...props }) {
    return (
      <ul className="list-disc ml-6 my-3 space-y-1" {...props}>
        {children}
      </ul>
    );
  },

  ol({ children, ...props }) {
    return (
      <ol className="list-decimal ml-6 my-3 space-y-1" {...props}>
        {children}
      </ol>
    );
  },

  h1({ children, ...props }) {
    return (
      <h1 className="text-2xl font-semibold mt-6 mb-3" {...props}>
        {children}
      </h1>
    );
  },

  h2({ children, ...props }) {
    return (
      <h2 className="text-xl font-semibold mt-6 mb-3" {...props}>
        {children}
      </h2>
    );
  },

  h3({ children, ...props }) {
    return (
      <h3 className="text-lg font-semibold mt-6 mb-3" {...props}>
        {children}
      </h3>
    );
  },

  p({ children, ...props }) {
    return (
      <p className="my-3 leading-relaxed" {...props}>
        {children}
      </p>
    );
  },
};

function sourceComponents({
  ledgerId,
  path,
}: NonNullable<MarkdownRendererProps["source"]>): Components {
  const Anchor = components.a as (props: ComponentProps<"a">) => ReactNode;
  return {
    a({ href, ...props }) {
      delete props.node;
      const target = resolveReadmeReference(href, path);
      return (
        <Anchor
          {...props}
          href={
            !target
              ? href
              : target.directory
                ? getLedgerDirectoryTreePath(
                    ledgerId,
                    target.path,
                    target.suffix,
                  )
                : getLedgerFileBlobPath(ledgerId, target.path, target.suffix)
          }
        />
      );
    },
    img({ src, alt, title, ...props }) {
      delete props.node;
      const target =
        typeof src === "string" ? resolveReadmeReference(src, path) : null;
      // A folder is no image to fetch; it keeps its authored behavior.
      if (!target || target.directory) {
        return <img src={src} alt={alt} title={title} {...props} />;
      }
      return (
        <LedgerImage
          ledgerId={ledgerId}
          path={target.path}
          alt={alt}
          title={title}
        />
      );
    },
  };
}

export function MarkdownRenderer({
  content,
  className,
  headingOffset = 0,
  source,
}: MarkdownRendererProps) {
  const sourceLedgerId = source?.ledgerId;
  const sourcePath = source?.path;
  const renderedComponents = useMemo<Components>(() => {
    const base =
      sourceLedgerId !== undefined && sourcePath !== undefined
        ? {
            ...components,
            ...sourceComponents({ ledgerId: sourceLedgerId, path: sourcePath }),
          }
        : components;
    if (!headingOffset) return base;
    return {
      ...base,
      ...Object.fromEntries(
        headingTags.map((tag, index) => {
          const Heading =
            headingTags[Math.min(5, Math.max(0, index + headingOffset))];
          return [
            tag,
            function NestedHeading({
              children,
              ...headingProps
            }: ComponentProps<"h1"> & { node?: unknown }) {
              delete headingProps.node;
              return (
                <Heading className="font-semibold mt-6 mb-3" {...headingProps}>
                  {children}
                </Heading>
              );
            },
          ];
        }),
      ),
    };
  }, [headingOffset, sourceLedgerId, sourcePath]);
  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-full overflow-x-auto break-words ${className ?? ""}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[
          rehypeRaw,
          rehypeSanitize,
          rehypeLinkSanitizedFragments,
        ]}
        components={renderedComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

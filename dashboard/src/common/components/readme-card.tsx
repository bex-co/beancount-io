import { useEffect, useId, useRef, useState } from "react";
import { useLedgerReadme } from "@/common/hooks/use-ledger-readme";
import type { InitialLedgerReadme } from "@/common/lib/ledger-readme";
import { MarkdownRenderer } from "@/common/components/markdown-renderer";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { Skeleton } from "@/common/components/ui/skeleton";
import { LedgerWritePermission } from "@/common/components/ledger-permission/write";
import { useFileNavigate } from "@/common/hooks/use-file-navigate";
import { useTranslations } from "@/common/hooks/use-translations";
import { BookOpen, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { cn } from "@/common/lib/utils/utils";

interface ReadmeCardProps {
  ledgerId: string;
  path?: string;
  initialReadme?: InitialLedgerReadme;
  headingOffset?: number;
  /**
   * Opens on the notes' first lines, with a button to read on. For a page
   * where the notes follow other content; never for one a reader may open
   * without JavaScript, who could not expand them.
   */
  collapse?: { more: string; less: string };
}

export function ReadmeCard({
  ledgerId,
  path = "README.md",
  initialReadme,
  headingOffset = 0,
  collapse,
}: ReadmeCardProps) {
  const fileNavigate = useFileNavigate();
  const { t } = useTranslations();
  const { content, loading } = useLedgerReadme(ledgerId, initialReadme, path);
  const [expanded, setExpanded] = useState(false);
  // Only notes taller than the preview get the button.
  const [overflows, setOverflows] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const bodyId = useId();
  const collapsible = Boolean(collapse);
  const collapsed = collapsible && !expanded;
  useEffect(() => {
    const element = body.current;
    if (!collapsible || !element) return;
    const measure = () =>
      setOverflows(element.scrollHeight > element.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [collapsible, content, expanded]);

  const displayName = path.split("/").pop() ?? path;

  if (loading) {
    return (
      <Card className="gap-0 py-0">
        <div className="flex items-center justify-between px-4 py-2 border-b text-sm font-medium text-muted-foreground">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            {displayName}
          </div>
          <LedgerWritePermission>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                fileNavigate(ledgerId, "file", path, { editMode: true })
              }
              title={t("common.edit")}
            >
              <Pencil className="h-3.5 w-3.5 cursor-pointer" />
            </Button>
          </LedgerWritePermission>
        </div>
        <CardContent className="px-4 py-4">
          <div className="space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!content) return null;

  return (
    <Card className="gap-0 py-0">
      <div className="flex items-center justify-between px-4 py-2 border-b text-sm font-medium text-muted-foreground">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          {displayName}
        </div>
        <LedgerWritePermission>
          <button
            onClick={() =>
              fileNavigate(ledgerId, "file", path, { editMode: true })
            }
            className="p-1 rounded hover:bg-muted transition-colors"
            title={t("common.edit")}
          >
            <Pencil className="h-3.5 w-3.5 cursor-pointer" />
          </button>
        </LedgerWritePermission>
      </div>
      <CardContent className="px-4 py-4">
        <div
          ref={body}
          id={bodyId}
          className={cn("relative", collapsed && "max-h-52 overflow-hidden")}
        >
          <MarkdownRenderer
            content={content}
            headingOffset={headingOffset}
            source={{ ledgerId, path }}
          />
          {collapsed && overflows && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent"
            />
          )}
        </div>
        {collapse && (overflows || expanded) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 -ml-2"
            aria-expanded={expanded}
            aria-controls={bodyId}
            onClick={() => setExpanded((open) => !open)}
          >
            {expanded ? collapse.less : collapse.more}
            {expanded ? <ChevronUp /> : <ChevronDown />}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

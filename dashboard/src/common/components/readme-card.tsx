import { useQuery } from "@apollo/client/react";
import { GetLedgerFileDocument } from "@/graphql/definitions";
import { base64Decode } from "@/common/lib/utils/encode";
import { MarkdownRenderer } from "@/common/components/markdown-renderer";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { Skeleton } from "@/common/components/ui/skeleton";
import { LedgerWritePermission } from "@/common/components/ledger-permission/write";
import { useFileNavigate } from "@/common/hooks/use-file-navigate";
import { useTranslations } from "@/common/hooks/use-translations";
import { BookOpen, Pencil } from "lucide-react";

interface ReadmeCardProps {
  ledgerId: string;
  path?: string;
}

export function ReadmeCard({ ledgerId, path = "README.md" }: ReadmeCardProps) {
  const fileNavigate = useFileNavigate();
  const { t } = useTranslations();
  const { data, loading, error } = useQuery(GetLedgerFileDocument, {
    variables: { ledgerId, path },
    fetchPolicy: "cache-first",
  });

  // Silent failure — README is optional
  if (error) return null;

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

  const content = data?.getLedgerFile?.content;
  if (!content) return null;

  let decoded: string;
  try {
    decoded = base64Decode(content);
  } catch {
    return null;
  }

  if (!decoded.trim()) return null;

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
        <MarkdownRenderer content={decoded} />
      </CardContent>
    </Card>
  );
}

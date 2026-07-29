import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { FileText } from "lucide-react";
import { useTranslations } from "@/common/hooks/use-translations";

interface PRFileChange {
  filename: string;
  additions: number;
  deletions: number;
  changes: number;
}

interface PRFileListProps {
  files: PRFileChange[];
}

export function PRFileList({ files }: PRFileListProps) {
  const { t } = useTranslations();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("pullRequests.filesChanged")} ({files.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.filename}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{file.filename}</span>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-green-600">+{file.additions}</span>
                <span className="text-red-600">-{file.deletions}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

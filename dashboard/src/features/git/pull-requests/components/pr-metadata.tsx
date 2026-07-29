import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Badge } from "@/common/components/ui/badge";
import { GitPullRequest } from "lucide-react";

interface PRMetadataProps {
  title: string;
  number: number;
  state: string;
  author: string;
  headBranch: string;
  baseBranch: string;
  description: string;
}

export function PRMetadata({
  title,
  number,
  state,
  author,
  headBranch,
  baseBranch,
  description,
}: PRMetadataProps) {
  // Tinted background + same-hue text, so contrast holds in both themes
  // (a solid brand fill would leave light-on-light text in dark mode).
  const stateColor =
    state === "open"
      ? "bg-gain/15 text-gain"
      : state === "merged"
        ? "bg-chart-4/15 text-chart-4"
        : "bg-muted text-muted-foreground";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GitPullRequest className="h-6 w-6" />
            <CardTitle>{title}</CardTitle>
            <Badge className={stateColor}>{state}</Badge>
          </div>
          <span className="text-sm text-muted-foreground">#{number}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 text-sm">
          <span>
            <strong>Author:</strong> {author}
          </span>
          <span>
            <strong>From:</strong> {headBranch}
          </span>
          <span>
            <strong>To:</strong> {baseBranch}
          </span>
        </div>
        {description && (
          <div className="whitespace-pre-wrap text-sm text-muted-foreground">
            {description}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

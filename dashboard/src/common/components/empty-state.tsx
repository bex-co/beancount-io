import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FileSpreadsheet } from "lucide-react";
import { Card, CardContent } from "@/common/components/ui/card";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  iconName?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  iconName,
  action,
  className,
}: EmptyStateProps) {
  const Icon: LucideIcon =
    iconName && iconName in Icons
      ? (Icons[iconName as keyof typeof Icons] as LucideIcon)
      : FileSpreadsheet;

  return (
    <Card className={className}>
      <CardContent className="flex items-center justify-center py-16">
        <div className="text-center">
          <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
            <Icon className="size-7 text-muted-foreground" aria-hidden="true" />
          </span>
          <p className="font-medium mb-1">{title}</p>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
          {action ? (
            <div className="mt-5 flex justify-center">{action}</div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

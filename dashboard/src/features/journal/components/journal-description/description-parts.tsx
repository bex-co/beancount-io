import type { ReactNode } from "react";

export function DescriptionParts({
  primary,
  detail,
  compact,
}: {
  primary: ReactNode;
  detail?: ReactNode;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <>
        {primary}
        {detail && <> · {detail}</>}
      </>
    );
  }

  return (
    <div className="flex-1 overflow-hidden px-2">
      <div>{primary}</div>
      {detail && (
        <div className="text-sm break-words text-muted-foreground">
          {detail}
        </div>
      )}
    </div>
  );
}

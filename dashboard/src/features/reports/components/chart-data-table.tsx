import { useId, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Table } from "@/common/components/ui/table";

/** The same native, named disclosure for chart text alternatives. */
export function ChartDataTable({
  summary,
  labelledBy,
  label,
  children,
}: {
  summary: string;
  children: ReactNode;
} & (
  | { labelledBy: string; label?: never }
  | { label: string; labelledBy?: never }
)) {
  const summaryId = useId();
  return (
    // A quiet text disclosure, not a bordered box: closed, a bordered row
    // read as an empty text field. The table takes the border once open.
    <details className="group mt-3">
      <summary
        id={summaryId}
        className="-mx-2 inline-flex cursor-pointer list-none items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground outline-none select-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden"
      >
        <ChevronRight
          aria-hidden="true"
          className="size-4 transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none"
        />
        {summary}
      </summary>
      <div className="mt-2 overflow-x-auto rounded-lg border">
        <Table
          aria-labelledby={
            labelledBy ? `${labelledBy} ${summaryId}` : undefined
          }
          aria-label={label ? `${label} ${summary}` : undefined}
        >
          {children}
        </Table>
      </div>
    </details>
  );
}

import { useId, type ComponentType, type ReactNode } from "react";
import { Table } from "@/common/components/ui/table";

/**
 * The shell every statistics table sits in: heading, description, and the
 * scroll wrappers around the table.
 *
 * Each of these sections renders the shell twice — once while loading and once
 * with data — so the layout existed six times and the accessible name six
 * times with it. Minting the heading id here and putting it on the `Table`
 * makes that naming structural: a section cannot render its table without it.
 */
export function StatisticsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: ReactNode;
  description: ReactNode;
  /** The table's own header and body rows. */
  children: ReactNode;
}) {
  const headingId = useId();

  return (
    <div>
      <h3
        id={headingId}
        className="flex items-center gap-2 text-lg font-semibold mb-2"
      >
        <Icon className="h-5 w-5" />
        {title}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <div className="overflow-hidden w-full">
        <div className="overflow-x-auto">
          <Table aria-labelledby={headingId}>{children}</Table>
        </div>
      </div>
    </div>
  );
}

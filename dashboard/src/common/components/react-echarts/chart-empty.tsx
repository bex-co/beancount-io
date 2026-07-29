interface ChartEmptyProps {
  height?: string;
  message?: string;
}

/**
 * Empty chart state component
 * Displays a message when a chart has no data to display
 */
export function ChartEmpty({
  height = "250px",
  message = "Chart is empty.",
}: ChartEmptyProps) {
  return (
    <div className="w-full" style={{ height }}>
      <div className="text-center text-muted-foreground flex items-center justify-center h-full">
        {message}
      </div>
    </div>
  );
}

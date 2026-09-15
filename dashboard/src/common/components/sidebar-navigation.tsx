/**
 * Labelled navigation landmark for a primary sidebar shell.
 *
 * Kept at the composing level (not inside the shared Sidebar primitive) so
 * non-navigation Sidebar consumers do not falsely expose a landmark.
 */
export function SidebarNavigation({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <nav aria-label={label} className="flex h-full min-h-0 w-full flex-col">
      {children}
    </nav>
  );
}

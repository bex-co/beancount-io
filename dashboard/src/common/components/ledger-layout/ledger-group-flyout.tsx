import { type ElementType, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/common/components/ui/sidebar.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/common/components/ui/popover.tsx";

interface FlyoutItem {
  id: string;
  label: string;
  path: string;
}

interface LedgerGroupFlyoutProps {
  label: string;
  icon: ElementType;
  items: FlyoutItem[];
  currentPath: string;
  isActive: boolean;
  onNavigate: () => void;
}

/** Delay before closing on pointer-leave, so moving across the gap between the
 *  rail icon and the flyout doesn't dismiss it. */
const CLOSE_DELAY_MS = 120;

/**
 * Collapsed-rail rendering of a sidebar group. In the icon rail the inline
 * submenu is hidden, so the group icon would otherwise be a dead click. Here it
 * opens a flyout — on hover, click, or keyboard — that lists the group's
 * destinations beside the rail, keeping every icon actionable and every section
 * reachable while collapsed.
 */
export function LedgerGroupFlyout({
  label,
  icon: Icon,
  items,
  currentPath,
  isActive,
  onNavigate,
}: LedgerGroupFlyoutProps) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const openNow = () => {
    cancelClose();
    setOpen(true);
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  // Drop any pending close timer if the flyout unmounts (e.g. the sidebar
  // expands out of the icon rail) so it can't fire on an unmounted component.
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  return (
    <SidebarMenuItem onPointerEnter={openNow} onPointerLeave={scheduleClose}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <SidebarMenuButton isActive={isActive} aria-label={label}>
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </SidebarMenuButton>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={8}
          onPointerEnter={openNow}
          onPointerLeave={scheduleClose}
          className="w-56 p-1"
        >
          <div className="px-2 py-1.5 text-xs font-medium text-sidebar-foreground/70">
            {label}
          </div>
          <ul className="flex flex-col gap-0.5">
            {items.map((item) => (
              <SidebarMenuSubItem key={item.id}>
                <SidebarMenuSubButton
                  asChild
                  isActive={currentPath === item.path}
                >
                  <Link
                    to={item.path}
                    onClick={() => {
                      onNavigate();
                      setOpen(false);
                    }}
                  >
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </SidebarMenuItem>
  );
}

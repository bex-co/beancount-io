import {
  type ElementType,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/common/components/ui/sidebar.tsx";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/common/components/ui/popover.tsx";
import { EXACT_PAGE_LINK } from "@/common/lib/navigation/active-options";
import { restoreFocusOnDialogClose } from "@/common/lib/focus/restore-focus-on-dialog-close";

interface FlyoutItem {
  id: string;
  label: string;
  path: string;
}

interface LedgerSidebarGroupProps {
  label: string;
  icon: ElementType;
  items: FlyoutItem[];
  currentPath: string;
  isActive: boolean;
  onNavigate: () => void;
  inRail: boolean;
  inlineOpen: boolean;
  onInlineToggle: () => void;
  badge?: number;
  destructiveBadge?: boolean;
  children?: ReactNode;
  /**
   * The group's own first page (Reports → Income Statement). With one, the
   * icon goes there, as the group's label does in the full sidebar; the
   * destinations still open beside it on hover, or from the keyboard with
   * the right or down arrow.
   */
  landingPath?: string;
}

/** Delay before closing on pointer-leave, so moving across the gap between the
 *  rail icon and the flyout doesn't dismiss it. */
const CLOSE_DELAY_MS = 120;

/**
 * Keep the group control across sidebar widths so it retains keyboard focus.
 * Its destinations open inline in the full sidebar and as a flyout in the rail.
 * A group with a landing page keeps its link and opens the flyout on hover or
 * with the arrow keys.
 */
export function LedgerSidebarGroup({
  label,
  icon: Icon,
  items,
  currentPath,
  isActive,
  onNavigate,
  landingPath,
  inRail,
  inlineOpen,
  onInlineToggle,
  badge,
  destructiveBadge,
  children,
}: LedgerSidebarGroupProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const submenuId = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openerRef = useRef<HTMLElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const openedByHover = useRef(false);
  const interactedOutside = useRef(false);
  const setOpener = useCallback((element: HTMLElement | null) => {
    openerRef.current = element;
  }, []);
  if (!inRail && open) setOpen(false);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const openNow = (source: "hover" | "activation") => {
    cancelClose();
    if (open && source === "hover") return;
    openedByHover.current = source === "hover";
    interactedOutside.current = false;
    // A click or arrow key can take over a panel already open on hover.
    if (open) flyoutRef.current?.focus({ preventScroll: true });
    else setOpen(true);
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  // Only a hovering pointer drives hover. A tap emits the same
  // pointerenter/pointerleave pair as a mouse, so unqualified handlers opened
  // the flyout on entry, the trigger's own click then toggled it shut, and the
  // leave scheduled a close on top — a tap could never leave it open. Touch and
  // keyboard activation go through the popover's own toggle instead, which
  // already works.
  const handlePointerEnter = (event: PointerEvent<HTMLElement>) => {
    if (inRail && event.pointerType === "mouse") openNow("hover");
  };
  const handlePointerLeave = (event: PointerEvent<HTMLElement>) => {
    if (inRail && event.pointerType === "mouse" && openedByHover.current) {
      scheduleClose();
    }
  };

  // Drop a pending hover timer when the group leaves the rail or unmounts.
  useEffect(
    () => () => {
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
    },
    [inRail],
  );

  // The flyout is a dialog; its visible group title names it, as the group
  // label names the rail icon (w4/1012).
  const flyout = inRail && (
    <PopoverContent
      ref={flyoutRef}
      aria-labelledby={titleId}
      side="right"
      align="start"
      sideOffset={8}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onOpenAutoFocus={(event) => {
        if (openedByHover.current) event.preventDefault();
      }}
      onInteractOutside={(event) => {
        if (
          event.target instanceof Node &&
          !openerRef.current?.contains(event.target)
        ) {
          interactedOutside.current = true;
        }
      }}
      onCloseAutoFocus={(event) => {
        if (openedByHover.current || interactedOutside.current) {
          event.preventDefault();
          return;
        }
        restoreFocusOnDialogClose(event, openerRef.current);
      }}
      className="w-56 p-1"
    >
      <div
        id={titleId}
        className="px-2 py-1.5 text-xs font-medium text-sidebar-foreground/70"
      >
        {label}
      </div>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => (
          <SidebarMenuSubItem key={item.id}>
            <SidebarMenuSubButton asChild isActive={currentPath === item.path}>
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
  );

  const chevron = (
    <ChevronDown
      className={`transition-transform ${inlineOpen ? "rotate-180" : ""}`}
    />
  );
  return (
    <SidebarMenuItem
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <Popover
        open={inRail && open}
        onOpenChange={(next) => {
          if (inRail && next) openNow("activation");
          if (!next) setOpen(false);
        }}
      >
        {landingPath ? (
          <PopoverAnchor asChild>
            <SidebarMenuButton asChild isActive={isActive}>
              <Link
                ref={setOpener}
                to={landingPath}
                aria-label={inRail ? label : undefined}
                aria-haspopup={inRail ? "dialog" : undefined}
                aria-expanded={inRail ? open : undefined}
                {...EXACT_PAGE_LINK}
                onClick={() => {
                  onNavigate();
                  setOpen(false);
                }}
                onKeyDown={(event) => {
                  // Enter follows the link; an arrow opens the rest.
                  if (
                    inRail &&
                    (event.key === "ArrowRight" || event.key === "ArrowDown")
                  ) {
                    event.preventDefault();
                    openNow("activation");
                  }
                }}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            </SidebarMenuButton>
          </PopoverAnchor>
        ) : (
          <PopoverTrigger
            asChild
            {...(!inRail && {
              "aria-haspopup": undefined,
              "aria-expanded": inlineOpen,
              "aria-controls": submenuId,
              "data-state": undefined,
              onClick: onInlineToggle,
            })}
          >
            <SidebarMenuButton
              ref={setOpener}
              isActive={isActive}
              aria-label={inRail ? label : undefined}
              onClick={(event) => {
                if (inRail && open && openedByHover.current) {
                  event.preventDefault();
                  openNow("activation");
                }
              }}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {!inRail && (
                <>
                  {badge ? (
                    <span
                      className={
                        destructiveBadge
                          ? "ml-auto rounded-md bg-destructive px-1.5 text-xs font-medium text-white tabular-nums"
                          : "ml-auto text-xs font-medium tabular-nums"
                      }
                    >
                      {badge}
                    </span>
                  ) : (
                    <span className="ml-auto" />
                  )}
                  {chevron}
                </>
              )}
            </SidebarMenuButton>
          </PopoverTrigger>
        )}
        {flyout}
      </Popover>
      {!inRail && landingPath && (
        <SidebarMenuAction
          onClick={onInlineToggle}
          aria-label={label}
          aria-expanded={inlineOpen}
          aria-controls={submenuId}
        >
          {chevron}
        </SidebarMenuAction>
      )}
      {!inRail && inlineOpen && (
        <SidebarMenuSub id={submenuId}>{children}</SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}

import type { HTMLAttributes, KeyboardEvent, MouseEvent } from "react";
import { cn } from "@/common/lib/utils/utils";

const interactiveElementSelector = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "[contenteditable='true']",
  "[role='button']",
  "[role='link']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const focusClassName =
  "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

type ClickableRowRole = "button" | "link";

interface ClickableRowOptions {
  className?: string;
  role?: ClickableRowRole;
}

function isFromInteractiveChild(
  event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
): boolean {
  const target = event.target;

  if (!(target instanceof Element) || target === event.currentTarget) {
    return false;
  }

  const interactiveElement = target.closest(interactiveElementSelector);
  return (
    interactiveElement !== null && interactiveElement !== event.currentTarget
  );
}

export function getClickableRowProps<T extends HTMLElement>(
  onActivate: () => void,
  { className, role = "link" }: ClickableRowOptions = {},
): Pick<
  HTMLAttributes<T>,
  "className" | "onClick" | "onKeyDown" | "role" | "tabIndex"
> & {
  role: ClickableRowRole;
  tabIndex: 0;
} {
  return {
    className: cn(focusClassName, className),
    role,
    tabIndex: 0,
    onClick: (event) => {
      if (!isFromInteractiveChild(event)) {
        onActivate();
      }
    },
    onKeyDown: (event) => {
      if (
        !isFromInteractiveChild(event) &&
        (event.key === "Enter" || event.key === " ")
      ) {
        event.preventDefault();
        onActivate();
      }
    },
  };
}

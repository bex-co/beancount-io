import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";

/**
 * Hide/Show charts button. Exposes the collapsed state through
 * `aria-expanded`/`aria-controls` so assistive technology can tell that the
 * charts section is collapsed and which region the button controls.
 */
export function ChartsToggleButton({
  chartsVisible,
  onToggle,
  chartsSectionId,
}: {
  chartsVisible: boolean;
  onToggle: () => void;
  chartsSectionId: string;
}) {
  const { t } = useTranslations();
  return (
    <Button
      variant="outline"
      size="icon-sm"
      onClick={onToggle}
      aria-expanded={chartsVisible}
      aria-controls={chartsSectionId}
      aria-label={
        chartsVisible ? t("common.hideCharts") : t("common.showCharts")
      }
    >
      {chartsVisible ? <ChevronUp /> : <ChevronDown />}
    </Button>
  );
}

/**
 * Collapsible charts wrapper shared by every report page.
 *
 * The collapsed subtree stays mounted so charts keep their instances, but it is
 * `inert` the moment it collapses — otherwise a collapsed chart's tabs and
 * selects stay in the tab order. `hidden` lands only after the 300ms grid-row
 * animation finishes, so collapsing and expanding still animate.
 */
export function CollapsibleChartsSection({
  id,
  chartsVisible,
  children,
}: {
  id: string;
  chartsVisible: boolean;
  children: ReactNode;
}) {
  const [collapseSettled, setCollapseSettled] = useState(!chartsVisible);

  if (chartsVisible && collapseSettled) {
    // Reveal before the expand animation starts (render-phase state update).
    setCollapseSettled(false);
  }

  return (
    <div
      className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
        chartsVisible ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      }`}
      onTransitionEnd={() => {
        if (!chartsVisible) setCollapseSettled(true);
      }}
    >
      <div
        id={id}
        className="min-h-0 overflow-hidden"
        inert={!chartsVisible}
        hidden={!chartsVisible && collapseSettled}
      >
        {children}
      </div>
    </div>
  );
}

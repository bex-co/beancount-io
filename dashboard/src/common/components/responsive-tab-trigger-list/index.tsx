import { useRef } from "react";
import { useHydrated } from "@tanstack/react-router";
import { Label } from "@/common/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select.tsx";
import { TabsList, TabsTrigger } from "@/common/components/ui/tabs.tsx";
import { useTranslations } from "@/common/hooks/use-translations.ts";

type TabOptions = {
  label: string;
  value: string;
};

export type ResponsiveTabTriggerListProps = {
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
  tabOptions: TabOptions[];
  className?: string;
};

export const ResponsiveTabTriggerList = ({
  selectedTab,
  setSelectedTab,
  tabOptions,
  className,
}: ResponsiveTabTriggerListProps) => {
  const { t } = useTranslations();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  // Both forms switch views from client state; a choice before hydration
  // attaches their handlers is dropped, so they wait until they can respond
  // (w4/1105). The selected view still renders on the server.
  const hydrated = useHydrated();

  // Radix closes an open list when the window resizes and focuses this
  // trigger again, but past `lg` the trigger is hidden and focus fell to the
  // page. The selected desktop tab is the same control there (w4/1006).
  const returnFromList = (event: Event) => {
    const shown = (element: Element | null | undefined) =>
      !!element && element.getClientRects().length > 0;
    if (shown(triggerRef.current)) return;
    const tab = tabsRef.current?.querySelector<HTMLElement>(
      '[role="tab"][aria-selected="true"]',
    );
    if (!shown(tab)) return;
    event.preventDefault();
    tab!.focus();
  };

  return (
    <div className={className}>
      <Label htmlFor="view-selector" className="sr-only">
        {t("common.view")}
      </Label>
      <Select value={selectedTab} onValueChange={setSelectedTab}>
        <SelectTrigger
          ref={triggerRef}
          className="flex w-fit lg:hidden"
          size="sm"
          id="view-selector"
          disabled={!hydrated}
        >
          <SelectValue placeholder={t("common.selectAView")} />
        </SelectTrigger>
        <SelectContent onCloseAutoFocus={returnFromList}>
          {tabOptions.map((tab) => (
            <SelectItem key={tab.value} value={tab.value}>
              {tab.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <TabsList
        ref={tabsRef}
        className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 lg:flex"
      >
        {tabOptions.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} disabled={!hydrated}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  );
};

import { useState } from "react";
import { useTranslations } from "@/common/hooks/use-translations";
import { Sparkles } from "lucide-react";

const SUGGESTION_KEYS = [
  "aiAgent.suggestions.diningLastMonth",
  "aiAgent.suggestions.netWorth",
  "aiAgent.suggestions.topCategories",
  "aiAgent.suggestions.uncategorized",
  "aiAgent.suggestions.monthOverMonth",
  "aiAgent.suggestions.largestExpense",
] as const;

const CHIP_COUNT = 4;

function sampleSuggestionKeys(count: number): string[] {
  return [...SUGGESTION_KEYS].sort(() => Math.random() - 0.5).slice(0, count);
}

interface SuggestionChipsProps {
  onSelect: (question: string) => void;
}

export function SuggestionChips({ onSelect }: SuggestionChipsProps) {
  const { t } = useTranslations();
  // Sampled once per mount so the chips rotate on each visit but stay stable
  // while the empty state is on screen.
  const [keys] = useState(() => sampleSuggestionKeys(CHIP_COUNT));

  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
        <Sparkles className="h-3.5 w-3.5" />
        {t("aiAgent.suggestionsTitle")}
      </div>
      <div className="flex flex-wrap gap-2">
        {keys.map((key) => {
          const question = t(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(question)}
              className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
            >
              {question}
            </button>
          );
        })}
      </div>
    </div>
  );
}

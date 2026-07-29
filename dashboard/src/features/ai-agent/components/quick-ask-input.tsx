import { useState, KeyboardEvent } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Input } from "@/common/components/ui/input";
import { Button } from "@/common/components/ui/button";
import { MessageCircle, Sparkles } from "lucide-react";
import { useTranslations } from "@/common/hooks/use-translations";

export function QuickAskInput() {
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/",
  });
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");

  const handleSubmit = () => {
    if (!question.trim()) return;

    void navigate({
      to: "/ledger/$ledgerOwner/$ledgerName/ask",
      params: { ledgerOwner, ledgerName },
      search: { q: question.trim() },
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative flex items-center gap-1.5 rounded-lg border bg-background/85 p-1 shadow-sm backdrop-blur transition-colors focus-within:border-primary/40 focus-within:ring-3 focus-within:ring-primary/10 hover:bg-background">
      <div className="shrink-0">
        <div className="flex size-8 items-center justify-center rounded-md bg-gradient-to-br from-primary/15 to-chart-4/15">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
      </div>
      <Input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("aiAgent.quickAskPlaceholder")}
        className="h-8 flex-1 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      <Button
        onClick={handleSubmit}
        disabled={!question.trim()}
        size="sm"
        variant="secondary"
        className="hidden shrink-0 rounded-lg sm:flex"
      >
        <MessageCircle className="mr-1 h-4 w-4" />
        {t("aiAgent.ask")}
      </Button>
    </div>
  );
}

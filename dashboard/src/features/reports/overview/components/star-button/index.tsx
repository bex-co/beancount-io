import { Button } from "@/common/components/ui/button";
import { cn } from "@/common/lib/utils/utils";
import { Star } from "lucide-react";
import { useStarLedger } from "./use-star-ledger";
import { useUnstarLedger } from "./use-unstar-ledger";
import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useIsAuthenticated } from "@/common/hooks/use-is-authenticated";
import { useTranslations } from "@/common/hooks/use-translations";

interface StarButtonProps {
  ledgerId: string;
  isStarred?: boolean;
  className?: string;
  starLabel?: string;
  starredLabel?: string;
}

export function StarButton({
  ledgerId,
  isStarred: initialIsStarred,
  className,
  starLabel,
  starredLabel,
}: StarButtonProps) {
  const { t } = useTranslations();
  const navigate = useNavigate();
  const { starLedger, loading: starLoading } = useStarLedger(ledgerId);
  const { unstarLedger, loading: unstarLoading } = useUnstarLedger(ledgerId);
  const [localIsStarred, setLocalIsStarred] = useState(initialIsStarred);
  const isUserAuthenticated = useIsAuthenticated();

  // Sync local state with prop when it changes (e.g., after refetch)
  useEffect(() => {
    setLocalIsStarred(initialIsStarred);
  }, [initialIsStarred]);

  const loading = starLoading || unstarLoading;

  const handleClick = async () => {
    // If not logged in, redirect to login
    if (!isUserAuthenticated) {
      void navigate({ to: "/auth/login" });
      return;
    }

    // Optimistic update
    setLocalIsStarred(!localIsStarred);

    // Toggle star/unstar
    try {
      if (localIsStarred) {
        await unstarLedger();
      } else {
        await starLedger();
      }
    } catch {
      // Revert optimistic update on failure
      setLocalIsStarred(localIsStarred);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      loading={loading}
      className={className}
    >
      <Star
        className={cn(
          "size-4 transition-colors duration-200",
          localIsStarred && "fill-amber-400 stroke-amber-400",
        )}
      />
      {localIsStarred
        ? (starredLabel ?? t("page.overview.starButton.starred"))
        : (starLabel ?? t("page.overview.starButton.star"))}
    </Button>
  );
}

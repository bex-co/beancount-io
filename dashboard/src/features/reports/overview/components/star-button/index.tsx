import { Button } from "@/common/components/ui/button";
import { cn } from "@/common/lib/utils/utils";
import { Star } from "lucide-react";
import { useStarLedger } from "./use-star-ledger";
import { useUnstarLedger } from "./use-unstar-ledger";
import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useIsAuthenticated } from "@/common/hooks/use-is-authenticated";
import { useLoginNextPath } from "@/common/hooks/use-login-next-path";
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
  const next = useLoginNextPath();

  // Sync local state with prop when it changes (e.g., after refetch)
  useEffect(() => {
    setLocalIsStarred(initialIsStarred);
  }, [initialIsStarred]);

  const loading = starLoading || unstarLoading;

  const handleClick = async () => {
    // If not logged in, redirect to login and come back to this ledger after.
    if (!isUserAuthenticated) {
      void navigate({ to: "/auth/login", search: { next } });
      return;
    }

    const wasStarred = localIsStarred;

    // Optimistic update
    setLocalIsStarred(!wasStarred);

    // Toggle star/unstar. A fulfilled mutation can still report success:false
    // (e.g. the backend's Gitea write failed); that is a failure too, so roll
    // the optimistic state back and let the next click retry the same action.
    try {
      if (wasStarred) {
        const result = await unstarLedger();
        if (!result.data?.unstarLedger.success) setLocalIsStarred(wasStarred);
      } else {
        const result = await starLedger();
        if (!result.data?.starLedger.success) setLocalIsStarred(wasStarred);
      }
    } catch {
      // Revert optimistic update on transport failure
      setLocalIsStarred(wasStarred);
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

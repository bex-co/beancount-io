import { Button } from "@/common/components/ui/button";
import { UserPlus, UserCheck } from "lucide-react";
import { useFollowUser } from "../hooks/use-follow-user";
import { useUnfollowUser } from "../hooks/use-unfollow-user";
import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslations } from "@/common/hooks/use-translations";
import { useIsAuthenticated } from "@/common/hooks/use-is-authenticated";

interface FollowButtonProps {
  username: string;
  isFollowing?: boolean;
  className?: string;
}

export function FollowButton({
  username,
  isFollowing: initialIsFollowing,
  className,
}: FollowButtonProps) {
  const navigate = useNavigate();
  const { t } = useTranslations();
  const { followUser, loading: followLoading } = useFollowUser();
  const { unfollowUser, loading: unfollowLoading } = useUnfollowUser();
  const [localIsFollowing, setLocalIsFollowing] = useState(initialIsFollowing);
  const isUserAuthenticated = useIsAuthenticated();

  // Sync local state with prop when it changes (e.g., after refetch)
  useEffect(() => {
    setLocalIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  const loading = followLoading || unfollowLoading;

  const handleClick = async () => {
    // If not logged in, redirect to login
    if (!isUserAuthenticated) {
      void navigate({ to: "/auth/login" });
      return;
    }

    // Toggle follow/unfollow
    try {
      if (localIsFollowing) {
        const result = await unfollowUser({ variables: { username } });
        if (result.data?.unfollowUser.success) {
          setLocalIsFollowing(false);
        }
      } else {
        const result = await followUser({ variables: { username } });
        if (result.data?.followUser.success) {
          setLocalIsFollowing(true);
        }
      }
    } catch {
      // Mutation errors are handled by Apollo; prevent unhandled rejection
    }
  };

  return (
    <Button
      variant={localIsFollowing ? "outline" : "default"}
      size="default"
      onClick={handleClick}
      loading={loading}
      className={className}
    >
      {localIsFollowing ? (
        <UserCheck className="size-4 mr-2" />
      ) : (
        <UserPlus className="size-4 mr-2" />
      )}
      {localIsFollowing ? t("userProfile.unfollow") : t("userProfile.follow")}
    </Button>
  );
}

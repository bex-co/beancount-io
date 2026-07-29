import { Link } from "@tanstack/react-router";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/common/components/ui/avatar";
import { Card, CardHeader, CardContent } from "@/common/components/ui/card";

interface UserListItemProps {
  username: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
}

export function UserListItem({
  username,
  fullName,
  avatarUrl,
  bio,
}: UserListItemProps) {
  return (
    <Link to="/ledger/$username" params={{ username }}>
      <Card className="cursor-pointer hover:border-foreground/20 transition-colors">
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="size-12">
            <AvatarImage src={avatarUrl || undefined} alt={username} />
            <AvatarFallback>{username[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{fullName || username}</p>
            <p className="text-sm text-muted-foreground">@{username}</p>
          </div>
        </CardHeader>
        {bio && (
          <CardContent className="pt-0 pb-3 px-4">
            <p className="text-sm text-muted-foreground line-clamp-2">{bio}</p>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}

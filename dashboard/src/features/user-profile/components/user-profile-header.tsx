import { useNavigate, useParams } from "@tanstack/react-router";
import { Authenticated } from "@/common/components/authenticated";
import { UserNav } from "@/common/components/user-nav";
import { useTranslations } from "@/common/hooks/use-translations";

export function UserProfileHeader() {
  const navigate = useNavigate();
  const { t } = useTranslations();
  const { username } = useParams({ from: "/ledger/$username" });

  return (
    <header className="h-16 shrink-0 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-full items-center justify-between px-2">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/ledger" })}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
          >
            {/* Logo */}
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
              <img
                src="/lgasset/logo.png"
                alt={t("common.beancountLogo")}
                className="h-8 w-8 rounded"
              />
            </div>
            <span className="font-semibold truncate">{username}</span>
          </button>
        </div>

        {/* Right: User Navigation */}
        <Authenticated>
          <UserNav />
        </Authenticated>
      </div>
    </header>
  );
}

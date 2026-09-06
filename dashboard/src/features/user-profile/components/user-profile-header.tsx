import { Link } from "@tanstack/react-router";
import { Authenticated } from "@/common/components/authenticated";
import { UserNav } from "@/common/components/user-nav";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";

export function UserProfileHeader() {
  const { t } = useTranslations();

  return (
    <header className="h-18 shrink-0 border-b bg-background">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        <div className="flex min-w-0 items-center gap-5">
          <Link
            to="/ledger"
            aria-label={t("page.dashboard.goToDashboard")}
            className="flex items-center gap-2.5 rounded-md transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            {/* Logo — aria-label names the control by destination; alt describes the logo itself */}
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
              <img
                src="/lgasset/logo.png"
                alt={t("common.beancountLogo")}
                className="h-8 w-8 rounded"
              />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Beancount
            </span>
          </Link>
          <span className="hidden border-l pl-5 text-sm text-muted-foreground sm:block">
            {t("userProfile.community")}
          </span>
        </div>

        {/* Right: User Navigation */}
        <Authenticated
          fallback={
            <nav className="flex items-center gap-2 sm:gap-3">
              <Button variant="ghost" asChild className="h-10">
                <Link to="/auth/login">{t("auth.signIn")}</Link>
              </Button>
              <Button asChild className="h-10 hidden sm:inline-flex">
                <Link to="/auth/sign-up">{t("auth.signUp")}</Link>
              </Button>
            </nav>
          }
        >
          <UserNav />
        </Authenticated>
      </div>
    </header>
  );
}

import {
  WifiOff,
  RefreshCw,
  ArrowLeft,
  BookX,
  ServerCrash,
  AlertTriangle,
  LayoutDashboard,
  LogIn,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { Button } from "@/common/components/ui/button.tsx";
import { useTranslations } from "@/common/hooks/use-translations.ts";

type ErrorVariant =
  | "not-found"
  | "network"
  | "server"
  | "unauthenticated"
  | "unknown";

function classifyError(error?: Error | null): ErrorVariant {
  if (!error) return "unknown";

  // Apollo Client v4's `CombinedGraphQLErrors` (`.errors`) replaced the v3
  // `ApolloError` shape (`.graphQLErrors`/`.networkError`) this used to check.
  if (CombinedGraphQLErrors.is(error)) {
    for (const gqlError of error.errors) {
      const code = gqlError.extensions?.code;
      if (code === "NOT_FOUND") return "not-found";
      if (code === "FORBIDDEN") return "not-found";
      if (code === "INTERNAL_SERVER_ERROR") return "server";
      if (code === "UNAUTHENTICATED") return "unauthenticated";
    }
  }

  const msg = error.message.toLowerCase();
  if (
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("connection")
  )
    return "network";
  if (msg.includes("not found") || msg.includes("does not exist"))
    return "not-found";
  if (msg.includes("internal server error") || msg.includes("500"))
    return "server";

  return "unknown";
}

const VARIANT_CONFIG = {
  "not-found": {
    badge: "404",
    Icon: BookX,
    iconColor: "text-amber-500",
    badgeClass:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20",
    glowClass: "bg-amber-500/10",
    title: "Ledger Not Found",
    description:
      "The ledger you're looking for doesn't exist, has been deleted, or you don't have permission to access it.",
  },
  network: {
    badge: "Network Error",
    Icon: WifiOff,
    iconColor: "text-orange-500",
    badgeClass:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-orange-500/20",
    glowClass: "bg-orange-500/10",
    title: null, // filled from i18n
    description: null,
  },
  server: {
    badge: "500",
    Icon: ServerCrash,
    iconColor: "text-destructive",
    badgeClass: "bg-destructive/10 text-destructive ring-destructive/20",
    glowClass: "bg-destructive/10",
    title: "Internal Server Error",
    description:
      "Something went wrong on our end. This is not your fault. Please try again or return to the dashboard.",
  },
  unauthenticated: {
    badge: "Session Expired",
    Icon: LogIn,
    iconColor: "text-amber-500",
    badgeClass:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20",
    glowClass: "bg-amber-500/10",
    title: null, // filled from i18n
    description: null,
  },
  unknown: {
    badge: "Error",
    Icon: AlertTriangle,
    iconColor: "text-destructive",
    badgeClass: "bg-destructive/10 text-destructive ring-destructive/20",
    glowClass: "bg-destructive/10",
    title: null,
    description: null,
  },
} as const;

export function LedgerLayoutError({
  onBackToDashboard,
  onRetry,
  error,
}: {
  onBackToDashboard: () => void;
  onRetry: () => void;
  error?: Error | null;
}) {
  const { t } = useTranslations();
  const variant = classifyError(error);
  const config = VARIANT_CONFIG[variant];
  const { Icon } = config;

  const title =
    config.title ??
    (variant === "network"
      ? t("common.networkConnectionFailed")
      : variant === "unauthenticated"
        ? t("common.sessionExpiredTitle")
        : t("common.failedToLoadLedger"));

  const description =
    config.description ??
    (variant === "network"
      ? t("common.networkErrorDescription")
      : variant === "unauthenticated"
        ? t("common.sessionExpiredDescription")
        : t("common.unexpectedError"));

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Decorative radial glow */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 flex items-center justify-center`}
      >
        <div
          className={`h-[520px] w-[520px] rounded-full blur-3xl opacity-25 ${config.glowClass}`}
        />
      </div>

      {/* Slim top bar */}
      <header className="relative z-10 flex h-14 shrink-0 items-center border-b border-border/50 px-4">
        <button
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </button>
      </header>

      {/* Main content — vertically centered in remaining space */}
      <div className="relative z-10 flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md space-y-10 text-center">
          {/* Icon + badge */}
          <div className="space-y-4">
            <div className="flex justify-center">
              <div
                className={`rounded-2xl p-5 ring-1 ring-inset ${config.badgeClass}`}
              >
                <Icon
                  className={`h-12 w-12 ${config.iconColor}`}
                  strokeWidth={1.5}
                />
              </div>
            </div>

            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${config.badgeClass}`}
            >
              {config.badge}
            </span>
          </div>

          {/* Text */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {variant === "unauthenticated" ? (
              <Button
                size="lg"
                className="w-full sm:w-auto min-w-[160px]"
                asChild
              >
                <Link to="/auth/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  {t("auth.signIn")}
                </Link>
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  className="w-full sm:w-auto min-w-[160px]"
                  asChild
                >
                  <Link to="/ledger">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Go to Dashboard
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onRetry}
                  className="w-full sm:w-auto min-w-[160px]"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t("common.tryAgain")}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

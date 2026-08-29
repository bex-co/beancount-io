import { useEffect, useState } from "react";
import { LogOut, Loader2, CheckCircle } from "lucide-react";
import { useTranslations } from "@/common/hooks/use-translations";
import { PageSEO } from "@/common/components/seo/page-seo";
import { useMutation } from "@apollo/client/react";
import { LogoutDocument } from "@/graphql/definitions";
import { clearUserId } from "@/common/analytics";
import { redirectToLoginAfterLogout } from "./redirect-to-login";

/**
 * Logout page component
 * Automatically logs out the user with animation indicators
 */
export default function LogoutPage() {
  const { t } = useTranslations();
  const [logoutMutation] = useMutation(LogoutDocument);
  const [status, setStatus] = useState<"logging-out" | "success">(
    "logging-out",
  );

  useEffect(() => {
    const performLogout = async () => {
      // Show logging out status
      setStatus("logging-out");

      // Wait a bit for smooth animation
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Call backend logout mutation to clear httpOnly cookie and revoke token
      await logoutMutation().catch((err) => {
        // Non-blocking: even if this fails, continue with local cleanup
        console.warn("Backend logout request failed:", err);
      });

      // Clear analytics identity so post-logout events aren't attributed to
      // the previous user.
      clearUserId();

      // Show success status
      setStatus("success");

      // Wait a bit to show success state
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Replacing the document clears Apollo and React state without resetting
      // live authenticated queries after the backend has revoked the session.
      redirectToLoginAfterLogout();
    };

    void performLogout();
  }, [logoutMutation]);

  return (
    <>
      <PageSEO
        titleKey="seo.logout.title"
        descriptionKey="seo.logout.description"
        noIndex
      />
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <div className="space-y-8">
          {/* Animated icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full" />
              <div className="relative bg-primary rounded-full p-6">
                <LogOut className="h-12 w-12 text-primary-foreground" />
              </div>
            </div>
          </div>

          {/* Status message */}
          <div className="text-center space-y-3">
            {status === "logging-out" && (
              <>
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <h2 className="text-2xl font-semibold">
                    {t("auth.loggingOut")}
                  </h2>
                </div>
                <p className="text-muted-foreground">
                  {t("auth.loggingOutMessage")}
                </p>
              </>
            )}
            {status === "success" && (
              <>
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 animate-in zoom-in duration-200" />
                  <h2 className="text-2xl font-semibold text-green-500">
                    {t("common.success")}
                  </h2>
                </div>
                <p className="text-muted-foreground">
                  {t("auth.redirectingToLogin")}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

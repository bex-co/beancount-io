import { Card, CardContent } from "@/common/components/ui/card";
import { PageSEO } from "@/common/components/seo/page-seo";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

/**
 * Forgot password page component
 * Allows users to request a password reset link via email
 */
export default function ForgotPasswordPage() {
  return (
    <>
      <PageSEO
        titleKey="seo.forgotPassword.title"
        descriptionKey="seo.forgotPassword.description"
      />
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6">
              <ForgotPasswordForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

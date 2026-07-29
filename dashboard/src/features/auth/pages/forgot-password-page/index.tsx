import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { useMutation } from "@apollo/client/react";
import {
  SendForgotPasswordLinkDocument,
  type SendForgotPasswordLinkMutation,
  type SendForgotPasswordLinkMutationVariables,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { useMemo } from "react";
import { PageSEO } from "@/common/components/seo/page-seo";

const createForgotPasswordSchema = (t: (key: string) => string) =>
  z.object({
    email: z.email(t("auth.emailInvalid")),
  });

/**
 * Success state component
 * Shows animated checkmark and success message
 */
function SuccessState() {
  const { t } = useTranslations();

  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-8">
      <div className="relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-20 w-20 rounded-full bg-primary/10 animate-ping" />
        </div>
        <CheckCircle2 className="relative h-20 w-20 text-primary animate-in zoom-in duration-500" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">{t("auth.emailSent")}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {t("auth.emailSentDescription")}
        </p>
      </div>
    </div>
  );
}

/**
 * Forgot password page component
 * Allows users to request a password reset link via email
 */
export default function ForgotPasswordPage() {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [sendForgotPasswordLink] = useMutation<
    SendForgotPasswordLinkMutation,
    SendForgotPasswordLinkMutationVariables
  >(SendForgotPasswordLinkDocument);

  const forgotPasswordSchema = useMemo(
    () => createForgotPasswordSchema(t),
    [t],
  );
  type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

  // Initialize react-hook-form with zod validation
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onTouched", // Validate after first blur, then on change (errors only show after blur)
  });

  // Watch email value to enable button even if field hasn't been blurred
  const emailValue = watch("email");
  const isEmailValid = useMemo(() => {
    if (!emailValue) return false;
    try {
      forgotPasswordSchema.parse({ email: emailValue });
      return true;
    } catch {
      return false;
    }
  }, [emailValue, forgotPasswordSchema]);

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError("");
    setSuccess(false);

    try {
      const response = await sendForgotPasswordLink({
        variables: {
          email: data.email,
        },
      });

      if (response.data?.sendForgotPasswordLink.success) {
        setSuccess(true);
      } else {
        setError(t("auth.failedToSendResetEmail"));
      }
    } catch (err: unknown) {
      setError(formatError(err));
    }
  };

  // Show success state
  if (success) {
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
                <SuccessState />
                <div className="mt-6 text-center">
                  <Link
                    to="/auth/login"
                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    {t("auth.backToSignIn")}
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageSEO
        titleKey="seo.forgotPassword.title"
        descriptionKey="seo.forgotPassword.description"
      />
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">
                {t("auth.forgotYourPassword")}
              </CardTitle>
              <CardDescription className="text-center">
                {t("auth.enterEmailForReset")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-2">
                  <Label htmlFor="email">{t("auth.emailAddress")}</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder={t("auth.enterYourEmail")}
                    className="w-full"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting || !isEmailValid}
                  className="w-full"
                  size="lg"
                >
                  {isSubmitting ? t("auth.sending") : t("auth.sendResetLink")}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <Link
                  to="/auth/login"
                  className="font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {t("auth.backToSignIn")}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

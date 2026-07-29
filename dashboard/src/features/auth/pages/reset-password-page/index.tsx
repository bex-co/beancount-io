import { useState } from "react";
import { useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@apollo/client/react";
import { Button } from "@/common/components/ui/button";
import { Label } from "@/common/components/ui/label";
import { PasswordInput } from "@/features/auth/components/password-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Skeleton } from "@/common/components/ui/skeleton";
import {
  ValidateEmailTokenDocument,
  ResetPasswordDocument,
  type ValidateEmailTokenQuery,
  type ValidateEmailTokenQueryVariables,
  type ResetPasswordMutation,
  type ResetPasswordMutationVariables,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { PageSEO } from "@/common/components/seo/page-seo";

type ResetPasswordFormData = {
  newPassword: string;
  confirmPassword: string;
};

/**
 * Reset password page component
 * Validates email token and allows user to reset their password
 */
export default function ResetPasswordPage() {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/reset-password" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Create Zod schema with translated messages
  const resetPasswordSchema = z
    .object({
      newPassword: z
        .string()
        .min(1, t("auth.newPasswordRequired"))
        .min(6, t("auth.newPasswordMinLength"))
        .max(128, t("auth.newPasswordMaxLength")),
      confirmPassword: z.string().min(1, t("auth.confirmPasswordRequired")),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t("auth.passwordsDoNotMatch"),
      path: ["confirmPassword"],
    });

  // Get token from search params (optional)
  const token = (search as { token?: string })?.token;

  // Query to validate the email token
  const {
    data: validationData,
    loading: isValidating,
    error: validationError,
  } = useQuery<ValidateEmailTokenQuery, ValidateEmailTokenQueryVariables>(
    ValidateEmailTokenDocument,
    {
      variables: { token: token || "" },
      skip: !token,
    },
  );

  // Mutation to reset password
  const [resetPassword, { loading: isResetting }] = useMutation<
    ResetPasswordMutation,
    ResetPasswordMutationVariables
  >(ResetPasswordDocument);

  // Initialize react-hook-form with zod validation
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
  });

  // Watch password fields to enable/disable submit button
  const newPassword = watch("newPassword");
  const confirmPassword = watch("confirmPassword");
  const passwordsMatch =
    newPassword && confirmPassword && newPassword === confirmPassword;

  const onSubmit = async (data: ResetPasswordFormData) => {
    setError("");
    setSuccess(false);

    try {
      const response = await resetPassword({
        variables: {
          token: token!,
          newPassword: data.newPassword,
        },
      });

      if (response.data?.resetPassword.success) {
        setSuccess(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          void navigate({ to: "/auth/login" });
        }, 2000);
      } else {
        setError(t("auth.failedToResetPassword"));
      }
    } catch (err: unknown) {
      setError(formatError(err));
    }
  };

  // Show skeleton while validating token
  if (isValidating) {
    return (
      <>
        <PageSEO
          titleKey="seo.resetPassword.title"
          descriptionKey="seo.resetPassword.description"
        />
        <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            <Card>
              <CardHeader className="space-y-1">
                <Skeleton className="h-8 w-64 mx-auto" />
                <Skeleton className="h-4 w-80 mx-auto" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  // Show error if token is missing, validation failed, or token is invalid
  if (
    !token ||
    validationError ||
    !validationData?.validateEmailToken.isValid
  ) {
    return (
      <>
        <PageSEO
          titleKey="seo.resetPassword.title"
          descriptionKey="seo.resetPassword.description"
        />
        <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            <Card>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center">
                  {t("auth.tokenExpired")}
                </CardTitle>
                <CardDescription className="text-center">
                  {t("auth.tokenExpiredDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert variant="destructive">
                  <AlertDescription>
                    {t("auth.tokenExpiredMessage")}
                  </AlertDescription>
                </Alert>
                <div className="mt-4 text-center">
                  <Link
                    to="/auth/login"
                    className="text-sm font-medium text-muted-foreground hover:text-primary/80 transition-colors"
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

  // Show success message after password reset
  if (success) {
    return (
      <>
        <PageSEO
          titleKey="seo.resetPassword.title"
          descriptionKey="seo.resetPassword.description"
        />
        <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center space-y-4 py-8">
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-primary">
                      {t("auth.passwordResetSuccessful")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("auth.passwordResetSuccessMessage")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  // Show password reset form
  return (
    <>
      <PageSEO
        titleKey="seo.resetPassword.title"
        descriptionKey="seo.resetPassword.description"
      />
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">
                {t("auth.resetYourPassword")}
              </CardTitle>
              <CardDescription className="text-center">
                {t("auth.enterNewPasswordBelow")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t("auth.newPassword")}</Label>
                  <PasswordInput
                    id="newPassword"
                    autoComplete="new-password"
                    placeholder={t("auth.enterYourNewPassword")}
                    className="w-full"
                    maxLength={128}
                    {...register("newPassword")}
                  />
                  {errors.newPassword && (
                    <p className="text-sm text-destructive">
                      {errors.newPassword.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    {t("auth.confirmNewPassword")}
                  </Label>
                  <PasswordInput
                    id="confirmPassword"
                    autoComplete="new-password"
                    placeholder={t("auth.confirmYourNewPassword")}
                    className="w-full"
                    maxLength={128}
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {errors.confirmPassword.message}
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
                  disabled={isSubmitting || isResetting || !passwordsMatch}
                  className="w-full"
                  size="lg"
                >
                  {isSubmitting || isResetting
                    ? t("auth.resettingPassword")
                    : t("auth.resetPasswordButton")}
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

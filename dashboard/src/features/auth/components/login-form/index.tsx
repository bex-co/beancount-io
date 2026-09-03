import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "@tanstack/react-router";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { PasswordInput } from "@/features/auth/components/password-input";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { useTranslations } from "@/common/hooks/use-translations";

type LoginFormData = {
  email: string;
  password: string;
};

export type LoginFormProps = {
  onSubmit: (data: LoginFormData) => Promise<void>;
  isLoading: boolean;
  serverError: string;
  showForgotPasswordLink?: boolean;
  showSignUpLink?: boolean;
  onForgotPasswordClick?: () => void;
  onRegisterClick?: () => void;
};

export function LoginForm({
  onSubmit,
  isLoading,
  serverError,
  showForgotPasswordLink = true,
  showSignUpLink = true,
  onForgotPasswordClick,
  onRegisterClick,
}: LoginFormProps) {
  const { t } = useTranslations();

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .min(1, t("auth.emailRequired"))
          .email(t("auth.emailInvalid"))
          .transform((email) => email.toLowerCase().trim()),
        password: z
          .string()
          .min(1, t("auth.passwordRequired"))
          .min(6, t("auth.passwordMinLength"))
          .max(128, t("auth.passwordMaxLength")),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-2">
        <Label htmlFor="email" className="text-foreground">
          {t("auth.emailAddress")}
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder={t("auth.enterYourEmail")}
          className="w-full bg-muted"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t("auth.password")}</Label>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          placeholder={t("auth.enterYourPassword")}
          className="w-full bg-muted"
          maxLength={128}
          {...register("password")}
        />
        {showForgotPasswordLink && (
          <div className="flex justify-end -mt-1">
            {onForgotPasswordClick ? (
              <button
                type="button"
                onClick={onForgotPasswordClick}
                className="text-sm font-medium text-muted-foreground hover:text-primary/80 transition-colors"
              >
                {t("auth.forgotPassword")}
              </button>
            ) : (
              <Link
                to="/auth/forgot-password"
                className="text-sm font-medium text-muted-foreground hover:text-primary/80 transition-colors"
              >
                {t("auth.forgotPassword")}
              </Link>
            )}
          </div>
        )}
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={isSubmitting || isLoading}
        className="w-full"
        size="lg"
      >
        {isSubmitting || isLoading
          ? `${t("auth.signIn")}...`
          : t("auth.signIn")}
      </Button>

      {showSignUpLink && (
        <div className="text-sm text-muted-foreground">
          {t("auth.dontHaveAccount")}{" "}
          {onRegisterClick ? (
            <button
              type="button"
              onClick={onRegisterClick}
              className="text-primary hover:text-primary/80 transition-colors font-medium"
            >
              {t("auth.signUp")}
            </button>
          ) : (
            <Link
              to="/auth/sign-up"
              // Carry the current search along (each route's schema strips
              // what it doesn't declare) so a `?next=` destination — e.g. the
              // pricing page mid-checkout — survives the login ⇄ sign-up hop.
              search={(prev) => prev}
              className="text-primary hover:text-primary/80 transition-colors font-medium"
            >
              {t("auth.signUp")}
            </Link>
          )}
        </div>
      )}
    </form>
  );
}

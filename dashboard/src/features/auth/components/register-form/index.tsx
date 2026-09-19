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
import { ScriptRequiredNotice } from "@/features/auth/components/script-required-notice";
import { useHydrated } from "@/features/auth/lib/use-hydrated";
import type { RegisterFormData } from "@/features/auth/hooks/use-register-form";

export type RegisterFormProps = {
  onSubmit: (data: RegisterFormData) => Promise<void>;
  isLoading: boolean;
  serverError: string;
  defaultUsername?: string;
  /** Submit the generated username without showing the field. */
  hideUsername?: boolean;
  showSignInLink?: boolean;
  onSignInClick?: () => void;
};

export function RegisterForm({
  onSubmit,
  isLoading,
  serverError,
  defaultUsername = "",
  hideUsername = false,
  showSignInLink = true,
  onSignInClick,
}: RegisterFormProps) {
  const { t } = useTranslations();

  const registerSchema = useMemo(
    () =>
      z
        .object({
          firstName: z
            .string()
            .max(50, t("auth.firstNameMaxLength"))
            .transform((name) => name.trim())
            .optional(),
          lastName: z
            .string()
            .max(50, t("auth.lastNameMaxLength"))
            .transform((name) => name.trim())
            .optional(),
          email: z
            .string()
            .min(1, t("auth.emailRequired"))
            .email(t("auth.emailInvalid"))
            .transform((email) => email.toLowerCase().trim()),
          username: z
            .string()
            .min(1, t("auth.usernameRequired"))
            .max(20, t("auth.usernameMaxLength"))
            .regex(/^[a-z0-9_]+$/, t("auth.usernameLowercaseAlphanumeric")),
          password: z
            .string()
            .min(1, t("auth.passwordRequired"))
            .min(6, t("auth.passwordMinLength"))
            .max(128, t("auth.passwordMaxLength")),
          confirmPassword: z.string().min(1, t("auth.confirmPasswordRequired")),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t("auth.passwordsDoNotMatch"),
          path: ["confirmPassword"],
        }),
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    defaultValues: { username: defaultUsername },
  });

  const usernameField = register("username");

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = e.target.value.toLowerCase();
    void usernameField.onChange(e);
  };

  const usernameDescribedBy = [
    "username-hint",
    errors.username ? "username-error" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const hydrated = useHydrated();

  return (
    // Defence in depth: a native submission puts fields in a body, not
    // the URL. The disabled button below stops it happening at all.
    <form className="space-y-6" method="post" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-foreground">
            {t("auth.firstName")}
          </Label>
          <Input
            id="firstName"
            type="text"
            autoComplete="given-name"
            placeholder={t("auth.enterFirstName")}
            className="w-full bg-muted"
            {...register("firstName")}
            aria-invalid={errors.firstName ? true : undefined}
            aria-describedby={errors.firstName ? "firstName-error" : undefined}
          />
          {errors.firstName && (
            <p
              id="firstName-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {errors.firstName.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-foreground">
            {t("auth.lastName")}
          </Label>
          <Input
            id="lastName"
            type="text"
            autoComplete="family-name"
            placeholder={t("auth.enterLastName")}
            className="w-full bg-muted"
            {...register("lastName")}
            aria-invalid={errors.lastName ? true : undefined}
            aria-describedby={errors.lastName ? "lastName-error" : undefined}
          />
          {errors.lastName && (
            <p
              id="lastName-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>

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
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email && (
          <p id="email-error" role="alert" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      {hideUsername ? (
        <input type="hidden" {...usernameField} />
      ) : (
        <div className="space-y-2">
          <Label htmlFor="username" className="text-foreground">
            {t("auth.username")}
          </Label>
          <Input
            id="username"
            type="text"
            autoComplete="username"
            placeholder={t("auth.enterUsername")}
            className="w-full bg-muted"
            {...usernameField}
            onChange={handleUsernameChange}
            aria-invalid={errors.username ? true : undefined}
            aria-describedby={usernameDescribedBy || undefined}
          />
          <p id="username-hint" className="text-xs text-muted-foreground">
            {t("auth.usernamePublicHint")}
          </p>
          {errors.username && (
            <p
              id="username-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {errors.username.message}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="password" className="text-foreground">
          {t("auth.password")}
        </Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          placeholder={t("auth.enterYourPassword")}
          className="w-full bg-muted"
          maxLength={128}
          {...register("password")}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "password-error" : undefined}
        />
        {errors.password && (
          <p
            id="password-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-foreground">
          {t("auth.confirmPassword")}
        </Label>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          placeholder={t("auth.confirmYourPassword")}
          className="w-full bg-muted"
          maxLength={128}
          {...register("confirmPassword")}
          aria-invalid={errors.confirmPassword ? true : undefined}
          aria-describedby={
            errors.confirmPassword ? "confirmPassword-error" : undefined
          }
        />
        {errors.confirmPassword && (
          <p
            id="confirmPassword-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <ScriptRequiredNotice />
      <Button
        type="submit"
        disabled={!hydrated || isSubmitting || isLoading}
        className="w-full"
        size="lg"
        data-testid="register-submit"
      >
        {isSubmitting || isLoading
          ? t("auth.creatingAccount")
          : t("auth.createAccount")}
      </Button>

      <p className="text-xs text-muted-foreground text-left">
        {t("auth.termsAgreementPrefix")}{" "}
        <a
          href="https://beancount.io/terms-of-service"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80 transition-colors underline"
        >
          {t("auth.termsOfUse")}
        </a>{" "}
        {t("auth.and")}{" "}
        <a
          href="https://beancount.io/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80 transition-colors underline"
        >
          {t("auth.privacyPolicy")}
        </a>
        .
      </p>

      {showSignInLink && (
        <div className="text-center text-sm text-muted-foreground">
          {t("auth.alreadyHaveAccountQuestion")}{" "}
          {onSignInClick ? (
            <button
              type="button"
              onClick={onSignInClick}
              className="text-primary hover:text-primary/80 transition-colors font-medium"
            >
              {t("auth.signIn")}
            </button>
          ) : (
            <Link
              to="/auth/login"
              // Carry the current search along (each route's schema strips
              // what it doesn't declare) so a `?next=` destination — e.g. the
              // pricing page mid-checkout — survives the sign-up ⇄ login hop.
              search={(prev) => prev}
              className="text-primary hover:text-primary/80 transition-colors font-medium"
            >
              {t("auth.signIn")}
            </Link>
          )}
        </div>
      )}
    </form>
  );
}

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
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    defaultValues: { username: defaultUsername },
  });

  const usernameValue = watch("username");

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue("username", e.target.value.toLowerCase(), {
      shouldValidate: true,
    });
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
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
          />
          {errors.firstName && (
            <p className="text-sm text-destructive">
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
          />
          {errors.lastName && (
            <p className="text-sm text-destructive">
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
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      {!hideUsername && (
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
            value={usernameValue || ""}
            onChange={handleUsernameChange}
          />
          <p className="text-xs text-muted-foreground">
            {t("auth.usernamePublicHint")}
          </p>
        </div>
      )}
      {errors.username && (
        <p className="text-sm text-destructive">{errors.username.message}</p>
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
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
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
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">
            {errors.confirmPassword.message}
          </p>
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

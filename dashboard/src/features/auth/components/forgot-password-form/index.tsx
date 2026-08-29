import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { useMutation } from "@apollo/client/react";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import {
  SendForgotPasswordLinkDocument,
  type SendForgotPasswordLinkMutation,
  type SendForgotPasswordLinkMutationVariables,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";

type ForgotPasswordFormProps = {
  onBackToSignIn?: () => void;
};

const createForgotPasswordSchema = (t: (key: string) => string) =>
  z.object({
    email: z.email(t("auth.emailInvalid")),
  });

function BackToSignIn({ onClick }: { onClick?: () => void }) {
  const { t } = useTranslations();
  const className =
    "text-sm font-medium text-primary hover:text-primary/80 transition-colors";

  return (
    <div className="text-center">
      {onClick ? (
        <button type="button" onClick={onClick} className={className}>
          {t("auth.backToSignIn")}
        </button>
      ) : (
        <Link to="/auth/login" className={className}>
          {t("auth.backToSignIn")}
        </Link>
      )}
    </div>
  );
}

export function ForgotPasswordForm({
  onBackToSignIn,
}: ForgotPasswordFormProps) {
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

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onTouched",
  });

  const emailValue = watch("email");
  const isEmailValid = useMemo(() => {
    if (!emailValue) return false;
    return forgotPasswordSchema.safeParse({ email: emailValue }).success;
  }, [emailValue, forgotPasswordSchema]);

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError("");
    setSuccess(false);

    try {
      const response = await sendForgotPasswordLink({
        variables: { email: data.email },
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

  if (success) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 animate-ping" />
            </div>
            <CheckCircle2 className="relative h-20 w-20 text-primary animate-in zoom-in duration-500" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold">{t("auth.emailSent")}</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              {t("auth.emailSentDescription")}
            </p>
          </div>
        </div>
        <BackToSignIn onClick={onBackToSignIn} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">{t("auth.forgotYourPassword")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("auth.enterEmailForReset")}
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <Label htmlFor="forgot-password-email">
            {t("auth.emailAddress")}
          </Label>
          <Input
            id="forgot-password-email"
            type="email"
            autoComplete="email"
            placeholder={t("auth.enterYourEmail")}
            className="w-full"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
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

      <BackToSignIn onClick={onBackToSignIn} />
    </div>
  );
}

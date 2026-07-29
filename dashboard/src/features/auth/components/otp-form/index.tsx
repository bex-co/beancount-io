import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Label } from "@/common/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/common/components/ui/input-otp";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { useTranslations } from "@/common/hooks/use-translations";

type OtpFormData = {
  otp: string;
};

export type OtpFormProps = {
  email: string;
  onSubmit: (data: OtpFormData) => Promise<void>;
  isLoading: boolean;
  serverError: string;
  onBack?: () => void;
};

export function OtpForm({
  email,
  onSubmit,
  isLoading,
  serverError,
  onBack,
}: OtpFormProps) {
  const { t } = useTranslations();

  const otpSchema = z.object({
    otp: z
      .string()
      .min(1, t("auth.otpRequired"))
      .length(4, t("auth.otpInvalidLength")),
  });

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    mode: "onBlur",
  });

  const otpValue = watch("otp");

  const handleOtpChange = (value: string) => {
    setValue("otp", value, { shouldValidate: true });
  };

  const handleOtpComplete = (value: string) => {
    handleOtpChange(value);
    void handleSubmit(onSubmit)();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-center">
          {t("auth.verifyYourEmail")}
        </h2>
        <p className="text-sm text-muted-foreground text-center">
          {email
            ? `${t("auth.otpSentToYourEmail")} (${email})`
            : t("auth.otpSentToYourEmail")}
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <Label htmlFor="otp" className="text-center block">
            {t("auth.enterOtpCode")}
          </Label>
          <div className="flex justify-center">
            <InputOTP
              maxLength={4}
              value={otpValue || ""}
              onChange={handleOtpChange}
              onComplete={handleOtpComplete}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          {errors.otp && (
            <p className="text-sm text-destructive text-center">
              {errors.otp.message}
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
          disabled={
            isSubmitting || isLoading || !otpValue || otpValue.length !== 4
          }
          className="w-full"
          size="lg"
        >
          {isSubmitting || isLoading
            ? t("auth.verifying")
            : t("auth.verifyEmail")}
        </Button>
      </form>

      <div className="text-center text-sm space-y-2">
        <p className="text-muted-foreground">{t("auth.didNotReceiveOtp")}</p>
        {onBack && (
          <Button
            variant="link"
            onClick={onBack}
            className="font-medium text-primary hover:text-primary/80"
          >
            {t("auth.backToSignUp")}
          </Button>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { generateDefaultUsername } from "@/common/lib/utils/nanoid-base58";
import { track } from "@/common/analytics";
import type { RegisterFormData } from "./use-register-form";
import {
  continueDashboardOAuth,
  DashboardInteractionError,
  restartExpiredDashboardInteraction,
  submitDashboardInteraction,
} from "@/features/oauth/dashboard-interaction-client";

function useDashboardInteractionState() {
  const formatError = useErrorMessage();
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  return { formatError, serverError, setServerError, isLoading, setIsLoading };
}

export function useDashboardOAuthLogin(uid: string, next?: string) {
  const { t } = useTranslations();
  const state = useDashboardInteractionState();
  const onSubmit = async (data: { email: string; password: string }) => {
    state.setServerError("");
    state.setIsLoading(true);
    try {
      const response = await submitDashboardInteraction(
        uid,
        {
          action: "password",
          email: data.email,
          password: data.password,
        },
        { next },
      );
      track("login", { method: "password" });
      continueDashboardOAuth(response);
    } catch (error) {
      if (restartExpiredDashboardInteraction(error)) return;
      state.setServerError(
        error instanceof DashboardInteractionError && error.status === 400
          ? t("auth.loginFailed")
          : state.formatError(error),
      );
    } finally {
      state.setIsLoading(false);
    }
  };
  return {
    onSubmit,
    isLoading: state.isLoading,
    serverError: state.serverError,
  };
}

export function useDashboardOAuthRegister(options: {
  uid: string;
  next?: string;
  withDefaultLedger?: boolean;
  onSuccess: (sessionId: string, email: string) => void;
}) {
  const { t } = useTranslations();
  const state = useDashboardInteractionState();
  const [defaultUsername] = useState(() => generateDefaultUsername());
  const onSubmit = async (data: RegisterFormData) => {
    state.setServerError("");
    state.setIsLoading(true);
    try {
      const response = await submitDashboardInteraction(
        options.uid,
        {
          action: "signup",
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          username: data.username,
          email: data.email,
          password: data.password,
          withDefaultLedger: options.withDefaultLedger ?? false,
        },
        {
          next: options.next,
          screenHint: "signup",
        },
      );
      const body = (await response.json()) as {
        sessionId?: unknown;
        expireAt?: unknown;
      };
      if (typeof body.sessionId !== "string" || !body.sessionId) {
        throw new DashboardInteractionError(502);
      }
      options.onSuccess(body.sessionId, data.email);
    } catch (error) {
      if (restartExpiredDashboardInteraction(error)) return;
      state.setServerError(
        error instanceof DashboardInteractionError && error.status === 400
          ? t("auth.registrationFailed")
          : state.formatError(error),
      );
    } finally {
      state.setIsLoading(false);
    }
  };
  return {
    onSubmit,
    isLoading: state.isLoading,
    serverError: state.serverError,
    defaultUsername,
  };
}

export function useDashboardOAuthOtp(options: {
  uid: string;
  next?: string;
  sessionId: string;
}) {
  const { t } = useTranslations();
  const state = useDashboardInteractionState();
  const onSubmit = async (data: { otp: string }) => {
    state.setServerError("");
    if (!options.sessionId) {
      state.setServerError(t("auth.sessionExpired"));
      return;
    }
    state.setIsLoading(true);
    try {
      const response = await submitDashboardInteraction(
        options.uid,
        {
          action: "otp",
          sessionId: options.sessionId,
          otp: data.otp,
        },
        {
          next: options.next,
          screenHint: "signup",
        },
      );
      track("sign_up", { method: "password" });
      continueDashboardOAuth(response);
    } catch (error) {
      if (restartExpiredDashboardInteraction(error)) return;
      state.setServerError(
        error instanceof DashboardInteractionError && error.status === 400
          ? t("auth.otpVerificationError")
          : state.formatError(error),
      );
    } finally {
      state.setIsLoading(false);
    }
  };
  return {
    onSubmit,
    isLoading: state.isLoading,
    serverError: state.serverError,
  };
}

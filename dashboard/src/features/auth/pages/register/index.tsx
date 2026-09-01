import { useState } from "react";
import { useSearch } from "@tanstack/react-router";
import RegisterPage from "./register";
import SignUpOtpPage from "./register-otp";

type RegistrationStep = "register" | "otp";

type RegistrationData = {
  sessionId: string;
  email: string;
};

/**
 * Parent component that manages the registration flow
 * Handles state-based page switching between registration form and OTP verification
 */
export default function RegisterFlow() {
  const search = useSearch({ from: "/auth/sign-up" });
  const [step, setStep] = useState<RegistrationStep>("register");
  const [registrationData, setRegistrationData] =
    useState<RegistrationData | null>(null);

  // Handle successful registration form submission
  const handleRegisterSuccess = (sessionId: string, email: string) => {
    setRegistrationData({ sessionId, email });
    setStep("otp");
  };

  // Handle going back to registration form
  const handleBackToRegister = () => {
    setStep("register");
    setRegistrationData(null);
  };

  if (step === "otp" && registrationData) {
    return (
      <SignUpOtpPage
        interactionUid={search.interaction ?? ""}
        next={search.next}
        sessionId={registrationData.sessionId}
        email={registrationData.email}
        onBack={handleBackToRegister}
      />
    );
  }

  return (
    <RegisterPage
      interactionUid={search.interaction ?? ""}
      next={search.next}
      withDefaultLedger={search.withDefaultLedger ?? false}
      interactionExpired={search.reason === "interaction_expired"}
      onSuccess={handleRegisterSuccess}
    />
  );
}
